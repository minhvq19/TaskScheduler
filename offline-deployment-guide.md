# Hướng dẫn Triển khai Hệ thống Quản lý Lịch Công tác BIDV trên Ubuntu Server (Offline)

## 📋 Tổng quan

Hướng dẫn này giúp bạn triển khai hoàn chỉnh hệ thống quản lý lịch công tác BIDV trên Ubuntu Server 24.03 với PostgreSQL local, hoạt động hoàn toàn offline.

## 🔧 Yêu cầu hệ thống

### Phần cứng tối thiểu:
- **CPU**: 4 cores (Intel/AMD)
- **RAM**: 8GB 
- **Storage**: 50GB free space (SSD khuyến nghị)
- **Network**: 1Gbps LAN port

### Phần mềm:
- **OS**: Ubuntu Server 24.03 LTS
- **Docker**: 24.0+
- **Docker Compose**: 2.0+
- **Git**: 2.40+
- **Node.js**: 20.x (nếu build manually)

---

## 🚀 Phần 1: Chuẩn bị Ubuntu Server

### 1.1 Cập nhật hệ thống

```bash
# Cập nhật package list
sudo apt update && sudo apt upgrade -y

# Cài đặt các tools cần thiết
sudo apt install -y curl wget git unzip nano vim htop
```

### 1.2 Cài đặt Docker và Docker Compose

#### Option A: Cài đặt từ Official Repository (nếu có Internet)

```bash
# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Khởi động Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Thêm user vào docker group
sudo usermod -aG docker $USER
```

#### Option B: Cài đặt Offline (từ .deb packages)

```bash
# Download các .deb files từ máy có internet:
# - docker-ce_*_amd64.deb
# - docker-ce-cli_*_amd64.deb
# - containerd.io_*_amd64.deb
# - docker-compose-plugin_*_amd64.deb

# Copy files vào server và cài đặt:
sudo dpkg -i *.deb
sudo apt-get install -f  # Fix dependencies nếu cần
```

### 1.3 Cấu hình Network (nếu cần)

```bash
# Cấu hình static IP (edit /etc/netplan/01-netcfg.yaml)
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:  # Interface name có thể khác
      dhcp4: false
      addresses:
        - 10.21.118.100/24
      gateway4: 10.21.118.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
# Apply network config
sudo netplan apply
```

---

## 🔥 Phần 2: Triển khai Source Code

### 2.1 Lấy Source Code

#### Option A: Clone từ GitHub (nếu có Internet)

```bash
# Clone repository
git clone https://github.com/your-repo/bidv-calendar-system.git
cd bidv-calendar-system
```

#### Option B: Copy từ USB/Local (Offline)

```bash
# Copy source code từ USB hoặc network share
sudo mkdir -p /opt/bidv-calendar
sudo chown $USER:$USER /opt/bidv-calendar
cp -r /path/to/source/* /opt/bidv-calendar/
cd /opt/bidv-calendar
```

### 2.2 Cấu hình Environment Variables

```bash
# Tạo file .env
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://bidv_app:bidv_secure_password_2024@postgres:5432/bidv_calendar
POSTGRES_DB=bidv_calendar
POSTGRES_USER=bidv_app
POSTGRES_PASSWORD=bidv_secure_password_2024

# Application Configuration
NODE_ENV=production
PORT=12500
OFFLINE_MODE=true
SESSION_SECRET=bidv-calendar-secret-production-2025

# Security Settings
TRUSTED_ORIGINS=http://10.21.118.100:12500,https://10.21.118.100:12500
CORS_ORIGIN=http://10.21.118.100:12500

# Upload Configuration
MAX_UPLOAD_SIZE=10485760
UPLOAD_PATH=/app/uploads
EOF
```

### 2.3 Cấu hình Docker Compose

Đảm bảo `compose.yml` có cấu hình đúng:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: bidv_calendar
      POSTGRES_USER: bidv_app
      POSTGRES_PASSWORD: bidv_secure_password_2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bidv_app -d bidv_calendar"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://bidv_app:bidv_secure_password_2024@postgres:5432/bidv_calendar
      - NODE_ENV=production
      - PORT=12500
      - OFFLINE_MODE=true
      - SESSION_SECRET=bidv-calendar-secret-production-2025
    ports:
      - "12500:12500"
    volumes:
      - uploads_data:/app/uploads
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:12500/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  uploads_data:
```

---

## 🐳 Phần 3: Build và Deploy

### 3.1 Build và Khởi chạy

```bash
# Build Docker images
docker-compose build --no-cache

