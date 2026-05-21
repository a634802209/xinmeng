#!/bin/bash
set -e

# ========== 配置 ==========
SERVER_IP="129.204.225.231"
SERVER_USER="root"
APP_DIR="/opt/xinmeng-ai"
# ==========================

echo "=== XinMeng.ai PM2 快速更新 ==="

cd "$(dirname "$0")"

# 1. 本地构建
echo "[1/3] 本地构建..."
npm run build

# 2. 只上传变更文件
echo "[2/3] 上传变更..."
rsync -avz --delete dist/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/dist/
rsync -avz --delete api/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/api/
rsync -avz package.json package-lock.json ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/

# 3. 服务器端热重启
echo "[3/3] 热重启..."
ssh ${SERVER_USER}@${SERVER_IP} << REMOTE
  cd ${APP_DIR}
  npm install
  pm2 reload xinmeng-ai-api
  sleep 2
  pm2 status
REMOTE

echo ""
echo "=== 更新完成 ==="
echo "访问: http://${SERVER_IP}"
