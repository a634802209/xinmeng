import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { generateToken } from '../middleware/auth.js'

const router = Router()

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

router.post('/send-code', (req: Request, res: Response): void => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: 'Invalid email' })
    return
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO verify_codes (email, code, expires_at) VALUES (?, ?, ?)'
  )
  stmt.run(email, code, expiresAt)

  console.log(`[Verify Code] ${email}: ${code}`)

  res.json({
    success: true,
    message: 'Verification code sent',
    demoCode: code,
  })
})

router.post('/login', (req: Request, res: Response): void => {
  const { email, code } = req.body
  if (!email || !code) {
    res.status(400).json({ success: false, error: 'Email and code required' })
    return
  }

  const record = db.prepare('SELECT * FROM verify_codes WHERE email = ?').get(email) as
    | { code: string; expires_at: string }
    | undefined

  if (!record) {
    res.status(400).json({ success: false, error: 'Code not found' })
    return
  }

  if (record.code !== code) {
    res.status(400).json({ success: false, error: 'Invalid code' })
    return
  }

  if (new Date(record.expires_at) < new Date()) {
    res.status(400).json({ success: false, error: 'Code expired' })
    return
  }

  db.prepare('DELETE FROM verify_codes WHERE email = ?').run(email)

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | { id: number; email: string; nickname: string; avatar: string; credits: number; is_member: number; is_admin: number }
    | undefined

  if (!user) {
    const result = db
      .prepare('INSERT INTO users (email, nickname, avatar) VALUES (?, ?, ?)')
      .run(email, email.split('@')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as typeof user
  }

  const token = generateToken({ id: user!.id, email: user!.email, isAdmin: !!user!.is_admin })

  res.json({
    success: true,
    token,
    user: {
      id: user!.id,
      email: user!.email,
      nickname: user!.nickname,
      avatar: user!.avatar,
      credits: user!.credits,
      isMember: !!user!.is_member,
      isAdmin: !!user!.is_admin,
    },
  })
})

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.substring(7)
  try {
    const jwt = await import('jsonwebtoken')
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'xinmeng-ai-secret-key-2026') as {
      id: number
      email: string
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as
      | { id: number; email: string; nickname: string; avatar: string; credits: number; is_member: number; is_admin: number }
      | undefined

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        credits: user.credits,
        isMember: !!user.is_member,
        isAdmin: !!user.is_admin,
      },
    })
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
})

export default router
