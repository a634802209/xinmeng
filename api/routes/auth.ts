import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateToken, authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getUserByEmail, createUser } from '../services/userService.js'
import { success, error } from '../utils/response.js'
import { validate, loginSchema } from '../utils/validator.js'
import { trackLoginAttempt } from '../middleware/security.js'
import db from '../db.js'

const router = Router()

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

router.post('/send-code', (req: Request, res: Response): void => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error(res, 'Invalid email', 400)
    return
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO verify_codes (email, code, expires_at) VALUES (?, ?, ?)'
  )
  stmt.run(email, code, expiresAt)

  success(res, { message: 'Verification code sent' })
})

router.post('/login', (req: Request, res: Response): void => {
  const clientIp = getClientIp(req)
  const fingerprint = getFingerprint(req)

  const validation = validate(loginSchema, req.body)
  if (!validation.success) {
    trackLoginAttempt(clientIp, req.body?.email || null, fingerprint, false)
    error(res, validation.error, 400)
    return
  }

  const { email, code } = validation.data

  const record = db.prepare('SELECT * FROM verify_codes WHERE email = ?').get(email) as
    | { code: string; expires_at: string }
    | undefined

  if (!record) {
    trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Code not found', 400)
    return
  }

  if (record.code !== code) {
    trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Invalid code', 400)
    return
  }

  if (new Date(record.expires_at) < new Date()) {
    trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Code expired', 400)
    return
  }

  db.prepare('DELETE FROM verify_codes WHERE email = ?').run(email)

  let user = getUserByEmail(email)

  if (!user) {
    user = createUser(email, email.split('@')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`)
  }

  if (user.isBanned) {
    trackLoginAttempt(clientIp, email, fingerprint, false)
    error(res, 'Account is banned', 403)
    return
  }

  trackLoginAttempt(clientIp, email, fingerprint, true)

  const token = generateToken({ id: user.id, email: user.email, nickname: user.nickname, avatar: user.avatar, isAdmin: user.isAdmin })

  // 低危修复：邮箱脱敏
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

router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = getUserById(req.user!.id)

  if (!user) {
    error(res, 'User not found', 404)
    return
  }

  // 低危修复：邮箱脱敏
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

function getUserById(userId: number) {
  return getUserByEmail(
    (db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined)?.email || ''
  )
}

// 低危修复：邮箱脱敏函数 a***@example.com
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `*@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

export default router
