import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const sessionUser = (req.session as any)?.user;

  console.log("🔐 AUTH DEBUG:", {
    hasSessionUser: !!sessionUser,
    sessionUserId: sessionUser?.id,
    sessionUserUsername: sessionUser?.username,
    hasReqUser: !!user,
    isAuthenticated: req.isAuthenticated(),
    userKeys: user ? Object.keys(user) : null,
    sessionKeys: sessionUser ? Object.keys(sessionUser) : null
  });

  // Check for local session authentication first
  if (sessionUser?.id && sessionUser?.username) {
    console.log("✅ AUTH: Local session authenticated");
    return next();
  }

  // Check for Replit OAuth authentication
  if (!req.isAuthenticated()) {
    console.log("❌ AUTH: Not authenticated via Passport");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check for Replit OAuth user
  if (user?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      console.log("✅ AUTH: Replit OAuth authenticated");
      return next();
    }

    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      console.log("❌ AUTH: No refresh token");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      console.log("✅ AUTH: Refreshed token");
      return next();
    } catch (error) {
      console.log("❌ AUTH: Token refresh failed");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }

  // Check for local system user (has id, username, userGroup)
  if (user?.id && user?.username && user?.userGroup) {
    console.log("✅ AUTH: Local user authenticated");
    return next();
  }

  console.log("❌ AUTH: All checks failed");
  res.status(401).json({ message: "Unauthorized" });
};
