# 使用 Debian 12 (bookworm) 作为基础镜像，GLIBC 2.36+
FROM node:20-bookworm AS builder

WORKDIR /app

# 安装编译依赖
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 设置环境变量强制从源码编译 better-sqlite3
ENV npm_config_build_from_source=true
ENV npm_config_disturl=https://nodejs.org/dist
ENV npm_config_target=20

# 先复制 package 文件并安装依赖（利用缓存层）
COPY package*.json ./
RUN npm install better-sqlite3 --build-from-source && npm install

# 复制源码并构建前端
COPY . .
RUN npm run build

# 生产环境镜像
FROM node:20-bookworm AS production

WORKDIR /app

# 安装运行所需的系统库
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# 创建数据目录并设置权限
RUN mkdir -p /app/data /app/public/uploads /app/logs && chmod 755 /app/data /app/public/uploads

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动命令
CMD ["node", "--experimental-specifier-resolution=node", "--loader", "tsx", "api/server.ts"]
