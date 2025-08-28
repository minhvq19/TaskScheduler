// Debug environment variables
console.log("🔍 Environment Variables Debug:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("OFFLINE_MODE:", process.env.OFFLINE_MODE);
console.log("REPLIT_DOMAINS:", process.env.REPLIT_DOMAINS);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "SET" : "NOT SET");

// Test offline mode detection
const hasReplitDomains = !!process.env.REPLIT_DOMAINS;
const isExplicitOffline = process.env.OFFLINE_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

console.log("\n🔧 Offline Mode Detection:");
console.log("hasReplitDomains:", hasReplitDomains);
console.log("isExplicitOffline:", isExplicitOffline);
console.log("isProduction:", isProduction);
console.log("isOfflineMode:", isExplicitOffline || (!hasReplitDomains && isProduction));

// Test database connection
const testDb = async () => {
  try {
    const { Client } = require('pg');
    const client = new Client(process.env.DATABASE_URL);
    await client.connect();
    console.log("✅ Database connection: SUCCESS");
    await client.end();
  } catch (error) {
    console.log("❌ Database connection: FAILED");
    console.log("Error:", error.message);
  }
};

testDb();