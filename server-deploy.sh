#!/bin/bash
set -e

# XinMeng AI - 腾讯云服务器部署脚本
# 从GitHub仓库拉取代码并部署
# 用法: curl -fsSL https://raw.githubusercontent.com/a634802209/xinmeng/main/server-deploy.sh | bash

REPO_URL="https://github.com/a634802209/xinmeng.git"
DEPLOY_DIR="/opt/xinmeng-ai"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"  # 可选，用于私有仓库

echo "========================================"
echo " XinMeng AI 腾讯云部署脚本"
echo "========================================"

# 1. 检查root权限
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行此脚本"
    exit 1
fi

# 2. 安装基础依赖
echo "[1/8] 安装基础依赖..."
apt-get update -qq
apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx ufw

# 3. 安装Docker
echo "[2/8] 安装Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
fi

# 安装Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 4. 配置防火墙
echo "[3/8] 配置防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. 创建部署目录
echo "[4/8] 创建部署目录..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# 6. 从GitHub拉取代码
echo "[5/8] 从GitHub拉取代码..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/main
else
    if [ -n "$GITHUB_TOKEN" ]; then
        git clone "https://a634802209:${GITHUB_TOKEN}@github.com/a634802209/xinmeng.git" .
    else
        git clone $REPO_URL .
    fi
fi

# 7. 配置环境变量
echo "[6/8] 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
    echo "ADMIN_JWT_SECRET=$(openssl rand -base64 32)" >> .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=3001" >> .env
    echo "FRONTEND_URL=http://$(curl -s ifconfig.me)" >> .env
    echo "DB_PATH=/app/data/app.db" >> .env
fi

# 8. 创建必要目录
mkdir -p data public/uploads logs ssl

# 9. 配置Nginx
echo "[7/8] 配置Nginx..."
cat > /etc/nginx/sites-available/xinmeng-ai << 'EOF'
upstream app_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 20M;

    location / {
        root /opt/xinmeng-ai/dist;
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /opt/xinmeng-ai/dist;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /opt/xinmeng-ai/public/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location /api/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/xinmeng-ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 10. 构建并启动服务
echo "[8/8] 构建并启动服务..."
cd $DEPLOY_DIR

# 构建前端
echo "安装依赖..."
npm ci --silent

echo "构建前端..."
npm run build

# 启动Docker服务
echo "启动Docker服务..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up --build -d

# 11. 健康检查
echo "等待服务启动..."
sleep 15

if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo ""
    echo "========================================"
    echo " 部署成功！"
    echo "========================================"
    echo "前端访问: http://$(curl -s ifconfig.me)"
    echo "API地址: http://$(curl -s ifconfig.me)/api"
    echo "部署目录: $DEPLOY_DIR"
    echo ""
    echo "管理员账号: admin"
    echo "管理员密码: xinmeng2024"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose -f $DEPLOY_DIR/docker-compose.prod.yml logs -f"
    echo "  重启服务: docker-compose -f $DEPLOY_DIR/docker-compose.prod.yml restart"
    echo "  更新代码: cd $DEPLOY_DIR && git pull && ./server-deploy.sh"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo " 警告: 健康检查失败"
    echo "========================================"
    echo "请检查日志: docker-compose -f $DEPLOY_DIR/docker-compose.prod.yml logs"
    echo "========================================"
    exit 1
fi

# 12. 清理旧镜像
docker image prune -f
docker system prune -f --volumes

echo ""
echo "部署完成！"
