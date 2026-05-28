# XinMeng AI 高级部署指南

## 目录

1. [数据库自动备份](#1-数据库自动备份)
2. [日志收集系统](#2-日志收集系统)
3. [多环境部署](#3-多环境部署)
4. [完整部署清单](#4-完整部署清单)

---

## 1. 数据库自动备份

### 功能

- 每天自动备份 SQLite 数据库
- 备份上传的文件（如果未使用 COS）
- 备份 Nginx 配置
- 自动上传到腾讯云 COS
- 自动清理 30 天前的旧备份

### 配置

```bash
# 上传到服务器
scp backup.sh root@你的服务器IP:/opt/xinmeng-ai/
ssh root@你的服务器IP

# 设置权限
chmod +x /opt/xinmeng-ai/backup.sh
mkdir -p /opt/backups/xinmeng-ai

# 添加定时任务（每天凌晨3点备份）
crontab -e
# 添加:
0 3 * * * /opt/xinmeng-ai/backup.sh >> /var/log/xinmeng-backup.log 2>&1
```

### 手动备份

```bash
/opt/xinmeng-ai/backup.sh
# 或保留7天
/opt/xinmeng-ai/backup.sh 7
```

### 恢复备份

```bash
# 停止服务
cd /opt/xinmeng-ai && docker-compose down

# 恢复数据库
gunzip -c /opt/backups/xinmeng-ai/db_20240115_030000.db.gz > /opt/xinmeng-ai/data/app.db

# 重启服务
docker-compose up -d
```

---

## 2. 日志收集系统

使用 Grafana + Loki + Promtail 收集和查看日志。

### 启动监控栈

```bash
cd /opt/xinmeng-ai

# 启动应用 + 监控
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

### 访问 Grafana

```
http://你的服务器IP:3000
默认账号: admin / admin
```

### 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 443 ssl;
    server_name logs.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

---

## 3. 多环境部署

### 环境划分

| 环境 | 分支 | 域名 | 用途 |
|------|------|------|------|
| 生产 | main | xinmeng.ai | 正式服务 |
| 测试 | dev | staging.xinmeng.ai | 测试验证 |

### 生产环境部署

```bash
# 推送到 main 分支自动触发
git checkout main
git merge dev
git push origin main
```

### 测试环境部署

```bash
# 推送到 dev 分支自动触发
git checkout dev
# 修改代码...
git push origin dev
```

### 环境变量配置

**生产环境** `/opt/xinmeng-ai/.env`:
```bash
NODE_ENV=production
FRONTEND_URL=https://xinmeng.ai
```

**测试环境** `/opt/xinmeng-ai-staging/.env`:
```bash
NODE_ENV=staging
FRONTEND_URL=https://staging.xinmeng.ai
```

---

## 4. 完整部署清单

### 首次部署检查表

- [ ] 购买云服务器（2核4G，Ubuntu 22.04）
- [ ] 配置安全组（开放 22, 80, 443）
- [ ] 域名解析到服务器 IP
- [ ] 上传代码到 `/opt/xinmeng-ai`
- [ ] 运行 `./deploy.sh your-domain.com your@email.com`
- [ ] 创建 `.env` 文件并设置 JWT_SECRET
- [ ] 启动服务 `docker-compose up -d`
- [ ] 配置 GitHub Secrets（SERVER_HOST, SERVER_USER, SERVER_SSH_KEY）
- [ ] 配置备份定时任务
- [ ] 配置监控定时任务
- [ ] 测试自动部署（推送代码到 main）

### 文件清单

```
/opt/xinmeng-ai/
├── .env                          # 环境变量（不提交到Git）
├── .env.example                  # 环境变量模板
├── docker-compose.yml            # 开发环境
├── docker-compose.prod.yml       # 生产环境（含监控）
├── Dockerfile                    # 应用镜像
├── nginx.conf                    # Nginx 配置
├── deploy.sh                     # 初始化部署脚本
├── backup.sh                     # 数据库备份脚本
├── monitor.sh                    # 监控告警脚本
├── loki-config.yml               # Loki 配置
├── promtail-config.yml           # Promtail 配置
├── .github/workflows/
│   ├── ci.yml                    # 代码检查
│   ├── deploy.yml                # 生产部署
│   └── deploy-staging.yml        # 测试部署
└── ...
```

### 维护命令速查

```bash
# 查看服务状态
docker-compose ps
docker-compose logs -f

# 重启服务
docker-compose restart

# 更新代码后重新构建
docker-compose down
docker-compose up --build -d

# 查看备份
ls -la /opt/backups/xinmeng-ai/

# 手动备份
/opt/xinmeng-ai/backup.sh

# 查看监控日志
tail -f /var/log/xinmeng-monitor.log

# 查看 Nginx 日志
tail -f /var/log/nginx/xinmeng-ai-access.log

# 更新 SSL 证书
certbot renew
```
