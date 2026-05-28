#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_NAME="xinmeng-ai"
PROJECT_DIR="/opt/$PROJECT_NAME"
REPO_URL="https://github.com/a634802209/xinmeng.git"

echo -e "${GREEN}=== XinMeng AI 部署脚本 ===${NC}"

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 权限运行此脚本${NC}"
    exit 1
fi

# 1. 安装 Docker（如果未安装）
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}正在安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}Docker 安装完成${NC}"
else
    echo -e "${GREEN}Docker 已安装${NC}"
fi

# 2. 安装 Docker Compose（如果未安装）
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}正在安装 Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose 安装完成${NC}"
else
    echo -e "${GREEN}Docker Compose 已安装${NC}"
fi

# 3. 创建项目目录
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 4. 拉取/更新代码
if [ -d ".git" ]; then
    echo -e "${YELLOW}正在更新代码...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}正在克隆代码...${NC}"
    git clone "$REPO_URL" .
fi

# 5. 创建必要目录
mkdir -p data public/uploads logs

# 6. 创建环境变量文件（如果不存在）
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}创建环境变量文件...${NC}"
    cat > .env << 'EOF'
JWT_SECRET=your-secure-jwt-secret-change-this
ADMIN_JWT_SECRET=your-secure-admin-secret-change-this
FRONTEND_URL=http://129.204.225.231:3001
EOF
    echo -e "${YELLOW}警告：请编辑 .env 文件修改默认密钥！${NC}"
fi

# 7. 停止并删除旧容器
echo -e "${YELLOW}停止旧容器...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 8. 清理旧镜像（可选）
read -p "是否清理旧镜像以节省空间？(y/N): " clean_images
if [[ $clean_images =~ ^[Yy]$ ]]; then
    docker image prune -af --filter "until=24h"
fi

# 9. 构建并启动
echo -e "${YELLOW}开始构建并启动服务...${NC}"
docker-compose -f docker-compose.prod.yml up --build -d

# 10. 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 11. 检查服务状态
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}=== 部署成功！===${NC}"
    echo -e "${GREEN}访问地址: http://$(curl -s ifconfig.me):3001${NC}"
    echo ""
    echo "常用命令："
    echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
    echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
else
    echo -e "${RED}=== 部署可能失败，请检查日志 ===${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi
