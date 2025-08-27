# Hướng dẫn triển khai Docker Compose

## Yêu cầu hệ thống
- Ubuntu Server 24.03
- Docker Engine 20.10+
- Docker Compose v2.0+

## Bước 1: Cài đặt Docker

```bash
# Cập nhật hệ thống
sudo apt update

# Cài đặt Docker
sudo apt install -y docker.io docker-compose-v2

# Khởi động Docker
sudo systemctl start docker
sudo systemctl enable docker

# Thêm user vào group docker
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra phiên bản
docker --version
docker compose version
```

## Bước 2: Chuẩn bị mã nguồn

```bash
# Tạo thư mục project
mkdir -p /opt/bidv-calendar
cd /opt/bidv-calendar

# Copy toàn bộ mã nguồn từ Replit vào đây
# Bao gồm: compose.yml, Dockerfile, .dockerignore và toàn bộ source code
```

## Bước 3: Cấu hình

Chỉnh sửa file `compose.yml` nếu cần:
- Thay đổi mật khẩu database (POSTGRES_PASSWORD và PGPASSWORD)
- Thay đổi SESSION_SECRET
- Cập nhật REPLIT_DOMAINS với IP server của bạn

## Bước 4: Triển khai

```bash
# Build và chạy
docker compose up -d

# Kiểm tra trạng thái
docker compose ps

# Xem logs
docker compose logs -f

# Chỉ xem logs của app
docker compose logs -f app
```

## Bước 5: Khởi tạo database

```bash
# Chạy migration
docker compose exec app npm run db:push
```

## Bước 6: Kiểm tra

- Ứng dụng: http://xx.xx.xx.xx:12500
- Health check: http://xx.xx.xx.xx:12500/api/health

## Quản lý ứng dụng

```bash
# Dừng ứng dụng
docker compose down

# Dừng và xóa volumes
docker compose down -v

# Restart
docker compose restart

# Update ứng dụng
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Backup Database

```bash
# Backup
docker compose exec postgres pg_dump -U bidv_app bidv_calendar > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker compose exec -T postgres psql -U bidv_app bidv_calendar < backup_file.sql
```

## Logs và Monitoring

```bash
# Xem logs realtime
docker compose logs -f

# Kiểm tra resource usage
docker stats

# Vào container
docker compose exec app sh
docker compose exec postgres psql -U bidv_app bidv_calendar
```
