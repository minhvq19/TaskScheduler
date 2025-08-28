// Script tạo tài khoản admin đầu tiên cho môi trường offline
const bcrypt = require("bcrypt");
const { Client } = require("pg");

// Cấu hình kết nối database (thay đổi theo môi trường của bạn)
const DB_CONFIG = {
  host: "10.21.118.100", // hoặc IP của PostgreSQL server
  port: 5432,
  user: "bidv_app", // username PostgreSQL
  password: "bidv_secure_password_2024", // password PostgreSQL
  database: "bidv_calendar",
};

// Thông tin tài khoản admin
const ADMIN_ACCOUNT = {
  username: "admin",
  password: "AdminBiDV@2025", // Password sẽ được mã hóa
  firstName: "System",
  lastName: "Administrator",
};

async function createAdminUser() {
  const client = new Client(DB_CONFIG);

  try {
    console.log("🔌 Kết nối database...");
    await client.connect();
    console.log("✅ Kết nối thành công!");

    // 1. Kiểm tra user đã tồn tại chưa
    console.log("🔍 Kiểm tra user admin đã tồn tại...");
    const existingUser = await client.query(
      "SELECT username FROM system_users WHERE username = $1",
      [ADMIN_ACCOUNT.username],
    );

    if (existingUser.rows.length > 0) {
      console.log("⚠️  User admin đã tồn tại, bỏ qua tạo mới");
      return;
    }

    // 2. Tạo hoặc lấy user group admin
    console.log("🔧 Tạo/kiểm tra user group admin...");
    let adminGroupResult = await client.query(
      "SELECT id FROM user_groups WHERE name = $1",
      ["Quản trị viên"],
    );

    let adminGroupId;
    if (adminGroupResult.rows.length === 0) {
      // Tạo user group admin
      const createGroupResult = await client.query(`
        INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Quản trị viên', 'Quản trị hệ thống', '{}', NOW(), NOW())
        RETURNING id
      `);
      adminGroupId = createGroupResult.rows[0].id;
      console.log("✅ Đã tạo user group admin");
    } else {
      adminGroupId = adminGroupResult.rows[0].id;
      console.log("✅ User group admin đã tồn tại");
    }

    // 3. Mã hóa password bằng bcrypt (giống hệ thống)
    console.log("🔐 Mã hóa password...");
    const hashedPassword = await bcrypt.hash(ADMIN_ACCOUNT.password, 10);
    console.log("✅ Password đã được mã hóa");

    // 4. Tạo system user
    console.log("👤 Tạo system user admin...");
    const createUserResult = await client.query(
      `
      INSERT INTO system_users (
        id, username, password, first_name, last_name, 
        user_group_id, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW()
      ) RETURNING id, username
    `,
      [
        ADMIN_ACCOUNT.username,
        hashedPassword,
        ADMIN_ACCOUNT.firstName,
        ADMIN_ACCOUNT.lastName,
        adminGroupId,
      ],
    );

    const newUser = createUserResult.rows[0];
    console.log("✅ Đã tạo system user thành công!");
    console.log("📋 Thông tin tài khoản:");
    console.log(`   - User ID: ${newUser.id}`);
    console.log(`   - Username: ${newUser.username}`);
    console.log(`   - Password: ${ADMIN_ACCOUNT.password}`);
    console.log(`   - Hashed: ${hashedPassword.substring(0, 20)}...`);

    console.log("");
    console.log("🎉 Hoàn tất! Bạn có thể đăng nhập với:");
    console.log(`   Username: ${ADMIN_ACCOUNT.username}`);
    console.log(`   Password: ${ADMIN_ACCOUNT.password}`);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔌 Đã đóng kết nối database");
  }
}

// Chạy script
createAdminUser();
