FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
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
