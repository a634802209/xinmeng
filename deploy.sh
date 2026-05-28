#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查参数
if [ $# -lt 2 ]; then
    echo -e "${RED}用法: $0 <域名> <邮箱> [GitHub用户名] [GitHub仓库名]${NC}"
    echo "示例: $0 xinmeng.ai admin@xinmeng.ai myuser xinmeng-ai"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
GITHUB_USER=${3:-""}
GITHUB_REPO=${4:-""}

echo "=== XinMeng.ai 私密部署脚本 ==="
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"

# 1. 系统更新
echo -e "\n${YELLOW}[1/8] 系统更新...${NC}"
apt-get update && apt-get upgrade -y

# 2. 安装 Docker
echo -e "\n${YELLOW}[2/8] 安装 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 3. 安装 Nginx
echo -e "\n${YELLOW}[3/8] 安装 Nginx...${NC}"
apt-get install -y nginx certbot python3-certbot-nginx

# 4. 配置防火墙
echo -e "\n${YELLOW}[4/8] 配置防火墙...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. 创建应用目录
echo -e "\n${YELLOW}[5/8] 创建应用目录...${NC}"
mkdir -p /opt/xinmeng-ai/{data,uploads,logs}

# 6. 生成安全密钥
echo -e "\n${YELLOW}[6/8] 生成安全密钥...${NC}"
JWT_SECRET=$(openssl rand -base64 32)

cat > /opt/xinmeng-ai/.env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=https://$DOMAIN
DB_PATH=/app/data/app.db
EOF

chmod 600 /opt/xinmeng-ai/.env
echo -e "${GREEN}JWT_SECRET 已生成并保存到 /opt/xinmeng-ai/.env${NC}"

# 7. 配置 Nginx
echo -e "\n${YELLOW}[7/8] 配置 Nginx...${NC}"
cat > /etc/nginx/sites-available/xinmeng-ai << 'EOF'
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/placeholder/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/placeholder/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /uploads/ {
        alias /opt/xinmeng-ai/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/xinmeng-ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 8. 申请 SSL 证书
echo -e "\n${YELLOW}[8/8] 申请 SSL 证书...${NC}"
certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive || true

# 更新 Nginx 配置中的证书路径
sed -i "s|/etc/letsencrypt/live/placeholder|/etc/letsencrypt/live/$DOMAIN|g" /etc/nginx/sites-available/xinmeng-ai
nginx -t && systemctl reload nginx

# 设置自动续期
echo "0 3 * * * certbot renew --quiet" | crontab -

echo -e "\n${GREEN}=== 部署完成 ===${NC}"
echo -e "请手动执行以下步骤:"
echo ""
echo "1. 将项目代码上传到 /opt/xinmeng-ai/"
if [ -n "$GITHUB_USER" ] && [ -n "$GITHUB_REPO" ]; then
    echo "   git clone https://github.com/$GITHUB_USER/$GITHUB_REPO.git /opt/xinmeng-ai/"
else
    echo "   使用 scp 或 rsync 上传代码"
fi
echo ""
echo "2. 启动服务:"
echo "   cd /opt/xinmeng-ai"
echo "   docker-compose up --build -d"
echo ""
echo "3. 访问: https://$DOMAIN"
echo ""
echo -e "${YELLOW}安全提醒:${NC}"
echo "- .env 文件已设置为 600 权限"
echo "- 防火墙只开放 22, 80, 443"
echo "- Node.js 只监听 127.0.0.1:3001"
echo "- JWT_SECRET 是随机生成的，请妥善保管"
