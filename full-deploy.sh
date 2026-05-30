#!/bin/bash
set -e

echo "============================================"
echo "    🚀 新梦AI - 完整部署脚本"
echo "============================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

# 项目目录
PROJECT_DIR="$HOME/xinmeng-ai"
BACKUP_DIR="$HOME/xinmeng-ai-backup-$(date +%Y%m%d_%H%M%S)"

echo "📁 项目目录: $PROJECT_DIR"

# 1. 备份现有数据（如果有）
if [ -d "$PROJECT_DIR" ]; then
    echo "📦 备份现有项目到 $BACKUP_DIR ..."
    mv "$PROJECT_DIR" "$BACKUP_DIR"
    echo "✅ 备份完成"
fi

# 2. 克隆最新代码
echo "📥 克隆 GitHub 仓库..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"
git clone https://github.com/a634802209/xinmeng.git "$PROJECT_DIR"
cd "$PROJECT_DIR"
echo "✅ 代码克隆完成"

# 3. 生成密码
echo "🔐 生成安全密码..."
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)

# 4. 创建 .env 文件
echo "📝 创建 .env 配置文件..."
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

# 5. 停止旧容器
echo "🛑 停止所有容器..."
docker compose down 2>/dev/null || true

# 6. 构建并启动服务
echo "🐳 构建并启动服务..."
docker compose up -d --build

# 7. 等待 MySQL 启动
echo "⏳ 等待 MySQL 初始化（30秒）..."
sleep 30

# 8. 测试 MySQL 连接
echo "🔍 测试数据库连接..."
if docker compose exec -T xinmeng-ai-mysql mysql -u xinmeng -p${DB_PASSWORD} -e "SELECT 1" xinmeng &>/dev/null; then
    echo "✅ MySQL 连接成功!"
else
    echo "⚠️ MySQL 连接测试失败，请检查日志"
    docker compose logs --tail=30 xinmeng-ai-mysql
fi

# 9. 检查服务状态
echo ""
echo "📊 服务状态："
docker compose ps

echo ""
echo "============================================"
echo "🎉 部署完成！"
echo "============================================"
echo ""
echo "🌐 访问地址: http://129.204.225.231"
echo ""
echo "🔑 重要信息："
echo "   数据库密码已保存到: $PROJECT_DIR/.env"
echo "   备份目录: $BACKUP_DIR"
echo ""
echo "📋 常用命令："
echo "   查看日志: docker compose logs -f"
echo "   重启服务: docker compose restart"
echo "   停止服务: docker compose down"
echo ""
