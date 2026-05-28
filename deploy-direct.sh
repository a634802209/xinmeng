#!/bin/bash
# 直接部署脚本（不使用Docker）
# 在服务器上执行

set -e

echo "=== 直接部署模式（不使用Docker）==="

# 1. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2. 安装系统依赖
apt-get update
apt-get install -y python3 make g++ git

# 3. 创建项目目录
mkdir -p /opt/xinmeng-ai
cd /opt/xinmeng-ai

# 4. 拉取代码
if [ -d ".git" ]; then
    git pull
else
    git clone https://github.com/a634802209/xinmeng.git .
fi

# 5. 设置环境变量
export npm_config_build_from_source=true
export NODE_ENV=production

# 6. 安装依赖（强制从源码编译 better-sqlite3）
npm install better-sqlite3 --build-from-source
npm install

# 7. 构建前端
npm run build

# 8. 创建必要目录
mkdir -p data public/uploads logs

# 9. 创建环境变量文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=your-jwt-secret-change-this
ADMIN_JWT_SECRET=your-admin-jwt-secret-change-this
FRONTEND_URL=http://129.204.225.231:3001
DB_PATH=./data/app.db
EOF

# 10. 安装 PM2 进程管理器
npm install -g pm2

# 11. 使用 PM2 启动服务
pm2 delete xinmeng-ai 2>/dev/null || true
pm2 start "npx tsx api/server.ts" --name xinmeng-ai

# 12. 保存 PM2 配置，设置开机自启
pm2 save
pm2 startup systemd -u root --hp /root

echo "=== 部署完成 ==="
echo "访问地址: http://129.204.225.231:3001"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs xinmeng-ai"
echo "  重启服务: pm2 restart xinmeng-ai"
echo "  停止服务: pm2 stop xinmeng-ai"
