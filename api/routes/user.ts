import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, type AuthRequest, generateToken } from '../middleware/auth.js'
import { getUserById, getUsageStats, getUserByEmail, createUser } from '../services/userService.js'
import { success, error, badRequest } from '../utils/response.js'
import { getVerifyCode, delVerifyCode } from '../utils/redis.js'
import { loginRateLimit } from '../middleware/rateLimit.js'
import db from '../db.js'
import jwt from 'jsonwebtoken'

const router = Router()

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `*@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

router.post('/login', loginRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      badRequest(res, '邮箱和验证码不能为空')
      return
    }

    const realCode = await getVerifyCode(email)
    if (!realCode || realCode !== code) {
      badRequest(res, '验证码错误或已过期')
      return
    }

    await delVerifyCode(email)

    let user = await getUserByEmail(email)
    let userId: number

    if (!user) {
      const defaultNick = `用户${email.slice(0, 6)}`
      const result = await db.execute(
        'INSERT INTO users (email, nickname, avatar, credits, created_at) VALUES (?, ?, ?, ?, NOW())',
        [email, defaultNick, `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`, 10000]
      )
      userId = Number(result.insertId)
      user = await getUserById(userId)!
    } else {
      userId = user.id
    }

    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )

    const [userInfoRows] = await db.query<any[]>('SELECT id, email, nickname, avatar, credits as remain_power, is_member as isMember FROM users WHERE id = ?', [userId])
    const userInfo = userInfoRows[0]

    success(res, {
      token,
      userInfo: {
        id: userInfo.id,
        email: userInfo.email,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
        remain_power: userInfo.remain_power,
        isMember: !!userInfo.isMember,
      },
    }, '登录成功')
  } catch (err: any) {
    console.error('[User] Login error:', err)
    error(res, '服务器异常，请重试', 500, 500)
  }
})

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getUserById(req.user!.id)

  if (!user) {
    error(res, 'User not found', 404)
    return
  }

  success(res, {
    user: {
      id: user.id,
      email: maskEmail(user.email),
      nickname: user.nickname,
      avatar: user.avatar,
      credits: user.credits,
      isMember: user.isMember,
    },
  })
})

router.get('/usage', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const usage = await getUsageStats(req.user!.id)
  success(res, { usage })
})

export default router
