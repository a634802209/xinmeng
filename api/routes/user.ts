import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/profile', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as
    | { id: number; email: string; nickname: string; avatar: string; credits: number; is_member: number }
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
    },
  })
})

router.get('/usage', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id

  const todayCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM generate_tasks WHERE user_id = ? AND date(created_at) = date('now')"
    )
    .get(userId) as { count: number }

  const monthCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM generate_tasks WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    )
    .get(userId) as { count: number }

  const totalQuota = 100000
  const usedQuota = (monthCount.count || 0) * 350
  const remainingQuota = Math.max(0, totalQuota - usedQuota)

  res.json({
    success: true,
    usage: {
      remainingQuota,
      totalQuota,
      todayUsage: (todayCount.count || 0) * 350,
      monthUsage: usedQuota,
      todayChange: 12,
      monthChange: -8,
    },
  })
})

export default router
