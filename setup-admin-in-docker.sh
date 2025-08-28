#!/bin/bash
# Script tạo admin user trong Docker container

echo "🔐 Tạo admin user trong Docker container..."

# 1. Tạo password hash bằng Node.js trong container
echo "🔑 Generating password hash..."
PASSWORD_HASH=$(docker-compose exec app node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('AdminBiDV@2025', 10).then(hash => console.log(hash));
")

echo "Generated hash: $PASSWORD_HASH"

# 2. Tạo admin user trong database
echo "👤 Creating admin user in database..."
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "
-- Tạo user group
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (gen_random_uuid(), 'Quản trị viên', 'Quản trị hệ thống', '{}', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Tạo admin user
INSERT INTO system_users (
    id, username, password, first_name, last_name, 
    user_group_id, is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'admin', '$PASSWORD_HASH', 'System', 'Administrator',
    (SELECT id FROM user_groups WHERE name = 'Quản trị viên'),
    true, NOW(), NOW()
) ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    updated_at = NOW();
"

# 3. Kiểm tra kết quả
echo "✅ Checking admin user..."
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "
SELECT u.username, u.first_name, u.last_name, g.name as group_name, u.is_active
FROM system_users u
JOIN user_groups g ON u.user_group_id = g.id
WHERE u.username = 'admin';
"

echo ""
echo "🎉 Admin user setup completed!"
echo "👤 Username: admin"  
echo "🔑 Password: AdminBiDV@2025"
echo "🌐 Access: http://10.21.118.100:12500"