# XinMeng AI 腾讯云私密部署指南

## 部署架构

```
用户 → HTTPS(443) → Nginx → Node.js(3001, 仅本地)
              ↓
         SSL证书(certbot)
              ↓
         安全头 + 防火墙
```

## 快速部署步骤

### 1. 购买腾讯云服务器
- **产品**: 轻量应用服务器
- **配置**: 2核4G，带宽5M
- **系统**: Ubuntu 22.04 LTS
- **价格**: 约50-100元/月

### 2. 连接服务器
```bash
ssh root@你的服务器IP
```

### 3. 运行部署脚本
```bash
# 将 deploy.sh 上传到服务器
chmod +x deploy.sh
sudo ./deploy.sh
```

### 4. 配置域名
```bash
# 修改 nginx.conf 中的域名
sed -i 's/your-domain.com/你的域名.com/g' /etc/nginx/sites-available/xinmeng-ai

# 启用配置
ln -s /etc/nginx/sites-available/xinmeng-ai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5. 申请 SSL 证书
```bash
certbot --nginx -d 你的域名.com
```

### 6. 部署应用
```bash
cd /opt/xinmeng-ai

# 修改环境变量
vim .env
# FRONTEND_URL=https://你的域名.com

# 启动
docker-compose -f docker-compose.prod.yml up -d --build
```

### 7. 检查状态
```bash
# 查看容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 测试接口
curl https://你的域名.com/api/health
```

## 安全特性

| 安全措施 | 说明 |
|---------|------|
| **HTTPS** | SSL/TLS 加密传输 |
| **防火墙** | 仅开放 22(SSH)、80(HTTP)、443(HTTPS) |
| **Node.js不暴露** | 3001 端口只绑定 127.0.0.1 |
| **安全头** | X-Frame-Options, X-XSS-Protection 等 |
| **自动跳转HTTPS** | HTTP 自动 301 到 HTTPS |
| **JWT密钥** | 随机生成 32 位密钥 |
| **数据库持久化** | data 目录挂载到宿主机 |

## 后续维护

### 更新代码
```bash
cd /opt/xinmeng-ai
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### 查看日志
```bash
# 应用日志
docker-compose -f docker-compose.prod.yml logs -f

# Nginx 日志
tail -f /var/log/nginx/xinmeng-ai-access.log
```

### 备份数据
```bash
# 备份数据库
cp -r /opt/xinmeng-ai/data /backup/xinmeng-ai-data-$(date +%Y%m%d)

# 备份上传文件
cp -r /opt/xinmeng-ai/public/uploads /backup/xinmeng-ai-uploads-$(date +%Y%m%d)
```

## 费用估算

| 项目 | 月费用 |
|-----|-------|
| 轻量服务器(2核4G5M) | ~60元 |
| 域名(.com) | ~70元/年 |
| SSL证书 | 免费(Let's Encrypt) |
| **总计** | **~65元/月** |
