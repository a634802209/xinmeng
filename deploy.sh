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

[ "$EUID" -ne 0 ] && err "请用 root 执行" && exit 1

# ---------- 1. 安装 Docker ----------
if command -v docker &>/dev/null; then
    ok "Docker 已安装: $(docker --version)"
else
    log "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker --now
    ok "Docker 安装完成"
fi

# ---------- 2. 安装 docker-compose ----------
if command -v docker-compose &>/dev/null; then
    ok "docker-compose 已安装"
else
    log "安装 docker-compose..."
    ARCH=$(uname -m)
    curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
         -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ok "docker-compose 安装完成"
fi

# ---------- 3. 清理旧项目 ----------
PROJECT_DIR="/opt/xinmeng-ai"
if [ -d "$PROJECT_DIR" ]; then
    log "清理旧项目..."
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml down --rmi all -v 2>/dev/null || true
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

# ---------- 6. 环境变量 ----------
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 32)

cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
ADMIN_JWT_SECRET=${ADMIN_SECRET}
FRONTEND_URL=http://129.204.225.231:3001
EOF
ok "环境变量已生成"

# ---------- 7. 构建并启动 ----------
log "Docker 构建中（首次约 3-5 分钟）..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# ---------- 8. 等待就绪 ----------
log "等待服务就绪..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        ok "服务启动成功"
        break
    fi
    if [ "$i" -eq 30 ]; then
        err "服务未就绪，查看日志："
        docker-compose -f docker-compose.prod.yml logs --tail=50
        exit 1
    fi
    sleep 2
done

# ---------- 9. 完成 ----------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  部署成功！${NC}"
echo -e "${GREEN}  访问: http://129.204.225.231:3001${NC}"
echo -e "${GREEN}  管理员: admin / xinmeng2024${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "常用命令："
echo "  查看日志: cd ${PROJECT_DIR} && docker-compose -f docker-compose.prod.yml logs -f"
echo "  重启:     cd ${PROJECT_DIR} && docker-compose -f docker-compose.prod.yml restart"
echo "  停止:     cd ${PROJECT_DIR} && docker-compose -f docker-compose.prod.yml down"