FROM node:20-bookworm

WORKDIR /app

# 安装系统依赖（better-sqlite3需要python3、make、g++）
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 设置环境变量强制 better-sqlite3 从源码编译
ENV npm_config_build_from_source=true
ENV npm_config_disturl=https://nodejs.org/dist
ENV npm_config_target=20

# 复制 package 文件
COPY package*.json ./

# 先单独安装 better-sqlite3 并强制从源码编译
RUN npm install better-sqlite3 --build-from-source

# 安装其他依赖（跳过 better-sqlite3，因为已经安装过了）
RUN npm install

# 复制源码
COPY . .

# 构建前端
RUN npm run build

# 创建必要目录
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3001

# 使用 tsx 运行 TypeScript（已安装在 devDependencies）
CMD ["npx", "tsx", "api/server.ts"]
