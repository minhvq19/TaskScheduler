// Test database connection với pg standard
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bidv_app:bidv_secure_password_2024@localhost:5432/bidv_calendar',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testConnection() {
  console.log('🔍 Testing PostgreSQL connection...');
  
  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query test successful:');
    console.log('  Time:', result.rows[0].current_time);
    console.log('  Version:', result.rows[0].version);
    
    // Check tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('system_users', 'user_groups')
      ORDER BY table_name
    `);
    
    console.log('✅ Tables found:', tables.rows.map(r => r.table_name));
    
    // Check admin user
    const adminCheck = await client.query(
      'SELECT username, first_name, last_name FROM system_users WHERE username = $1',
      ['admin']
    );
    
    if (adminCheck.rows.length > 0) {
      console.log('✅ Admin user found:', adminCheck.rows[0]);
    } else {
      console.log('❌ Admin user not found - need to create');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 Check: DATABASE_URL, PostgreSQL server, credentials');
  } finally {
    await pool.end();
  }
}

testConnection();