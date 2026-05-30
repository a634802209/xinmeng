#!/bin/bash
set -e

echo "============================================"
echo "    🚀 新梦AI - 快速部署助手"
echo "============================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 插件未安装"
    exit 1
fi

cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

# 生成随机密码（确保密码不为空）
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)

echo "📝 配置环境变量..."
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

echo "✅ .env 文件已创建"
echo ""
echo "📋 当前数据库配置："
echo "   - DB_USER: xinmeng"
echo "   - DB_PASSWORD: ${DB_PASSWORD}"
echo "   - DB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}"
echo ""

echo "🔧 检查并拉取最新代码..."
if [ -d ".git" ]; then
    git pull origin main || echo "⚠️ 无法拉取代码，使用本地文件"
fi

echo ""
echo "🐳 停止旧容器..."
docker compose down -v 2>/dev/null || true

echo ""
echo "📦 构建并启动服务..."
docker compose up -d --build

echo ""
echo "⏳ 等待服务启动（约30-60秒）..."
sleep 15

echo ""
echo "📊 检查容器状态："
docker compose ps

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 访问地址: http://129.204.225.231"
echo ""
echo "📋 常用命令："
echo "  查看日志: docker compose logs -f"
echo "  查看后端日志: docker compose logs -f xinmeng-ai-backend"
echo "  查看MySQL日志: docker compose logs -f xinmeng-ai-mysql"
echo "  重启服务: docker compose restart"
echo "  停止服务: docker compose down"
echo ""
echo "🔑 数据库密码已保存到 .env 文件"
echo ""

# 提示测试连接
echo "🔍 测试数据库连接..."
sleep 5
if docker compose exec -T xinmeng-ai-mysql mysql -u xinmeng -p${DB_PASSWORD} -e "SELECT 1" xinmeng &>/dev/null; then
    echo "✅ MySQL 连接成功!"
else
    echo "❌ MySQL 连接失败，请检查日志"
    docker compose logs --tail=20 xinmeng-ai-mysql
fi