# Khởi chạy services
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f
```

### 3.2 Kiểm tra Health Check

```bash
# Kiểm tra container status
docker-compose ps

# Test database connection
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "SELECT version();"

# Test application health
curl http://10.21.118.100:12500/api/health
```

### 3.3 Chạy Database Schema Migration

```bash
# Vào container app để chạy migration
docker-compose exec app npm run db:push

# Hoặc chạy trực tiếp trong container
docker-compose exec postgres psql -U bidv_app -d bidv_calendar < admin-permissions.sql
```

---

## 👤 Phần 4: Tạo Admin User và Phân quyền

### 4.1 Tạo Admin User

```bash
# Copy script SQL vào container
docker cp create-admin-simple.sql bidv-calendar-postgres-1:/tmp/
docker cp admin-permissions.sql bidv-calendar-postgres-1:/tmp/

# Chạy script tạo admin user
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -f /tmp/create-admin-simple.sql

# Chạy script phân quyền
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -f /tmp/admin-permissions.sql
```

### 4.2 Thông tin đăng nhập Admin

```
URL: http://10.21.118.100:12500
Username: admin
Password: AdminBiDV@2025
```

### 4.3 Kiểm tra Permissions

```bash
# Kiểm tra user groups và permissions
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "
SELECT 
  ug.name, 
  ug.description, 
  ug.permissions 
FROM user_groups ug 
ORDER BY ug.name;
"

# Kiểm tra admin user
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "
SELECT 
  su.username,
  ug.name as user_group,
  ug.permissions
FROM system_users su
JOIN user_groups ug ON su.user_group_id = ug.id
WHERE su.username = 'admin';
"
```

---

## 🌐 Phần 5: Cấu hình Network và Proxy (nếu cần)

### 5.1 Cấu hình Nginx Reverse Proxy (tùy chọn)

```bash
# Cài đặt Nginx
sudo apt install -y nginx

# Tạo config file
sudo nano /etc/nginx/sites-available/bidv-calendar
```

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name 10.21.118.100;

    # SSL certificates (nếu có)
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:12500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:12500;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/bidv-calendar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 Cấu hình Firewall

```bash
# Cài đặt UFW
sudo apt install -y ufw

# Cấu hình rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 12500/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 5.3 Cấu hình Corporate Proxy (nếu có)

Nếu Ubuntu Server cần kết nối Internet qua proxy nội bộ:

```bash
# Cấu hình system-wide proxy
sudo nano /etc/environment
```

```bash
http_proxy="http://proxy.company.com:8080"
https_proxy="http://proxy.company.com:8080"
ftp_proxy="http://proxy.company.com:8080"
no_proxy="localhost,127.0.0.1,10.21.118.0/24,*.company.com"
```

```bash
# Cấu hình Docker proxy
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo nano /etc/systemd/system/docker.service.d/http-proxy.conf
```

```ini
[Service]
Environment="HTTP_PROXY=http://proxy.company.com:8080"
Environment="HTTPS_PROXY=http://proxy.company.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1,10.21.118.0/24"
```

```bash
# Restart Docker với proxy settings
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

## 🔧 Phần 6: Monitoring và Maintenance

### 6.1 System Monitoring Scripts

```bash
# Tạo script monitor
sudo nano /usr/local/bin/bidv-monitor.sh
```

```bash
#!/bin/bash
# BIDV Calendar System Monitor

echo "=== BIDV Calendar System Status ==="
echo "Date: $(date)"
echo ""

# Docker services status
echo "📦 Docker Services:"
docker-compose -f /opt/bidv-calendar/compose.yml ps

echo ""
echo "💾 System Resources:"
df -h /
free -h
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🌐 Network Status:"
ss -tlnp | grep :12500
curl -s -o /dev/null -w "%{http_code}" http://localhost:12500/api/health || echo "❌ API Health Check Failed"

echo ""
echo "📊 Database Status:"
docker-compose -f /opt/bidv-calendar/compose.yml exec -T postgres pg_isready -U bidv_app -d bidv_calendar

echo ""
echo "📝 Recent Logs (last 10 lines):"
docker-compose -f /opt/bidv-calendar/compose.yml logs --tail=10 app
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/bidv-monitor.sh

