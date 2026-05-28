#!/bin/bash

# XinMeng AI 服务器监控脚本
# 用法: ./monitor.sh

LOG_FILE="/var/log/xinmeng-monitor.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

alert() {
    local message="$1"
    log "ALERT: $message"
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 XinMeng AI Alert: $message\"}" \
            "$ALERT_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# 检查 CPU 使用率
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
CPU_INT=${CPU_USAGE%.*}
if [ "$CPU_INT" -gt 85 ]; then
    alert "CPU usage is ${CPU_USAGE}%"
fi

# 检查内存使用率
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -gt 90 ]; then
    alert "Memory usage is ${MEM_USAGE}%"
fi

# 检查磁盘使用率
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_USAGE" -gt 85 ]; then
    alert "Disk usage is ${DISK_USAGE}%"
fi

# 检查 Docker 容器状态
if ! docker ps | grep -q "xinmeng-ai"; then
    alert "Docker container xinmeng-ai is not running!"
    cd /opt/xinmeng-ai && docker-compose up -d
fi

# 检查服务健康
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health)
if [ "$HEALTH_STATUS" != "200" ]; then
    alert "Health check failed (HTTP $HEALTH_STATUS)"
fi

# 检查 Nginx
if ! systemctl is-active --quiet nginx; then
    alert "Nginx is not running!"
    systemctl restart nginx
fi

# 检查 SSL 证书过期时间（提前 7 天告警）
if [ -f /etc/letsencrypt/live/*/fullchain.pem ]; then
    CERT_DAYS=$(openssl x509 -in /etc/letsencrypt/live/*/fullchain.pem -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d "{}" +%s)
    NOW=$(date +%s)
    DAYS_LEFT=$(( (CERT_DAYS - NOW) / 86400 ))
    if [ "$DAYS_LEFT" -lt 7 ]; then
        alert "SSL certificate expires in $DAYS_LEFT days"
    fi
fi

log "Monitor check completed. CPU: ${CPU_USAGE}%, MEM: ${MEM_USAGE}%, DISK: ${DISK_USAGE}%"
