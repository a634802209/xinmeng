import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取余额明细列表
router.get('/records', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const type = req.query.type as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE user_id = ?'
  const params: (string | number)[] = [userId]

  if (type) {
    whereClause += ' AND type = ?'
    params.push(type)
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM credit_records ${whereClause}`).get(...params) as { count: number }).count

  const records = db.prepare(
    `SELECT id, type, amount, balance, description, created_at
     FROM credit_records
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    type: string
    amount: number
    balance: number
    description: string | null
    created_at: string
  }>

  res.json({
    success: true,
    data: {
      list: records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// 获取余额统计
router.get('/stats', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id

  const totalRecharge = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM credit_records WHERE user_id = ? AND type = 'recharge'"
  ).get(userId) as { total: number }).total

  const totalConsume = (db.prepare(
    "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM credit_records WHERE user_id = ? AND type = 'consume'"
  ).get(userId) as { total: number }).total

  const currentBalance = (db.prepare(
    'SELECT credits FROM users WHERE id = ?'
  ).get(userId) as { credits: number } | undefined)?.credits || 0

  res.json({
    success: true,
    data: {
      totalRecharge,
      totalConsume,
      currentBalance,
    },
  })
})

export default router
