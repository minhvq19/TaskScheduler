#!/bin/bash
echo "🚀 Quick Admin Setup cho BIDV Calendar"

# Tạo admin user trong Docker PostgreSQL
echo "👤 Creating admin user..."
docker-compose exec postgres psql -U bidv_app -d bidv_calendar << 'EOF'

-- Xóa user cũ nếu có
DELETE FROM system_users WHERE username = 'admin';
DELETE FROM user_groups WHERE name = 'Quản trị viên';

-- Tạo user group
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (gen_random_uuid(), 'Quản trị viên', 'Quản trị hệ thống', '{}', NOW(), NOW());

-- Tạo admin user
INSERT INTO system_users (
    id, username, password, first_name, last_name, 
    user_group_id, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'admin',
    '$2b$10$hrJNAKixBz0AWTHsvwKdwugISoToogJ3JzseJ5lGSwCEweRo6TuaG',
    'System',
    'Administrator',
    (SELECT id FROM user_groups WHERE name = 'Quản trị viên' LIMIT 1),
    NOW(),
    NOW()
);

-- Kiểm tra kết quả
SELECT 'SUCCESS: Admin user created' as status;
SELECT username, first_name, last_name FROM system_users WHERE username = 'admin';

EOF

echo ""
echo "✅ Admin setup completed!"
echo "🔑 Username: admin"
echo "🔑 Password: AdminBiDV@2025"
echo "🌐 URL: http://10.21.118.100:12500"
echo ""
echo "🧪 Testing login..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminBiDV@2025"}' \
  http://10.21.118.100:12500/api/auth/login