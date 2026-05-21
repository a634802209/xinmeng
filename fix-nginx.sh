#!/bin/bash
set -e

echo "=== XinMeng.ai Nginx 修复脚本 ==="

APP_DIR="/opt/xinmeng-ai"
NGINX_CONF="/etc/nginx/conf.d/xinmeng-ai.conf"

# 1. 确保 dist 目录存在
if [ ! -d "${APP_DIR}/dist" ]; then
    echo "❌ 错误: ${APP_DIR}/dist 目录不存在"
    echo "请先运行 npm run build 生成前端构建产物"
    exit 1
fi

# 2. 创建 Nginx 配置
echo ""
echo "[1/3] 创建 Nginx 配置..."
cat > ${NGINX_CONF} << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    # 前端静态文件
    location / {
        root /opt/xinmeng-ai/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /opt/xinmeng-ai/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
echo "✅ Nginx 配置已创建"

# 3. 删除可能冲突的默认配置
if [ -f "/etc/nginx/conf.d/default.conf" ]; then
    echo ""
    echo "[2/3] 删除默认站点配置..."
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
    echo "✅ 默认配置已备份为 default.conf.bak"
fi

# 4. 测试并重载 Nginx
echo ""
echo "[3/3] 测试并重载 Nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "=== 修复完成 ==="
echo ""
echo "🌐 访问地址: http://129.204.225.231"
echo ""
echo "如果仍有问题，请检查:"
echo "  1. 防火墙是否放行 80 端口: ufw status"
echo "  2. 后端是否运行: pm2 status"
echo "  3. Nginx 错误日志: tail -f /var/log/nginx/error.log"
