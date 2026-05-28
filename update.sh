#!/bin/bash
# XinMeng AI 更新脚本
# 从GitHub拉取最新代码并重新部署

DEPLOY_DIR="/opt/xinmeng-ai"

echo "========================================"
echo " XinMeng AI 更新脚本"
echo "========================================"

cd $DEPLOY_DIR

echo "[1/5] 拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo "[2/5] 安装依赖..."
npm ci --silent

echo "[3/5] 构建前端..."
npm run build

echo "[4/5] 重启Docker服务..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d

echo "[5/5] 清理旧镜像..."
docker image prune -f
docker system prune -f --volumes

echo ""
echo "========================================"
echo " 更新完成！"
echo "========================================"
echo "访问地址: http://$(curl -s ifconfig.me)"
echo "========================================"
