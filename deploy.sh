#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

log "=== 新梦AI 多容器部署 ==="

SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo &>/dev/null; then
        SUDO="sudo"
        ok "使用 sudo 执行需要权限的操作"
    else
        err "需要 root 权限或 sudo，请安装 sudo: apt-get install sudo"
        exit 1
    fi
fi

if command -v docker &>/dev/null; then
    ok "Docker 已安装: $(docker --version)"
else
    log "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    $SUDO systemctl enable docker --now
    $SUDO usermod -aG docker $USER
    ok "Docker 安装完成"
fi

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

PROJECT_DIR="$HOME/xinmeng-ai"
if [ -d "$PROJECT_DIR" ]; then
    log "清理旧项目..."
    cd "$PROJECT_DIR"
    $COMPOSE_CMD down --rmi all -v 2>/dev/null || true
    cd /
    rm -rf "$PROJECT_DIR"
    ok "旧项目已清理"
fi

log "克隆项目代码..."
mkdir -p "$PROJECT_DIR"
git clone --depth 1 git@github.com:a634802209/xinmeng.git "$PROJECT_DIR"
cd "$PROJECT_DIR"
ok "代码克隆完成"

JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)

log "配置 SMTP 邮箱服务..."
echo "请输入 SMTP 配置信息（直接回车跳过配置）："
read -p "SMTP 服务器地址 (默认 smtp.qq.com): " SMTP_HOST
read -p "SMTP 端口 (默认 587): " SMTP_PORT
read -p "SMTP 用户名 (邮箱地址): " SMTP_USER
read -s -p "SMTP 授权码/密码: " SMTP_PASS
echo
read -p "发件人名称 (默认 新梦AI): " SMTP_FROM_NAME

SMTP_HOST=${SMTP_HOST:-smtp.qq.com}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_FROM_NAME=${SMTP_FROM_NAME:-新梦AI}
SMTP_FROM=${SMTP_USER:-noreply@xinmeng.ai}

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

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_FROM=${SMTP_FROM}
SITE_NAME=新梦AI
EOF
ok "环境变量已写入 .env"

log "Docker 构建中（首次约 5-10 分钟）..."
$COMPOSE_CMD up -d --build

log "等待 MySQL 初始化完成（首次约 30-60 秒）..."
for i in $(seq 1 60); do
    if $COMPOSE_CMD exec -T xinmeng-ai-mysql mysqladmin ping -h localhost -u root -p${DB_ROOT_PASSWORD} &>/dev/null 2>&1; then
        ok "MySQL 就绪"
        break
    fi
    if [ "$i" -eq 60 ]; then
        err "MySQL 初始化超时，查看日志："
        $COMPOSE_CMD logs --tail=30 xinmeng-ai-mysql
    fi
    sleep 2
done

log "等待服务就绪..."
for i in $(seq 1 60); do
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        ok "服务启动成功"
        break
    fi
    if [ "$i" -eq 60 ]; then
        err "服务未就绪，查看日志："
        $COMPOSE_CMD logs --tail=50
        exit 1
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  多容器部署成功！${NC}"
echo -e "${GREEN}  访问: http://129.204.225.231${NC}"
echo -e "${GREEN}  管理员: admin / xinmeng2024${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "服务清单："
echo "  xinmeng-ai-frontend    - 前端 (Nginx, :80) [frontend-network]"
echo "  xinmeng-ai-backend     - 后端 (Node.js, :3001) [backend-network + frontend-network]"
echo "  xinmeng-ai-mysql       - 数据库 (MySQL, :3306) [backend-network]"
echo "  xinmeng-ai-redis       - 缓存 (Redis, :6379) [backend-network]"
echo ""
echo "常用命令："
echo "  查看所有容器: ${COMPOSE_CMD} ps"
echo "  查看日志: ${COMPOSE_CMD} logs -f"
echo "  重启: ${COMPOSE_CMD} restart"
echo "  停止: ${COMPOSE_CMD} down"
echo "  查看数据库数据: ${COMPOSE_CMD} exec xinmeng-ai-mysql mysql -u xinmeng -p${DB_PASSWORD} xinmeng"
