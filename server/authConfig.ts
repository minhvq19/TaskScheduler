import type { Express } from "express";

// Detect if we're in offline environment
export const isOfflineMode = () => {
  // Check if essential Replit environment variables are missing or if explicitly set to offline
  const hasReplitDomains = !!process.env.REPLIT_DOMAINS;
  const isExplicitOffline = process.env.OFFLINE_MODE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // If explicitly set to offline mode OR missing Replit domains in production
  return isExplicitOffline || (!hasReplitDomains && isProduction);
};

export async function setupAuthentication(app: Express) {
  if (isOfflineMode()) {
    console.log("🔧 Starting in OFFLINE MODE - Using local authentication only");
    const { setupOfflineAuth, isAuthenticated } = await import("./offlineAuth");
    await setupOfflineAuth(app);
    return { isAuthenticated };
  } else {
    console.log("🔧 Starting in ONLINE MODE - Using Replit authentication");
    const { setupAuth, isAuthenticated } = await import("./replitAuth");
    await setupAuth(app);
    return { isAuthenticated };
  }
}