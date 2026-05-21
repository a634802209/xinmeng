#!/bin/bash
set -e

# ========== 配置 ==========
SERVER_IP="129.204.225.231"
SERVER_USER="root"
APP_DIR="/opt/xinmeng-ai"
# ==========================

echo "=== XinMeng.ai PM2 部署 ==="
echo "目标服务器: ${SERVER_IP}"

cd "$(dirname "$0")"

# 1. 本地构建
echo ""
echo "[1/4] 本地构建..."
npm run build

# 2. 创建部署包
echo ""
echo "[2/4] 创建部署包..."
rm -rf .deploy-pm2
mkdir -p .deploy-pm2

cp -r dist .deploy-pm2/
cp -r api .deploy-pm2/
cp -r api/scripts .deploy-pm2/api/ 2>/dev/null || true
cp package.json .deploy-pm2/
cp package-lock.json .deploy-pm2/
cp ecosystem.config.js .deploy-pm2/

# 3. 上传到服务器
echo ""
echo "[3/4] 上传到服务器..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${APP_DIR}"
rsync -avz --delete .deploy-pm2/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/

# 4. 服务器端部署
echo ""
echo "[4/4] 服务器端安装依赖并启动..."
ssh ${SERVER_USER}@${SERVER_IP} << REMOTE
  cd ${APP_DIR}

  # 安装 Node.js 20（如未安装）
  if ! command -v node &> /dev/null || [ "\$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]; then
    echo "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  # 安装 PM2（如未安装）
  if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
  fi

  # 安装 tsx（运行 TypeScript 需要）
  if ! command -v tsx &> /dev/null; then
    echo "安装 tsx..."
    npm install -g tsx
  fi

  # 安装项目依赖
  echo "安装依赖..."
  npm install

  # 创建日志目录
  mkdir -p logs

  # 数据目录
  mkdir -p data

  # 使用 PM2 启动/重启
  echo "启动服务..."
  pm2 start ecosystem.config.js --env production || pm2 reload ecosystem.config.js --env production

  # 保存 PM2 配置（开机自启）
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null || true

  # 初始化管理员
  echo "检查管理员账号..."
  npx tsx api/scripts/init-admin.ts 2>/dev/null || echo "管理员已存在"

  # 显示状态
  echo ""
  pm2 status
REMOTE

# 5. 配置 Nginx
echo ""
echo "[5/5] 配置 Nginx..."
ssh ${SERVER_USER}@${SERVER_IP} << 'REMOTE'
  if command -v nginx &> /dev/null; then
    cat > /etc/nginx/conf.d/xinmeng-ai.conf << 'EOF'
server {
    listen 80;
    server_name 129.204.225.231;

    # 前端 & API 统一代理到 Node.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（如需）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3001;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    nginx -t && systemctl reload nginx
    echo "✅ Nginx 配置已更新"
  else
    echo "ℹ️ 未安装 Nginx，直接使用 3001 端口访问"
  fi
REMOTE

# 清理
rm -rf .deploy-pm2

echo ""
echo "=== 部署完成 ==="
echo ""
echo "🌐 访问地址:"
echo "   前台: http://${SERVER_IP}"
echo "   后台: http://${SERVER_IP}/admin"
echo ""
echo "📋 PM2 常用命令（在服务器执行）:"
echo "   pm2 status              # 查看运行状态"
echo "   pm2 logs xinmeng-ai-api # 查看实时日志"
echo "   pm2 restart xinmeng-ai-api  # 重启服务"
echo "   pm2 stop xinmeng-ai-api     # 停止服务"
echo "   pm2 monit               # 监控面板"
echo ""
echo "🔄 后续更新: 再次运行 ./deploy-pm2.sh 即可"
