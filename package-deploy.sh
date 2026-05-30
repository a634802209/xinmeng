#!/bin/bash
set -e

echo "=== 新梦AI 部署包打包脚本 ==="

PACKAGE_NAME="deploy.tar.gz"
OUTPUT_DIR="./dist-deploy"

echo "清理旧的打包文件..."
rm -rf "$OUTPUT_DIR" "$PACKAGE_NAME"

echo "创建打包目录..."
mkdir -p "$OUTPUT_DIR"

echo "复制项目文件..."
cp -r \
    Dockerfile.backend \
    Dockerfile.frontend \
    docker-compose.yml \
    nginx.conf \
    package.json \
    package-lock.json \
    tsconfig.json \
    .env.example \
    deploy.sh \
    api \
    public \
    src \
    index.html \
    vite.config.ts \
    tailwind.config.js \
    postcss.config.js \
    eslint.config.js \
    "$OUTPUT_DIR/"

echo "清理不必要的文件..."
rm -rf "$OUTPUT_DIR/node_modules"
rm -rf "$OUTPUT_DIR/dist"
rm -rf "$OUTPUT_DIR/.git"
rm -rf "$OUTPUT_DIR/.trae"

echo "创建部署包 $PACKAGE_NAME..."
cd "$OUTPUT_DIR"
tar -czf "../$PACKAGE_NAME" .
cd ..

echo "清理临时目录..."
rm -rf "$OUTPUT_DIR"

echo ""
echo "✅ 打包完成！"
echo "部署包: $PACKAGE_NAME"
echo "大小: $(du -h "$PACKAGE_NAME" | cut -f1)"
echo ""
echo "下一步："
echo "1. 将 $PACKAGE_NAME 上传到服务器"
echo "2. 在服务器上解压并运行部署脚本"
echo ""
echo "上传命令示例："
echo "  scp $PACKAGE_NAME root@你的服务器IP:/tmp/"
echo ""
echo "服务器上操作："
echo "  cd /opt"
echo "  mkdir -p xinmeng-ai"
echo "  cd xinmeng-ai"
echo "  tar -xzf /tmp/$PACKAGE_NAME"
echo "  chmod +x deploy.sh"
echo "  ./deploy.sh"
