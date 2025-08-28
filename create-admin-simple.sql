-- Script tạo admin user đơn giản (chạy trong PostgreSQL)

-- Xóa user cũ nếu có
DELETE FROM system_users WHERE username = 'admin';

-- Tạo user group admin
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (gen_random_uuid(), 'Quản trị viên', 'Quản trị hệ thống', '{}', NOW(), NOW());

-- Tạo system user admin với password hash thực tế
-- Password: AdminBiDV@2025
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
    '$2b$10$hrJNAKixBz0AWTHsvwKdwugISoToogJ3JzseJ5lGSwCEweRo6TuaG',
    'System',
    'Administrator',
    (SELECT id FROM user_groups WHERE name = 'Quản trị viên' LIMIT 1),
    true,
    NOW(),
    NOW()
);

-- Kiểm tra kết quả
SELECT 'Admin user created successfully' as status;
SELECT username, first_name, last_name, is_active FROM system_users WHERE username = 'admin';