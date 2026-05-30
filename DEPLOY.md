# 新梦AI 腾讯云部署指南

## 📋 目录
- [环境准备](#环境准备)
- [快速部署](#快速部署)
- [域名与 HTTPS](#域名与-https)
- [后续维护](#后续维护)
- [常见问题](#常见问题)

---

## 🌱 环境准备

### 1. 购买腾讯云服务器

推荐配置：
- **实例规格**: 轻量应用服务器 2核4G
- **带宽**: 5Mbps 或更高
- **系统**: Ubuntu 22.04 LTS
- **存储**: 40GB 系统盘

购买地址：https://cloud.tencent.com/product/lighthouse

### 2. 配置防火墙（安全组）

在腾讯云控制台配置安全组，开放以下端口：
- `22` - SSH 远程连接
- `80` - HTTP 访问
- `443` - HTTPS 访问（可选，配置域名后需要）

### 3. 连接服务器

使用 SSH 连接到您的服务器：

```bash
ssh root@您的服务器IP
```

---

## 🚀 快速部署

### 方法一：使用部署包（推荐）

#### 步骤 1：在本地打包项目

在您的本地开发环境中：

```bash
# 进入项目目录
cd /path/to/xinmeng-ai

# 运行打包脚本
chmod +x package-deploy.sh
./package-deploy.sh
```

这会生成 `deploy.tar.gz` 部署包。

#### 步骤 2：上传部署包到服务器

```bash
# 使用 scp 上传（在本地终端执行）
scp deploy.tar.gz root@您的服务器IP:/tmp/
```

#### 步骤 3：在服务器上部署

连接到服务器后执行：

```bash
# 创建项目目录
cd /opt
mkdir -p xinmeng-ai
cd xinmeng-ai

# 解压部署包
tar -xzf /tmp/deploy.tar.gz

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动：
- 安装 Docker 和 Docker Compose
- 配置环境变量（自动生成密钥）
- 构建并启动所有容器
- 等待服务就绪

#### 步骤 4：访问应用

部署完成后，在浏览器访问：
```
http://您的服务器IP
```

默认管理员账号：
- 用户名: `admin`
- 密码: `xinmeng2024`

---

### 方法二：手动部署

如果您想手动控制每个步骤：

#### 1. 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl enable docker --now

# 验证安装
docker --version
docker compose version
```

#### 2. 上传项目文件

将整个项目上传到服务器的 `/opt/xinmeng-ai` 目录。

#### 3. 配置环境变量

```bash
cd /opt/xinmeng-ai
cp .env.example .env

# 编辑 .env 文件，设置以下内容：
nano .env
```

需要配置的关键项：
```env
# 基础配置
NODE_ENV=production
HOST_IP=您的服务器IP
FRONTEND_URL=http://您的服务器IP

# JWT 密钥（请使用随机字符串）
JWT_SECRET=您的JWT密钥
ADMIN_JWT_SECRET=您的管理员JWT密钥

# 数据库配置（会自动创建，密码请随机生成）
DB_PASSWORD=随机数据库密码
DB_ROOT_PASSWORD=随机root密码

# 邮箱配置（可选，用于发送验证码）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=您的邮箱@qq.com
SMTP_PASS=您的SMTP授权码
SMTP_FROM=您的邮箱@qq.com
```

#### 4. 启动服务

```bash
cd /opt/xinmeng-ai
docker compose up -d --build

# 查看日志
docker compose logs -f
```

---

## 🌐 域名与 HTTPS

### 1. 配置域名

1. 在您的域名服务商处（如腾讯云 DNSPod）添加 DNS 解析：
   - 记录类型: `A`
   - 主机记录: `@` 或 `www`
   - 记录值: 您的服务器IP

2. 等待 DNS 生效（通常几分钟）

### 2. 配置 Nginx 支持域名

编辑 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name 您的域名.com www.您的域名.com;  # 修改这里

    # ... 其余配置保持不变
}
```

重启前端容器：
```bash
docker compose restart xinmeng-ai-frontend
```

### 3. 申请免费 SSL 证书（Let's Encrypt）

使用 Certbot 申请证书：

```bash
# 安装 Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 申请证书（会自动配置 Nginx）
certbot --nginx -d 您的域名.com -d www.您的域名.com
```

按提示操作，Certbot 会自动：
- 验证域名所有权
- 申请 SSL 证书
- 配置 Nginx HTTPS
- 设置自动续期

### 4. 更新环境变量

修改 `.env` 文件：
```env
FRONTEND_URL=https://您的域名.com
```

重启后端服务：
```bash
docker compose restart xinmeng-ai-backend
```

---

## 🔧 后续维护

### 查看服务状态

```bash
cd /opt/xinmeng-ai

# 查看容器状态
docker compose ps

# 查看所有容器日志
docker compose logs -f

# 查看特定容器日志
docker compose logs -f xinmeng-ai-backend
docker compose logs -f xinmeng-ai-mysql
```

### 停止与启动

```bash
# 停止服务
docker compose down

# 启动服务
docker compose up -d

# 重启服务
docker compose restart
```

### 更新代码

```bash
cd /opt/xinmeng-ai

# 1. 备份数据（可选但推荐）
docker compose exec xinmeng-ai-mysql mysqldump -u xinmeng -p xinmeng > backup.sql

# 2. 上传新的代码文件

# 3. 重新构建并启动
docker compose up -d --build
```

### 数据库备份

```bash
# 备份数据库
cd /opt/xinmeng-ai
docker compose exec xinmeng-ai-mysql mysqldump -u xinmeng -p xinmeng > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T xinmeng-ai-mysql mysql -u xinmeng -p xinmeng < backup.sql
```

---

## 📊 服务架构

```
用户浏览器
    │
    ▼
┌─────────────────────────────┐
│  Nginx (xinmeng-ai-frontend)│ :80/443
│  - 前端静态文件             │
│  - API 反向代理             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Node.js (xinmeng-ai-backend)│ :3001
│  - API 服务                 │
└───────┬─────────────────┬───┘
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   MySQL      │   │    Redis     │
│ (数据库)     │   │  (缓存)      │
└──────────────┘   └──────────────┘
```

### 容器说明

| 容器名 | 镜像 | 作用 | 端口 |
|--------|------|------|------|
| xinmeng-ai-frontend | nginx:alpine | 前端 Web 服务 | 80 |
| xinmeng-ai-backend | node:20-bookworm | 后端 API 服务 | 3001（内部） |
| xinmeng-ai-mysql | mysql:8.0 | 数据库 | 3306（内部） |
| xinmeng-ai-redis | redis:7-alpine | 缓存服务 | 6379（内部） |

---

## ❓ 常见问题

### Q: 部署后无法访问？

检查清单：
1. 防火墙是否开放 80 端口
2. 容器是否正常运行: `docker compose ps`
3. 查看日志: `docker compose logs`

### Q: MySQL 容器启动失败？

检查：
1. 服务器内存是否足够（至少 2GB）
2. 查看日志: `docker compose logs xinmeng-ai-mysql`

### Q: 如何修改管理员密码？

```bash
# 进入数据库
docker compose exec xinmeng-ai-mysql mysql -u xinmeng -p xinmeng

# 执行 SQL 更新密码（需要先生成 bcrypt 哈希）
UPDATE admin_accounts SET password_hash='新的哈希值' WHERE username='admin';
```

### Q: 如何配置腾讯云 COS 对象存储？

在 `.env` 文件中添加：
```env
TENCENT_COS_SECRET_ID=您的SecretId
TENCENT_COS_SECRET_KEY=您的SecretKey
TENCENT_COS_BUCKET=您的Bucket名称
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_DOMAIN=您的COS域名
```

### Q: 如何查看容器资源使用情况？

```bash
docker stats
```

---

## 📞 技术支持

如遇问题，请：
1. 查看容器日志: `docker compose logs`
2. 检查服务器资源: `htop`, `df -h`
3. 确认防火墙/安全组配置

---

**祝您部署顺利！🎊**
