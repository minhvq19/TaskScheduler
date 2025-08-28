// Script kiểm tra user trong database
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Cấu hình database (thay đổi theo môi trường của bạn)
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'bidv_app',
  password: 'bidv_secure_password_2024',
  database: 'bidv_calendar'
};

async function checkUserInDatabase() {
  const client = new Client(DB_CONFIG);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    // 1. Kiểm tra có user admin không
    console.log('\n🔍 Checking for admin user...');
    const userResult = await client.query(
      'SELECT id, username, password, first_name, last_name, user_group_id, is_active FROM system_users WHERE username = $1',
      ['admin']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No admin user found in database!');
      console.log('💡 Run create-admin-user.js to create one');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Admin user found:');
    console.log('   - ID:', user.id);
    console.log('   - Username:', user.username);
    console.log('   - Name:', user.first_name, user.last_name);
    console.log('   - Group ID:', user.user_group_id);
    console.log('   - Active:', user.is_active);
    console.log('   - Password hash:', user.password.substring(0, 20) + '...');

    // 2. Test password verification
    console.log('\n🔐 Testing password verification...');
    const testPassword = 'AdminBiDV@2025';
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`Password "${testPassword}" is valid:`, isValid ? '✅ YES' : '❌ NO');

    // 3. Kiểm tra user group
    console.log('\n👥 Checking user group...');
    const groupResult = await client.query(
      'SELECT id, name, description FROM user_groups WHERE id = $1',
      [user.user_group_id]
    );

    if (groupResult.rows.length === 0) {
      console.log('❌ User group not found!');
    } else {
      const group = groupResult.rows[0];
      console.log('✅ User group found:');
      console.log('   - Name:', group.name);
      console.log('   - Description:', group.description);
    }

    // 4. Kiểm tra sessions table
    console.log('\n🗃️  Checking sessions table...');
    const sessionCount = await client.query('SELECT COUNT(*) FROM sessions');
    console.log('Sessions in database:', sessionCount.rows[0].count);

  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('💡 Make sure PostgreSQL is running and credentials are correct');
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

checkUserInDatabase();