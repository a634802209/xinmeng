#!/bin/bash
set -e

# ========== 配置 ==========
SERVER_IP="129.204.225.231"
SERVER_USER="root"
APP_DIR="/opt/xinmeng-ai"
# ==========================

echo "=== XinMeng.ai 部署脚本 ==="
echo "目标服务器: ${SERVER_IP}"

# 1. 本地构建前端
echo ""
echo "[1/5] 本地构建前端..."
cd "$(dirname "$0")"
npm run build

# 2. 创建部署包
echo ""
echo "[2/5] 创建部署包..."
rm -rf .deploy-tmp
mkdir -p .deploy-tmp

cp -r dist .deploy-tmp/
cp -r api .deploy-tmp/
cp package.json .deploy-tmp/
cp package-lock.json .deploy-tmp/
cp Dockerfile .deploy-tmp/
cp docker-compose.yml .deploy-tmp/
cp -r api/scripts .deploy-tmp/api/ 2>/dev/null || true

# 3. 上传到服务器
echo ""
echo "[3/5] 上传到服务器..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${APP_DIR}"
rsync -avz --delete .deploy-tmp/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/

# 4. 服务器端部署
echo ""
echo "[4/5] 服务器端构建并启动..."
ssh ${SERVER_USER}@${SERVER_IP} << REMOTE
  cd ${APP_DIR}

  # 安装 Docker（如未安装）
  if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
  fi

  # 安装 Docker Compose（如未安装）
  if ! command -v docker-compose &> /dev/null; then
    echo "安装 Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
  fi

  # 数据目录持久化
  mkdir -p ${APP_DIR}/data

  # 构建并启动
  docker-compose down 2>/dev/null || true
  docker-compose up --build -d

  # 等待服务启动
  sleep 5

  # 健康检查
  if curl -sf http://localhost:3001/api/health > /dev/null; then
    echo "✅ 服务启动成功"
  else
    echo "⚠️ 服务可能未启动，查看日志: docker-compose logs"
  fi

  # 初始化管理员（如需要）
  echo "检查管理员账号..."
  docker exec xinmeng-ai npx tsx api/scripts/init-admin.ts 2>/dev/null || echo "管理员初始化完成或已存在"
REMOTE

# 5. 配置 Nginx（如服务器上已有 Nginx）
echo ""
echo "[5/5] 配置 Nginx..."
ssh ${SERVER_USER}@${SERVER_IP} << 'REMOTE'
  if command -v nginx &> /dev/null; then
    cat > /etc/nginx/conf.d/xinmeng-ai.conf << 'EOF'
server {
    listen 80;
    server_name 129.204.225.231;

    # 前端静态资源
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
    nginx -t && systemctl reload nginx
    echo "✅ Nginx 配置已更新"
  else
    echo "ℹ️ 服务器未安装 Nginx，直接使用 3001 端口访问"
  fi
REMOTE

# 清理
rm -rf .deploy-tmp

echo ""
echo "=== 部署完成 ==="
echo ""
echo "🌐 访问地址:"
echo "   前台: http://${SERVER_IP}"
echo "   后台: http://${SERVER_IP}/admin"
echo ""
echo "📋 常用命令（在服务器上执行）:"
echo "   cd ${APP_DIR}"
echo "   docker-compose logs -f        # 查看日志"
echo "   docker-compose restart          # 重启服务"
echo "   docker-compose down && docker-compose up -d  # 完全重启"
echo ""
echo "🔄 后续更新: 直接再次运行此脚本即可"
