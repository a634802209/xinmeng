FROM node:20-bookworm AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# ============================================
FROM node:20-bookworm AS production

WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install ALL dependencies (tsx is needed at runtime for backend)
RUN npm ci

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/public ./public

# Create required directories
RUN mkdir -p /app/data /app/public/uploads /app/logs

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/app.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fs http://localhost:3001/api/health || exit 1

# Use tsx to run TypeScript backend directly
CMD ["npx", "tsx", "api/server.ts"]
