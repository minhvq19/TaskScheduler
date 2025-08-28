#!/bin/bash
# Script deploy trên Ubuntu Server 10.21.118.100

echo "🚀 BIDV Calendar System - Ubuntu Deployment"
echo "============================================"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Clean up old images (optional)
echo "🧹 Cleaning up..."
docker system prune -f

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check PostgreSQL status
echo "🗄️  Checking PostgreSQL..."
docker-compose exec postgres pg_isready -U bidv_app -d bidv_calendar

# Check app status
echo "🏥 Checking app health..."
curl -f http://localhost:12500/api/health || echo "❌ App not ready yet"

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20 app

echo ""
echo "✅ Deployment completed!"
echo "🌐 Access: http://10.21.118.100:12500"
echo "👤 Admin: admin / AdminBiDV@2025"
echo ""
echo "📊 To monitor: docker-compose logs -f app"
echo "🔄 To restart: docker-compose restart app"