FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源码
COPY . .

# 构建前端
RUN npm run build

# 数据持久化目录
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "api/server.ts"]
