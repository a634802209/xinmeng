#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

log "=== 新梦AI 腾讯云部署脚本 ==="

# 检查是否为 root 或 sudo
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo &>/dev/null; then
        SUDO="sudo"
        ok "使用 sudo 执行需要权限的操作"
    else
        err "需要 root 权限或 sudo，请先执行: apt-get install sudo -y"
        exit 1
    fi
fi

# 获取服务器公网 IP
log "获取服务器公网 IP..."
PUBLIC_IP=$(curl -s icanhazip.com || curl -s ifconfig.me || curl -s ip.sb)
if [ -z "$PUBLIC_IP" ]; then
    warn "无法自动获取公网 IP，请手动设置"
    read -p "请输入服务器公网 IP: " PUBLIC_IP
fi
ok "服务器 IP: $PUBLIC_IP"

# 安装 Docker
if command -v docker &>/dev/null; then
    ok "Docker 已安装: $(docker --version)"
else
    log "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    $SUDO systemctl enable docker --now
    $SUDO usermod -aG docker $USER
    ok "Docker 安装完成"
fi

# 检查 Docker Compose
COMPOSE_CMD=""
if $SUDO docker compose version &>/dev/null; then
    COMPOSE_CMD="$SUDO docker compose"
    ok "docker compose 插件已安装"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
    ok "docker-compose 独立版已安装"
else
    log "安装 docker-compose..."
    ARCH=$(uname -m)
    $SUDO curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
         -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    COMPOSE_CMD="docker-compose"
    ok "docker-compose 安装完成"
fi

# 项目目录
PROJECT_DIR="/opt/xinmeng-ai"

# 如果是在项目目录中直接运行，则不克隆
if [ -f "docker-compose.yml" ] && [ -f "package.json" ]; then
    log "检测到当前目录已包含项目文件，使用当前目录"
    PROJECT_DIR=$(pwd)
else
    if [ -d "$PROJECT_DIR" ]; then
        log "清理旧项目..."
        cd "$PROJECT_DIR"
        $COMPOSE_CMD down --remove-orphans 2>/dev/null || true
        cd /
        rm -rf "$PROJECT_DIR"
        ok "旧项目已清理"
    fi

    log "准备部署目录..."
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"

    # 如果本地有 deploy.tar.gz 则使用，否则需要手动上传
    if [ -f "/tmp/deploy.tar.gz" ]; then
        log "使用本地部署包..."
        tar -xzf /tmp/deploy.tar.gz -C "$PROJECT_DIR"
    else
        warn "未找到部署包，请确保已上传项目文件到 $PROJECT_DIR"
        warn "或者按 Ctrl+C 退出，手动上传项目后重新运行此脚本"
        warn ""
        warn "如果已上传项目文件到当前目录，请确认继续..."
        read -p "继续部署？(y/n): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            exit 1
        fi
    fi
fi

cd "$PROJECT_DIR"

# 生成密钥
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)

# 询问域名配置
echo ""
read -p "是否已有域名？(y/n, 默认 n): " HAS_DOMAIN
HAS_DOMAIN=${HAS_DOMAIN:-n}

DOMAIN=""
FRONTEND_URL="http://${PUBLIC_IP}"

if [ "$HAS_DOMAIN" = "y" ] || [ "$HAS_DOMAIN" = "Y" ]; then
    read -p "请输入域名 (例如: xinmeng.ai): " DOMAIN
    if [ -n "$DOMAIN" ]; then
        FRONTEND_URL="https://${DOMAIN}"
    fi
fi

# SMTP 配置
echo ""
log "配置 SMTP 邮箱服务（用于发送验证码）..."
echo "提示：如果使用 QQ 邮箱，需要在 QQ 邮箱设置中开启 SMTP 服务并获取授权码"
echo ""

read -p "是否配置 SMTP 服务？(y/n, 默认 n): " CONFIG_SMTP
CONFIG_SMTP=${CONFIG_SMTP:-n}

SMTP_HOST="smtp.qq.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@xinmeng.ai"

if [ "$CONFIG_SMTP" = "y" ] || [ "$CONFIG_SMTP" = "Y" ]; then
    read -p "SMTP 服务器地址 (默认 smtp.qq.com): " input_smtp_host
    read -p "SMTP 端口 (默认 587): " input_smtp_port
    read -p "SMTP 用户名 (邮箱地址): " SMTP_USER
    read -s -p "SMTP 授权码/密码: " SMTP_PASS
    echo
    read -p "发件人邮箱 (默认同用户名): " input_smtp_from

    SMTP_HOST=${input_smtp_host:-smtp.qq.com}
    SMTP_PORT=${input_smtp_port:-587}
    SMTP_FROM=${input_smtp_from:-${SMTP_USER}}
fi

# 生成 .env 文件
log "生成环境配置..."
cat > .env << EOF
NODE_ENV=production
PORT=3001
HOST_IP=${PUBLIC_IP}

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

FRONTEND_URL=${FRONTEND_URL}

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_FROM=${SMTP_FROM}
SITE_NAME=新梦AI
EOF
ok "环境变量已写入 .env"

# 构建并启动
log "开始 Docker 构建与部署（首次约 5-10 分钟）..."
$COMPOSE_CMD up -d --build

# 等待服务启动
log "等待 MySQL 初始化..."
for i in $(seq 1 90); do
    if $COMPOSE_CMD exec -T xinmeng-ai-mysql mysqladmin ping -h localhost -u root -p${DB_ROOT_PASSWORD} &>/dev/null 2>&1; then
        ok "MySQL 就绪"
        break
    fi
    if [ "$i" -eq 90 ]; then
        err "MySQL 初始化超时"
        $COMPOSE_CMD logs --tail=50 xinmeng-ai-mysql
    fi
    sleep 2
done

log "等待后端服务..."
sleep 10

log "等待前端服务..."
for i in $(seq 1 60); do
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        ok "服务启动成功！"
        break
    fi
    if [ "$i" -eq 60 ]; then
        err "服务未就绪，请检查日志"
        $COMPOSE_CMD logs --tail=100
        exit 1
    fi
    sleep 2
done

# 完成
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  🎉 部署成功！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "📱 访问地址："
echo "   ${FRONTEND_URL}"
echo ""
if [ -n "$DOMAIN" ]; then
    echo "💡 提示：请确保域名 DNS 已解析到 ${PUBLIC_IP}"
    echo "   如需配置 HTTPS，请参考 DEPLOY.md"
    echo ""
fi
echo "👤 默认管理员账号："
echo "   用户名: admin"
echo "   密码: xinmeng2024"
echo ""
echo "🐳 运行中的容器："
$COMPOSE_CMD ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🛠️  常用命令："
echo "   查看日志:   cd $PROJECT_DIR && $COMPOSE_CMD logs -f"
echo "   重启服务:   cd $PROJECT_DIR && $COMPOSE_CMD restart"
echo "   停止服务:   cd $PROJECT_DIR && $COMPOSE_CMD down"
echo "   进入数据库: cd $PROJECT_DIR && $COMPOSE_CMD exec xinmeng-ai-mysql mysql -u xinmeng -p${DB_PASSWORD} xinmeng"
echo ""
echo "💾 数据持久化位置："
echo "   数据库: Docker volume (mysql-data)"
echo "   Redis:    Docker volume (redis-data)"
echo ""
echo -e "${GREEN}============================================${NC}"
