# 新梦AI 腾讯云部署指南

## 📋 目录
- [环境准备](#环境准备)
- [GitHub SSH Key 配置](#github-ssh-key-配置)
- [快速部署（GitHub SSH 克隆）](#快速部署github-ssh-克隆)
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

## 🔑 GitHub SSH Key 配置

**重要：推荐使用 SSH 方式克隆代码，这样可以方便后续更新部署**

### 在服务器上生成 SSH Key

```bash
# 生成 SSH Key（如果还没有）
ssh-keygen -t ed25519 -C "您的邮箱@example.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

### 将公钥添加到 GitHub

1. 登录 GitHub：https://github.com
2. 进入 Settings → SSH and GPG keys
3. 点击 "New SSH key"
4. 粘贴公钥内容
5. 点击 "Add SSH key"

### 验证 SSH 连接

```bash
ssh -T git@github.com
```

看到 "Hi a634802209! You've successfully authenticated" 就表示配置成功。

---

## 🚀 快速部署（GitHub SSH 克隆）

### 方法一：直接从 GitHub 克隆（推荐）

#### 步骤 1：配置 SSH Key（如果未配置）

按照上面的说明配置 GitHub SSH Key。

#### 步骤 2：连接服务器并运行部署脚本

```bash
# SSH 连接到服务器
ssh root@您的服务器IP

# 下载并运行部署脚本
cd /opt
curl -fsSL https://raw.githubusercontent.com/a634802209/xinmeng/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

#### 步骤 3：选择部署方式

运行脚本时会提示选择代码获取方式：

```
选择代码获取方式：
1) 从 GitHub 克隆（推荐）- 需要配置 GitHub SSH Key  ← 选择这个
2) 使用本地部署包 /opt/deploy.tar.gz
3) 使用当前目录（如果已有项目文件）
```

#### 步骤 4：等待部署完成

脚本会自动：
- ✅ 安装 Docker 和 Docker Compose（如未安装）
- ✅ 自动检测 SSH Key 并选择克隆方式
- ✅ 从 GitHub 克隆代码到 `/opt/xinmeng-ai`
- ✅ 配置环境变量（自动生成密钥）
- ✅ 构建并启动所有容器
- ✅ 等待服务就绪

#### 步骤 5：访问应用

部署完成后，在浏览器访问：
```
http://您的服务器IP
```

默认管理员账号：
- 用户名: `admin`
- 密码: `xinmeng2024`

---

### 方法二：手动 GitHub 克隆

如果您想手动控制部署过程：

#### 1. 安装必要软件

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker --now

# 安装 Git
apt-get update && apt-get install -y git
```

#### 2. 配置 GitHub SSH Key

```bash
# 生成 SSH Key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到 GitHub（如上所述）
cat ~/.ssh/id_ed25519.pub
```

#### 3. 克隆代码

```bash
cd /opt
git clone git@github.com:a634802209/xinmeng.git xinmeng-ai
cd xinmeng-ai
```

#### 4. 配置环境变量

```bash
cp .env.example .env
nano .env
```

编辑 `.env` 文件，配置必要的环境变量。

#### 5. 启动服务

```bash
docker compose up -d --build
```

---

## 🌐 域名与 HTTPS

### 1. 配置域名

1. 在您的域名服务商处添加 DNS 解析：
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
cd /opt/xinmeng-ai
docker compose restart xinmeng-ai-frontend
```

### 3. 申请免费 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d 您的域名.com -d www.您的域名.com
```

### 4. 更新环境变量

```bash
# 修改 .env 文件
nano /opt/xinmeng-ai/.env
# FRONTEND_URL=https://您的域名.com

# 重启后端
docker compose restart xinmeng-ai-backend
```

---

## 🔄 后续维护

### 查看服务状态

```bash
cd /opt/xinmeng-ai

# 查看容器状态
docker compose ps

# 查看所有日志
docker compose logs -f

# 查看特定容器
docker compose logs -f xinmeng-ai-backend
```

### 更新代码

**重要：使用 SSH 克隆后，更新非常简单！**

```bash
cd /opt/xinmeng-ai

# 拉取最新代码（自动使用 SSH）
git pull

# 重新构建并启动
docker compose up -d --build
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

### 数据库备份

```bash
# 备份
cd /opt/xinmeng-ai
docker compose exec xinmeng-ai-mysql mysqldump -u xinmeng -p xinmeng > backup_$(date +%Y%m%d).sql

# 恢复
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

---

## ❓ 常见问题

### Q: GitHub SSH 克隆失败？

检查清单：
1. 是否已生成 SSH Key？
   ```bash
   ls -la ~/.ssh/
   ```

2. 是否已将公钥添加到 GitHub？
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # 检查是否在 GitHub Settings → SSH keys 中
   ```

3. 测试 SSH 连接：
   ```bash
   ssh -T git@github.com
   ```

4. 如果是私钥问题，检查权限：
   ```bash
   chmod 600 ~/.ssh/id_ed25519
   chmod 700 ~/.ssh
   ```

### Q: 部署后无法访问？

检查清单：
1. 防火墙是否开放 80 端口
2. 容器是否正常运行: `docker compose ps`
3. 查看日志: `docker compose logs`

### Q: 如何修改管理员密码？

```bash
docker compose exec xinmeng-ai-mysql mysql -u xinmeng -p xinmeng

# 在 MySQL 中执行（需要 bcrypt 哈希）
UPDATE admin_accounts SET password_hash='新的哈希值' WHERE username='admin';
```

### Q: 如何配置腾讯云 COS 对象存储？

在 `.env` 文件中添加：
```env
TENCENT_COS_SECRET_ID=您的SecretId
TENCENT_COS_SECRET_KEY=您的SecretKey
TENCENT_COS_BUCKET=您的Bucket名称
TENCENT_COS_REGION=ap-guangzhou
```

### Q: Docker 构建失败？

清理后重新构建：
```bash
cd /opt/xinmeng-ai
docker compose down
docker system prune -a
docker compose up -d --build
```

---

## 💡 提示

1. **推荐使用 SSH 克隆**：配置一次，后续更新只需执行 `git pull`
2. **定期备份数据**：尤其是数据库数据
3. **查看日志排查问题**：大多数问题可以通过日志定位
4. **保持系统更新**：定期更新 Docker 和系统包

---

**祝您部署顺利！🎊**
