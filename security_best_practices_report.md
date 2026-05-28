# XinMeng.ai 安全漏洞扫描报告

## 执行摘要

本次安全扫描覆盖了 XinMeng.ai 项目的前端（React + TypeScript + Vite）和后端（Express + better-sqlite3）代码。共发现 **7个安全问题**，其中 **1个高危**、**3个中危**、**3个低危**。主要风险集中在 JWT 密钥硬编码、CORS 配置过宽、敏感信息日志泄露、以及缺少速率限制等方面。SQL 注入风险整体较低（使用了参数化查询），但存在一处潜在的 SQL 拼接风险。

---

## 🔴 高危问题

### #1 JWT 密钥硬编码（认证绕过风险）

**文件**: `api/middleware/auth.ts:4`, `api/middleware/admin.ts:5`, `api/routes/auth.ts:98`

**问题描述**:
JWT 密钥使用了硬编码的 fallback 值：
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'xinmeng-ai-secret-key-2026'
```
如果环境变量 `JWT_SECRET` 未设置，攻击者可以直接使用这个公开已知的密钥伪造 JWT Token，完全绕过认证系统。

**影响**: 攻击者可以伪造任意用户的 Token，包括管理员身份，获得未授权访问。

**修复建议**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
```

---

## 🟡 中危问题

### #2 CORS 配置过宽（跨域攻击风险）

**文件**: `api/app.ts:37`

**问题描述**:
```typescript
app.use(cors())
```
启用了全局无限制 CORS，允许任何来源访问 API。在生产环境中，这可能导致 CSRF 攻击和敏感数据泄露。

**影响**: 恶意网站可以通过浏览器发起跨域请求，操作用户数据。

**修复建议**:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4173',
  credentials: true,
}))
```

### #3 验证码在日志和响应中泄露

**文件**: `api/routes/auth.ts:31-33`

**问题描述**:
```typescript
console.log(`[Verify Code] ${email}: ${code}`)
success(res, { message: 'Verification code sent', demoCode: code })
```
验证码被打印到服务器日志，并通过 API 响应直接返回给客户端（`demoCode`）。

**影响**: 任何能读取日志的人都可以获取验证码；响应中的 `demoCode` 使验证码机制形同虚设。

**修复建议**:
- 删除 `console.log` 中的验证码
- 删除响应中的 `demoCode` 字段
- 生产环境应接入真实的邮件/短信发送服务

### #4 缺少速率限制（DoS / 暴力破解风险）

**文件**: `api/app.ts`

**问题描述**:
项目没有配置任何速率限制中间件。攻击者可以：
- 无限次尝试验证码（6位数字只有100万种组合，可暴力破解）
- 无限次调用生成 API，耗尽服务器资源和用户余额
- 对登录接口进行暴力破解

**影响**: API 滥用、资源耗尽、验证码暴力破解。

**修复建议**:
安装并配置 `express-rate-limit`：
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
})
app.use('/api/', limiter)

// 对发送验证码更严格
const codeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3,
  message: { success: false, error: '请求过于频繁，请稍后再试' }
})
app.use('/api/auth/send-code', codeLimiter)
```

---

## 🟢 低危问题

### #5 缺少安全响应头

**文件**: `api/app.ts`

**问题描述**:
没有设置常见的安全响应头，如：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

**修复建议**:
```typescript
import helmet from 'helmet'
app.use(helmet())
```

### #6 前端 Token 存储在 localStorage（XSS 风险）

**文件**: `src/store/authStore.ts:24-28`, `src/lib/api.ts:4`

**问题描述**:
JWT Token 存储在 `localStorage` 中。如果网站存在 XSS 漏洞，恶意脚本可以直接读取 Token。

**影响**: XSS 攻击下 Token 被盗取。

**修复建议**:
- 使用 `httpOnly` Cookie 存储 Token（需要后端配合设置 Cookie）
- 或者使用内存存储（刷新页面需要重新登录）
- 当前方案在演示环境可接受，生产环境应改进

### #7 管理员批量删除作品的 SQL 拼接

**文件**: `api/routes/admin.ts:279-280`

**问题描述**:
```typescript
const placeholders = ids.map(() => '?').join(',')
db.prepare(`DELETE FROM works WHERE id IN (${placeholders})`).run(...ids)
```
虽然使用了参数化查询，但 `ids` 数组未验证元素类型。如果传入非数字值，可能导致类型转换问题或意外行为。

**修复建议**:
```typescript
if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => Number.isInteger(id))) {
  res.status(400).json({ success: false, error: 'ids must be an array of integers' })
  return
}
```

---

## ✅ 做得好的地方

1. **SQL 注入防护**: 几乎所有数据库查询都使用了 `better-sqlite3` 的参数化查询（`?` 占位符），有效防止 SQL 注入。

2. **输入验证**: 使用了 `zod` 对关键 API（登录、图片生成、视频生成）进行参数校验。

3. **认证中间件**: `authMiddleware` 和 `adminMiddleware` 分离，权限控制清晰。

4. **用户数据隔离**: 画布项目、作品等查询都带 `user_id` 过滤，防止横向越权。

5. **密码安全**: 使用邮箱验证码登录，避免了密码存储和管理的复杂性。

---

## 修复优先级建议

| 优先级 | 问题 | 预计修复时间 |
|--------|------|-------------|
| P0 | #1 JWT 密钥硬编码 | 5分钟 |
| P1 | #3 验证码泄露 | 5分钟 |
| P1 | #4 缺少速率限制 | 30分钟 |
| P2 | #2 CORS 配置过宽 | 10分钟 |
| P2 | #5 缺少安全响应头 | 10分钟 |
| P3 | #6 Token 存储方式 | 1小时 |
| P3 | #7 批量删除验证 | 10分钟 |
