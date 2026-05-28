#!/bin/bash
set -e

# XinMeng AI 数据库自动备份脚本
# 用法: ./backup.sh [retention_days]
# 默认保留 30 天备份

RETENTION_DAYS=${1:-30}
BACKUP_DIR="/opt/backups/xinmeng-ai"
DB_PATH="/opt/xinmeng-ai/data/app.db"
UPLOADS_DIR="/opt/xinmeng-ai/public/uploads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/xinmeng-backup.log"

# 可选: 腾讯云COS备份
COS_BUCKET="${TENCENT_COS_BUCKET:-}"
COS_REGION="${TENCENT_COS_REGION:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

mkdir -p "$BACKUP_DIR"

log "=== 开始备份 ==="

# 1. 备份数据库
if [ -f "$DB_PATH" ]; then
    DB_BACKUP="$BACKUP_DIR/db_${TIMESTAMP}.db"
    cp "$DB_PATH" "$DB_BACKUP"
    gzip -f "$DB_BACKUP"
    log "数据库备份完成: ${DB_BACKUP}.gz"
else
    log "警告: 数据库文件不存在 $DB_PATH"
fi

# 2. 备份上传文件（如果有且未使用COS）
if [ -d "$UPLOADS_DIR" ] && [ -z "$COS_BUCKET" ]; then
    UPLOADS_BACKUP="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
    tar -czf "$UPLOADS_BACKUP" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
    log "上传文件备份完成: $UPLOADS_BACKUP"
fi

# 3. 备份 Nginx 配置
if [ -f /etc/nginx/sites-available/xinmeng-ai ]; then
    NGINX_BACKUP="$BACKUP_DIR/nginx_${TIMESTAMP}.conf"
    cp /etc/nginx/sites-available/xinmeng-ai "$NGINX_BACKUP"
    log "Nginx配置备份完成: $NGINX_BACKUP"
fi

# 4. 备份环境变量（脱敏）
ENV_BACKUP="$BACKUP_DIR/env_${TIMESTAMP}.txt"
if [ -f /opt/xinmeng-ai/.env ]; then
    grep -v "SECRET\|PASSWORD\|KEY" /opt/xinmeng-ai/.env > "$ENV_BACKUP" 2>/dev/null || true
    log "环境变量备份完成（已脱敏）"
fi

# 5. 上传到腾讯云COS（如果配置了）
if [ -n "$COS_BUCKET" ] && command -v coscli &> /dev/null; then
    coscli cp -r "$BACKUP_DIR" "cos://${COS_BUCKET}/backups/" --region="$COS_REGION"
    log "备份已上传到COS"
fi

# 6. 清理旧备份
DELETED=$(find "$BACKUP_DIR" -name "*.gz" -o -name "*.conf" -o -name "*.txt" | head -n -$RETENTION_DAYS)
if [ -n "$DELETED" ]; then
    echo "$DELETED" | xargs rm -f
    log "已清理 $RETENTION_DAYS 天前的备份"
fi

# 7. 检查磁盘空间
DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_USAGE" -gt 80 ]; then
    log "警告: 备份磁盘使用率 ${DISK_USAGE}%"
fi

log "=== 备份完成 ==="
