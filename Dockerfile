FROM node:20-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

ENV npm_config_build_from_source=true

COPY package*.json ./
RUN npm install better-sqlite3 --build-from-source && npm install

COPY . .
RUN npm run build

FROM node:20-bookworm AS production

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data /app/public/uploads /app/logs

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/app.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fs http://localhost:3001/api/health || exit 1

ENTRYPOINT ["npx", "tsx", "api/server.ts"]
