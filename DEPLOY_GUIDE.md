# 自动部署指南（无需本地操作）

## 方案一：GitHub Actions 自动部署（推荐）

每次推送到 GitHub 的 main 分支，自动部署到腾讯云服务器。

### 1. 将代码上传到 GitHub

```bash
cd /workspace
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/xinmeng-ai.git
git push -u origin main
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库页面 → Settings → Secrets and variables → Actions → New repository secret，添加以下 3 个密钥：

| Secret 名称 | 值 | 获取方式 |
|------------|-----|---------|
| `SERVER_HOST` | `129.204.225.231` | 你的服务器 IP |
| `SERVER_USER` | `root` | SSH 用户名 |
| `SERVER_SSH_KEY` | SSH 私钥内容 | 见下方生成步骤 |

#### 生成 SSH 密钥对（在服务器上执行）

```bash
# 在服务器上生成密钥（如已有可跳过）
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# 将公钥添加到 authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# 查看私钥内容，复制到 GitHub Secrets
cat ~/.ssh/github_actions
```

将输出的私钥完整内容（包含 `-----BEGIN OPENSSH PRIVATE KEY-----` 到 `-----END OPENSSH PRIVATE KEY-----`）粘贴到 `SERVER_SSH_KEY`。

### 3. 完成！

以后每次执行 `git push` 到 main 分支，GitHub Actions 会自动：
1. 拉取最新代码
2. 构建前端
3. 上传到服务器
4. 重启 PM2 服务

也可以在 GitHub 仓库 → Actions → Deploy to Tencent Cloud → Run workflow 手动触发部署。

---

## 方案二：服务器端 Webhook 自动拉取

在服务器上配置一个 Webhook 服务，收到推送通知后自动拉取代码并部署。

### 服务器端配置

```bash
# 安装 webhook
apt-get update
apt-get install -y webhook

# 创建部署脚本
cat > /opt/deploy-webhook.sh << 'EOF'
#!/bin/bash
cd /opt/xinmeng-ai
git pull origin main
npm install
npm run build
pm2 reload ecosystem.config.js
EOF

chmod +x /opt/deploy-webhook.sh

# 创建 webhook 配置
cat > /etc/webhook.conf << 'EOF'
[
  {
    "id": "xinmeng-deploy",
    "execute-command": "/opt/deploy-webhook.sh",
    "command-working-directory": "/opt/xinmeng-ai",
    "response-message": "Deploying...",
    "trigger-rule": {
      "match": {
        "type": "payload-hmac-sha256",
        "secret": "你的Webhook密钥",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
EOF

# 启动 webhook 服务
webhook -hooks /etc/webhook.conf -port 9000 &
```

### GitHub 仓库配置

在 GitHub 仓库 → Settings → Webhooks → Add webhook：
- Payload URL: `http://129.204.225.231:9000/hooks/xinmeng-deploy`
- Content type: `application/json`
- Secret: 你设置的密钥
- 选择 `Just the push event`

---

## 方案三：Coding CI / 腾讯云 CloudBase

如果你使用腾讯云生态：

### Coding CI 配置

在项目根目录创建 `coding-ci.yml`：

```yaml
pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'npm ci'
        sh 'npm run build'
      }
    }
    stage('Deploy') {
      steps {
        sshPublisher(
          publishers: [
            sshPublisherDesc(
              configName: 'tencent-cloud',
              transfers: [
                sshTransfer(
                  sourceFiles: 'dist/**,api/**,package.json,ecosystem.config.js',
                  remoteDirectory: '/opt/xinmeng-ai',
                  execCommand: 'cd /opt/xinmeng-ai && npm install && pm2 reload ecosystem.config.js'
                )
              ]
            )
          ]
        )
      }
    }
  }
}
```

---

## 三种方案对比

| 方案 | 触发方式 | 配置复杂度 | 适合场景 |
|------|---------|-----------|---------|
| GitHub Actions | git push | 简单 | 最常用，推荐 |
| Webhook | git push | 中等 | 需要自定义部署逻辑 |
| Coding CI | git push | 中等 | 腾讯云生态用户 |

---

## 首次服务器初始化（只需一次）

无论你选择哪种自动部署方案，首次需要在服务器上执行：

```bash
# 1. 连接服务器
ssh root@129.204.225.231

# 2. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. 安装 PM2 和 tsx
npm install -g pm2 tsx

# 4. 创建项目目录
mkdir -p /opt/xinmeng-ai
cd /opt/xinmeng-ai

# 5. 如果是 GitHub Actions，首次手动克隆
git clone https://github.com/你的用户名/xinmeng-ai.git .

# 6. 安装依赖并启动
npm install
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 7. 安装 Nginx（可选）
apt-get install -y nginx
# 然后配置 /etc/nginx/conf.d/xinmeng-ai.conf（见 deploy-pm2.sh 中的配置）
nginx -t && systemctl reload nginx
```

完成后，后续所有更新都通过自动部署完成，无需再登录服务器！
