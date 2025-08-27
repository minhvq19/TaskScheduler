import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

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
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-offline', // Fallback cho offline
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // False cho local dev
      maxAge: sessionTtl,
    },
  });
}

export async function setupOfflineAuth(app: Express) {
  console.log("🔧 Setting up OFFLINE authentication mode");
  
  app.set("trust proxy", 1);
  app.use(getSession());
  
  console.log("✅ Offline authentication setup completed");
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const sessionUser = (req.session as any)?.user;

  console.log("🔐 OFFLINE AUTH DEBUG:", {
    hasSessionUser: !!sessionUser,
    sessionUserId: sessionUser?.id,
    sessionUserUsername: sessionUser?.username,
  });

  // Check for local session authentication only
  if (sessionUser?.id && sessionUser?.username) {
    console.log("✅ OFFLINE AUTH: Local session authenticated");
    return next();
  }

  console.log("❌ OFFLINE AUTH: Not authenticated");
  res.status(401).json({ message: "Unauthorized" });
};