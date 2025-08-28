-- Script tạo admin user trực tiếp trong PostgreSQL
-- Chạy trong Docker container PostgreSQL

-- 1. Tạo user group admin nếu chưa có
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (gen_random_uuid(), 'Quản trị viên', 'Quản trị hệ thống', '{}', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Tạo system user admin với password đã hash
-- Password: AdminBiDV@2025 -> Hash bcrypt
INSERT INTO system_users (
    id, 
    username, 
    password, 
    first_name, 
    last_name, 
    user_group_id, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin',
    '$2b$10$YourHashedPasswordHere', -- Sẽ được replace
    'System',
    'Administrator',
    (SELECT id FROM user_groups WHERE name = 'Quản trị viên'),
    true,
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 3. Kiểm tra kết quả
SELECT u.username, u.first_name, u.last_name, g.name as group_name
FROM system_users u
JOIN user_groups g ON u.user_group_id = g.id
WHERE u.username = 'admin';