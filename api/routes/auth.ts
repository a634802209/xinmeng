import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateToken, authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getUserByEmail, createUser } from '../services/userService.js'
import { success, error } from '../utils/response.js'
import { validate, loginSchema } from '../utils/validator.js'
import { trackLoginAttempt } from '../middleware/security.js'
import { sendVerificationCode, sendPasswordReset, isMailConfigured } from '../services/mailService.js'
import db from '../db.js'
import crypto from 'crypto'

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

router.post('/send-code', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error(res, 'Invalid email', 400)
    return
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await db.execute(
    'INSERT INTO verify_codes (email, code, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE code = ?, expires_at = ?',
    [email, code, expiresAt, code, expiresAt]
  )

  if (isMailConfigured()) {
    try {
      await sendVerificationCode(email, code)
      success(res, { message: 'Verification code sent' })
    } catch (err: any) {
      console.error('[Mail] Failed to send verification code:', err)
      error(res, 'Failed to send email', 500)
    }
  } else {
    console.warn('[Mail] SMTP not configured, returning demo code')
    success(res, { message: 'Verification code sent', demoCode: code })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const clientIp = getClientIp(req)
  const fingerprint = getFingerprint(req)

  const validation = validate(loginSchema, req.body)
  if (!validation.success) {
    await trackLoginAttempt(clientIp, req.body?.email || null, fingerprint, false)
    error(res, validation.error, 400)
    return
  }

  const { email, code } = validation.data

  const rows = await db.query<any[]>('SELECT * FROM verify_codes WHERE email = ?', [email])
  const record = rows[0]

  if (!record) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Code not found', 400)
    return
  }

  if (record.code !== code) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Invalid code', 400)
    return
  }

  if (new Date(record.expires_at) < new Date()) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Code expired', 400)
    return
  }

  await db.execute('DELETE FROM verify_codes WHERE email = ?', [email])

  let user = await getUserByEmail(email)

  if (!user) {
    user = await createUser(email, email.split('@')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`)
  }

  if (user.isBanned) {
    await trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Account is banned', 403)
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
  })
})

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getUserById(req.user!.id)

  if (!user) {
    error(res, 'User not found', 404)
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
  })
})

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error(res, 'Invalid email', 400)
    return
  }

  const user = await getUserByEmail(email)
  if (!user) {
    error(res, 'Email not registered', 404)
    return
  }

  if (!isMailConfigured()) {
    error(res, 'Email service not configured', 503)
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
    success(res, { message: 'Password reset email sent' })
  } catch (err: any) {
    console.error('[Mail] Failed to send password reset:', err)
    error(res, 'Failed to send email', 500)
  }
})

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body
  if (!token || !newPassword || newPassword.length < 6) {
    error(res, 'Invalid token or password too short', 400)
    return
  }

  const rows = await db.query<any[]>('SELECT * FROM password_resets WHERE token = ?', [token])
  const record = rows[0]

  if (!record) {
    error(res, 'Invalid or expired token', 400)
    return
  }

  if (new Date(record.expires_at) < new Date()) {
    error(res, 'Token expired', 400)
    return
  }

  await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [newPassword, record.email])
  await db.execute('DELETE FROM password_resets WHERE token = ?', [token])

  success(res, { message: 'Password reset successfully' })
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
