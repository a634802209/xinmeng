import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateToken, authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getUserByEmail, createUser } from '../services/userService.js'
import { success, error, badRequest, notFound, forbidden } from '../utils/response.js'
import { validate, loginSchema } from '../utils/validator.js'
import { trackLoginAttempt } from '../middleware/security.js'
import { sendVerificationCode, sendPasswordReset, isMailConfigured } from '../services/mailService.js'
import db from '../db.js'
import crypto from 'crypto'
import { setVerifyCode, getVerifyCode, delVerifyCode } from '../utils/redis.js'
import { sendCodeRateLimit, loginRateLimit } from '../middleware/rateLimit.js'

const router = Router()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4173'

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string') return realIp
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function getFingerprint(req: Request): string {
  const ua = req.headers['user-agent'] || ''
  const accept = req.headers['accept'] || ''
  const lang = req.headers['accept-language'] || ''
  const encoding = req.headers['accept-encoding'] || ''
  const raw = `${ua}|${accept}|${lang}|${encoding}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `fp_${Math.abs(hash).toString(36)}`
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

router.post('/send-code', sendCodeRateLimit, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest(res, '邮箱格式不正确')
    return
  }

  const code = generateCode()
  
  // 存储到Redis，有效期5分钟
  await setVerifyCode(email, code, 300)

  if (isMailConfigured()) {
    try {
      await sendVerificationCode(email, code)
      success(res, { message: '验证码已发送' }, '发送成功')
    } catch (err: any) {
      console.error('[Mail] Failed to send verification code:', err)
      error(res, '邮件发送失败', 500, 500)
    }
  } else {
    console.warn('[Mail] SMTP not configured, returning demo code')
    success(res, { message: '验证码已发送', demoCode: code }, '发送成功')
  }
})

router.post('/login', loginRateLimit, async (req: Request, res: Response): Promise<void> => {
  const clientIp = getClientIp(req)
  const fingerprint = getFingerprint(req)

  const validation = validate(loginSchema, req.body)
  if (!validation.success) {
    await trackLoginAttempt(clientIp, req.body?.email || null, fingerprint, false)
    badRequest(res, validation.error)
    return
  }

  const { email, code } = validation.data

  // 从Redis获取验证码
  const storedCode = await getVerifyCode(email)

  if (!storedCode) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, '验证码不存在或已过期', 400, 400)
    return
  }

  if (storedCode !== code) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, '验证码错误', 400, 400)
    return
  }

  // 删除已使用的验证码
  await delVerifyCode(email)

  let user = await getUserByEmail(email)

  if (!user) {
    user = await createUser(email, email.split('@')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`)
  }

  if (user.isBanned) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    forbidden(res, '账户已被禁用')
    return
  }

  await trackLoginAttempt(clientIp, email, fingerprint, true)

  const token = generateToken({ id: user.id, email: user.email, nickname: user.nickname, avatar: user.avatar, isAdmin: user.isAdmin })

  const maskedEmail = maskEmail(user.email)

  success(res, {
    token,
    user: {
      id: user.id,
      email: maskedEmail,
      nickname: user.nickname,
      avatar: user.avatar,
      credits: user.credits,
      isMember: user.isMember,
      isAdmin: user.isAdmin,
    },
  }, '登录成功')
})

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getUserById(req.user!.id)

  if (!user) {
    notFound(res, '用户不存在')
    return
  }

  const maskedEmail = maskEmail(user.email)

  success(res, {
    user: {
      id: user.id,
      email: maskedEmail,
      nickname: user.nickname,
      avatar: user.avatar,
      credits: user.credits,
      isMember: user.isMember,
      isAdmin: user.isAdmin,
    },
  }, '获取成功')
})

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest(res, '邮箱格式不正确')
    return
  }

  const user = await getUserByEmail(email)
  if (!user) {
    notFound(res, '该邮箱未注册')
    return
  }

  if (!isMailConfigured()) {
    error(res, '邮件服务未配置', 503, 503)
    return
  }

  const resetToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  await db.execute(
    'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?',
    [email, resetToken, expiresAt, resetToken, expiresAt]
  )

  const resetUrl = `${FRONTEND_URL}/reset-password`

  try {
    await sendPasswordReset(email, resetToken, resetUrl)
    success(res, { message: '密码重置邮件已发送' }, '发送成功')
  } catch (err: any) {
    console.error('[Mail] Failed to send password reset:', err)
    error(res, '邮件发送失败', 500, 500)
  }
})

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body
  if (!token || !newPassword || newPassword.length < 6) {
    badRequest(res, 'Token无效或密码过短')
    return
  }

  const rows = await db.query<any[]>('SELECT * FROM password_resets WHERE token = ?', [token])
  const record = rows[0]

  if (!record) {
    badRequest(res, 'Token无效或已过期')
    return
  }

  if (new Date(record.expires_at) < new Date()) {
    badRequest(res, 'Token已过期')
    return
  }

  await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [newPassword, record.email])
  await db.execute('DELETE FROM password_resets WHERE token = ?', [token])

  success(res, { message: '密码重置成功' }, '重置成功')
})

async function getUserById(userId: number) {
  const rows = await db.query<any[]>('SELECT email FROM users WHERE id = ?', [userId])
  const email = rows[0]?.email
  if (!email) return undefined
  return await getUserByEmail(email)
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `*@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

export default router