# Add to crontab for hourly monitoring
echo "0 * * * * /usr/local/bin/bidv-monitor.sh >> /var/log/bidv-monitor.log 2>&1" | sudo crontab -
```

### 6.2 Backup Script

```bash
# Tạo backup script
sudo nano /usr/local/bin/bidv-backup.sh
```

```bash
#!/bin/bash
# BIDV Calendar Backup Script

BACKUP_DIR="/opt/backups/bidv-calendar"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/bidv-calendar"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "🔄 Starting backup at $(date)"

# Backup database
echo "📊 Backing up database..."
docker-compose -f $APP_DIR/compose.yml exec -T postgres pg_dump -U bidv_app bidv_calendar > $BACKUP_DIR/database_$DATE.sql

# Backup uploaded files
echo "📁 Backing up uploads..."
docker run --rm -v bidv-calendar_uploads_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

# Backup configuration
echo "⚙️ Backing up configuration..."
cp $APP_DIR/.env $BACKUP_DIR/env_$DATE
cp $APP_DIR/compose.yml $BACKUP_DIR/compose_$DATE.yml

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed at $(date)"
```

```bash
# Make executable và schedule daily backup
sudo chmod +x /usr/local/bin/bidv-backup.sh
echo "0 2 * * * /usr/local/bin/bidv-backup.sh >> /var/log/bidv-backup.log 2>&1" | sudo crontab -
```

### 6.3 Log Rotation

```bash
# Cấu hình logrotate
sudo nano /etc/logrotate.d/bidv-calendar
```

```
/opt/bidv-calendar/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/bidv-calendar/compose.yml restart app
    endscript
}
```

---

## 🚨 Phần 7: Troubleshooting

### 7.1 Common Issues

#### Vấn đề: Container không start
```bash
# Kiểm tra logs
docker-compose logs app
docker-compose logs postgres

# Kiểm tra disk space
df -h

# Restart services
docker-compose down
docker-compose up -d
```

#### Vấn đề: Database connection failed
```bash
# Kiểm tra PostgreSQL
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d
# Chạy lại migration và setup admin
```

#### Vấn đề: Login không hoạt động
```bash
# Kiểm tra admin user
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -c "SELECT * FROM system_users WHERE username='admin';"

# Chạy lại admin setup
docker-compose exec postgres psql -U bidv_app -d bidv_calendar -f /tmp/admin-permissions.sql
```

### 7.2 Performance Tuning

#### PostgreSQL Optimization
```bash
# Edit PostgreSQL config trong container
docker-compose exec postgres nano /var/lib/postgresql/data/postgresql.conf
```

```
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connection settings
max_connections = 100

# Logging
log_min_duration_statement = 1000
```

#### Docker Resource Limits
```yaml
# Trong compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
  
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
```

---

## ✅ Phần 8: Verification Checklist

### 8.1 Pre-deployment Checklist
- [ ] Ubuntu Server 24.03 installed và updated
- [ ] Docker và Docker Compose installed
- [ ] Network configuration correct
- [ ] Firewall rules configured
- [ ] Source code downloaded/copied
- [ ] Environment variables configured

### 8.2 Post-deployment Checklist
- [ ] All containers running (`docker-compose ps`)
- [ ] Database accessible (`docker-compose exec postgres psql`)
- [ ] Web application accessible (http://10.21.118.100:12500)
- [ ] Admin login successful
- [ ] All menu items visible for admin
- [ ] File upload working
- [ ] Health check endpoint responding
- [ ] Backup script working
- [ ] Monitoring script working

### 8.3 User Acceptance Testing
- [ ] Admin login và navigation
- [ ] Staff management functions
- [ ] Department management
- [ ] Work schedule management
- [ ] Meeting room management
- [ ] Holiday management
- [ ] System configuration
- [ ] File upload cho events
- [ ] Public display modes (4K, standard, mobile)

---

## 📞 Support và Documentation

### Thông tin liên hệ
- **System Administrator**: [Your Contact Info]
- **Technical Support**: [Support Contact]
- **Documentation**: `/opt/bidv-calendar/docs/`

### Useful Commands
```bash
# View all logs
docker-compose logs -f

# Restart application
docker-compose restart app

# Database shell
docker-compose exec postgres psql -U bidv_app bidv_calendar

# Application shell
docker-compose exec app /bin/bash

# System monitoring
/usr/local/bin/bidv-monitor.sh

# Manual backup
/usr/local/bin/bidv-backup.sh
```

---

**🎉 Chúc mừng! Hệ thống Quản lý Lịch Công tác BIDV đã được triển khai thành công trên Ubuntu Server!**