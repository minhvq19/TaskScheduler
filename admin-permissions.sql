-- Script SQL cấp phát quyền admin menu cho user admin
-- Chạy script này sau khi triển khai hệ thống lên Ubuntu Server

-- 1. Cập nhật permissions cho user group "Quản trị viên"
UPDATE user_groups 
SET permissions = '{
  "staff": "EDIT",
  "departments": "EDIT", 
  "categories": "EDIT",
  "rooms": "EDIT",
  "workSchedules": "EDIT",
  "meetingSchedules": "EDIT",
  "otherEvents": "EDIT",
  "holidays": "EDIT",
  "permissions": "EDIT",
  "systemConfig": "EDIT",
  "users": "EDIT"
}'::jsonb,
updated_at = NOW()
WHERE name = 'Quản trị viên';

-- 2. Nếu user group chưa tồn tại, tạo mới với đầy đủ permissions
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Quản trị viên',
  'Nhóm quyền quản trị hệ thống với đầy đủ quyền truy cập',
  '{
    "staff": "EDIT",
    "departments": "EDIT", 
    "categories": "EDIT",
    "rooms": "EDIT",
    "workSchedules": "EDIT",
    "meetingSchedules": "EDIT",
    "otherEvents": "EDIT",
    "holidays": "EDIT",
    "permissions": "EDIT",
    "systemConfig": "EDIT",
    "users": "EDIT"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Đảm bảo admin user được gán vào user group đúng
UPDATE system_users 
SET user_group_id = (SELECT id FROM user_groups WHERE name = 'Quản trị viên' LIMIT 1),
    updated_at = NOW()
WHERE username = 'admin';

-- 4. Tạo thêm user group "Thư ký cấp Chi nhánh" với quyền cao
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Thư ký cấp Chi nhánh',
  'Nhóm quyền quản lý và phê duyệt lịch họp, có quyền cao',
  '{
    "staff": "EDIT",
    "departments": "VIEW", 
    "categories": "EDIT",
    "rooms": "EDIT",
    "workSchedules": "EDIT",
    "meetingSchedules": "EDIT",
    "otherEvents": "EDIT",
    "holidays": "VIEW",
    "permissions": "VIEW",
    "systemConfig": "VIEW",
    "users": "VIEW"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- 5. Tạo user group "Thư ký cấp Phòng" với quyền hạn chế
INSERT INTO user_groups (id, name, description, permissions, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Thư ký cấp Phòng', 
  'Nhóm quyền đăng ký lịch họp, chờ phê duyệt',
  '{
    "staff": "VIEW",
    "departments": "VIEW", 
    "categories": "VIEW",
    "rooms": "VIEW",
    "workSchedules": "VIEW",
    "meetingSchedules": "VIEW",
    "otherEvents": "VIEW",
    "holidays": "VIEW",
    "permissions": "VIEW",
    "systemConfig": "VIEW",
    "users": "VIEW"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- 6. Kiểm tra kết quả
SELECT 
  ug.name as user_group_name,
  ug.description,
  ug.permissions,
  COUNT(su.id) as user_count
FROM user_groups ug
LEFT JOIN system_users su ON su.user_group_id = ug.id
GROUP BY ug.id, ug.name, ug.description, ug.permissions
ORDER BY ug.name;

-- 7. Hiển thị thông tin admin user và permissions
SELECT 
  su.username,
  su.first_name,
  su.last_name,
  ug.name as user_group,
  ug.permissions
FROM system_users su
JOIN user_groups ug ON su.user_group_id = ug.id
WHERE su.username = 'admin';

-- Hoàn thành! Admin user bây giờ sẽ thấy tất cả menu items.