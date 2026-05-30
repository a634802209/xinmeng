#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

log "=== XinMeng AI 完整部署 ==="

# 检查用户权限 - ubuntu 用户需要 sudo
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

# ---------- 1. 安装 Docker ----------
if command -v docker &>/dev/null; then
    ok "Docker 已安装: $(docker --version)"
else
    log "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    $SUDO systemctl enable docker --now
    # 将当前用户加入 docker 组，免 sudo 使用
    $SUDO usermod -aG docker $USER
    ok "Docker 安装完成，已加入 docker 组（重新登录后免 sudo）"
fi

# ---------- 2. 安装 docker-compose（兼容插件和独立版）----------
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

# ---------- 3. 清理旧项目 ----------
PROJECT_DIR="$HOME/xinmeng-ai"
if [ -d "$PROJECT_DIR" ]; then
    log "清理旧项目..."
    cd "$PROJECT_DIR"
    $COMPOSE_CMD -f docker-compose.prod.yml down --rmi all -v 2>/dev/null || true
    $SUDO docker rm -f xinmeng-ai 2>/dev/null || true
    $SUDO docker rmi -f xinmeng-ai:latest 2>/dev/null || true
    cd /
    rm -rf "$PROJECT_DIR"
    ok "旧项目已清理"
fi

# ---------- 4. 克隆代码 ----------
log "克隆项目代码..."
mkdir -p "$PROJECT_DIR"
git clone --depth 1 https://github.com/a634802209/xinmeng.git "$PROJECT_DIR"
cd "$PROJECT_DIR"
ok "代码克隆完成"

# ---------- 5. 创建必要目录 ----------
mkdir -p data public/uploads logs

# ---------- 6. 环境变量（通过 .env 文件）----------
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)

cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=${JWT_SECRET}
ADMIN_JWT_SECRET=${ADMIN_SECRET}
FRONTEND_URL=http://129.204.225.231
DB_PATH=/app/data/app.db

# SMTP Email Configuration (configure your own SMTP server)
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-smtp-auth-code
SMTP_FROM=noreply@xinmeng.ai
SITE_NAME=新梦AI
EOF
ok "环境变量已写入 .env"

# ---------- 7. 构建并启动 ----------
log "Docker 构建中（首次约 3-5 分钟）..."
$COMPOSE_CMD -f docker-compose.prod.yml build --no-cache
$SUDO $COMPOSE_CMD -f docker-compose.prod.yml up -d

# ---------- 8. 等待就绪 ----------
log "等待服务就绪..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        ok "服务启动成功"
        break
    fi
    if [ "$i" -eq 30 ]; then
        err "服务未就绪，查看日志："
        $COMPOSE_CMD -f docker-compose.prod.yml logs --tail=50
        exit 1
    fi
    sleep 2
done

# ---------- 9. 完成 ----------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  部署成功！${NC}"
echo -e "${GREEN}  访问: http://129.204.225.231${NC}"
echo -e "${GREEN}  管理员: admin / xinmeng2024${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "常用命令："
echo "  查看日志: cd ${PROJECT_DIR} && ${COMPOSE_CMD} -f docker-compose.prod.yml logs -f"
echo "  重启:     cd ${PROJECT_DIR} && ${COMPOSE_CMD} -f docker-compose.prod.yml restart"
echo "  停止:     cd ${PROJECT_DIR} && ${COMPOSE_CMD} -f docker-compose.prod.yml down"
