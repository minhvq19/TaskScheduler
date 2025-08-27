# Hướng dẫn triển khai ứng dụng trong môi trường mạng nội bộ (Offline)

## Vấn đề đã giải quyết

Ứng dụng ban đầu sử dụng Replit Authentication (OpenID Connect) yêu cầu kết nối internet. Trong môi trường mạng nội bộ không có internet, điều này gây lỗi kết nối.

## Giải pháp

Đã tạo **Offline Authentication Mode** với các tính năng:
- ✅ Tự động phát hiện môi trường offline
- ✅ Sử dụng local authentication hoàn toàn
- ✅ Không cần internet cho authentication
- ✅ Tương thích với deployment production

## Cách triển khai

### 1. Thiết lập Environment Variables

Tạo file `.env` với các biến sau:

```bash
# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/calendar_db

# Session secret (bắt buộc)
SESSION_SECRET=your-very-secure-secret-key-here

# Production mode
NODE_ENV=production

# QUAN TRỌNG: Bật offline mode cho môi trường mạng nội bộ
OFFLINE_MODE=true
```

### 2. Triển khai bằng Docker

```bash
# Build image
docker build -t bidv-calendar .

# Chạy container
docker run -d \
  --name bidv-calendar-app \
  -p 12500:5000 \
  -e DATABASE_URL="postgresql://username:password@host:5432/calendar_db" \
  -e SESSION_SECRET="your-secret-key" \
  -e NODE_ENV="production" \
  -e OFFLINE_MODE="true" \
  bidv-calendar
```

### 3. Triển khai trực tiếp (không Docker)

```bash
# Cài đặt dependencies
npm install

# Build ứng dụng
npm run build

# Thiết lập environment
export DATABASE_URL="postgresql://username:password@localhost:5432/calendar_db"
export SESSION_SECRET="your-secret-key"
export NODE_ENV="production" 
export OFFLINE_MODE="true"

# Chạy ứng dụng
npm start
```

## Xác thực trong offline mode

### Đăng nhập
- URL: `http://10.21.118.100:12500/login`
- Sử dụng tài khoản local đã tạo trong hệ thống
- Không cần Replit authentication

### Tạo tài khoản admin đầu tiên
```sql
-- Kết nối PostgreSQL và chạy:
INSERT INTO system_users (username, password_hash, user_group_id)
VALUES ('admin', '$2b$10$...', 'admin-group-id');
```

## Kiểm tra hoạt động

1. **Khởi động thành công**: Console sẽ hiển thị "Starting in OFFLINE MODE"
2. **Truy cập ứng dụng**: `http://10.21.118.100:12500`
3. **Đăng nhập**: Sử dụng local credentials
4. **Không có lỗi kết nối**: Không còn lỗi liên quan Replit Auth

## Troubleshooting

### Nếu vẫn gặp lỗi Replit Auth:
```bash
# Kiểm tra environment variables
echo $OFFLINE_MODE
echo $NODE_ENV

# Đảm bảo OFFLINE_MODE=true
export OFFLINE_MODE=true
```

### Nếu không đăng nhập được:
- Kiểm tra PostgreSQL đang chạy
- Xem tài khoản local đã được tạo chưa
- Kiểm tra SESSION_SECRET đã set chưa

## Lợi ích của offline mode

✅ **Bảo mật cao**: Không phụ thuộc vào dịch vụ bên ngoài  
✅ **Ổn định**: Hoạt động 100% trong mạng nội bộ  
✅ **Hiệu suất**: Không có độ trễ do kết nối internet  
✅ **Kiểm soát**: Toàn quyền quản lý authentication  

---

**Lưu ý**: Mode này hoàn toàn thay thế Replit Auth khi `OFFLINE_MODE=true`