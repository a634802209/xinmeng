#!/bin/bash
set -e

echo "============================================"
echo "     新梦AI - 一键部署脚本"
echo "============================================"
echo ""

cd "$(dirname "$0")"

echo "1️⃣ 生成密码..."
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)

echo "2️⃣ 创建 .env 文件..."
cat > .env << EOF
NODE_ENV=production
PORT=3001
HOST_IP=129.204.225.231
JWT_SECRET=${JWT_SECRET}
ADMIN_JWT_SECRET=${ADMIN_SECRET}
DB_HOST=xinmeng-ai-mysql
DB_PORT=3306
DB_USER=xinmeng
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=xinmeng
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
REDIS_HOST=xinmeng-ai-redis
REDIS_PORT=6379
FRONTEND_URL=http://129.204.225.231
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=xinmeng.ai@foxmail.com
SMTP_PASS=mkzqkhfyhddhddca
SMTP_FROM=xinmeng.ai@foxmail.com
SITE_NAME=新梦AI
EOF

echo "3️⃣ 停止旧容器..."
docker compose down -v 2>/dev/null || true

echo "4️⃣ 启动服务..."
docker compose up -d --build

echo "5️⃣ 等待服务启动..."
for i in {1..30}; do
    echo -n "."
    sleep 2
done
echo ""

echo "============================================"
echo "✅ 部署完成！"
echo "============================================"
echo ""
docker compose ps
echo ""
echo "🌐 访问: http://129.204.225.231"
echo ""
