import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminAuthMiddleware, requireSuperAdmin, type AdminAuthRequest } from '../middleware/adminAuth.js'

const router = Router()

router.get('/stats', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const usersRows = await db.query<any[]>('SELECT COUNT(*) as count FROM users')
  const totalUsers = usersRows.length > 0 ? usersRows[0].count : 0

  const membersRows = await db.query<any[]>('SELECT COUNT(*) as count FROM users WHERE is_member = 1')
  const totalMembers = membersRows.length > 0 ? membersRows[0].count : 0

  const todayRechargeRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND DATE(created_at) = CURDATE()"
  )
  const todayRecharge = todayRechargeRows.length > 0 ? todayRechargeRows[0].total : 0

  const totalRechargeRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid'"
  )
  const totalRecharge = totalRechargeRows.length > 0 ? totalRechargeRows[0].total : 0

  const todayGenRows = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM generate_tasks WHERE DATE(created_at) = CURDATE()"
  )
  const todayGenerations = todayGenRows.length > 0 ? todayGenRows[0].count : 0

  const totalGenRows = await db.query<any[]>('SELECT COUNT(*) as count FROM generate_tasks')
  const totalGenerations = totalGenRows.length > 0 ? totalGenRows[0].count : 0

  const worksRows = await db.query<any[]>('SELECT COUNT(*) as count FROM works')
  const totalWorks = worksRows.length > 0 ? worksRows[0].count : 0

  const pendingRows = await db.query<any[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'")
  const pendingOrders = pendingRows.length > 0 ? pendingRows[0].count : 0

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalMembers,
      todayRecharge,
      totalRecharge,
      todayGenerations,
      totalGenerations,
      totalWorks,
      pendingOrders,
    },
  })
})

router.get('/users', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const search = req.query.search as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (search) {
    whereClause += ' AND (email LIKE ? OR nickname LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  const countRows = await db.query<any[]>(`SELECT COUNT(*) as count FROM users ${whereClause}`, params)
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT id, email, nickname, avatar, credits, is_member, member_expire_at, is_admin, is_banned, storage_used, storage_limit, created_at
     FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows.map((u) => ({
        ...u,
        is_member: !!u.is_member,
        is_admin: !!u.is_admin,
        is_banned: !!u.is_banned,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.get('/users/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }

  const userRows = await db.query<any[]>(
    `SELECT id, email, nickname, avatar, credits, is_member, member_expire_at, is_admin, is_banned, storage_used, storage_limit, created_at
     FROM users WHERE id = ?`,
    [userId]
  )

  const user = userRows.length > 0 ? userRows[0] : null

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  res.json({
    success: true,
    data: {
      ...user,
      is_member: !!user.is_member,
      is_admin: !!user.is_admin,
      is_banned: !!user.is_banned,
    },
  })
})

router.patch('/users/:id/ban', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }

  const { isBanned } = req.body

  await db.execute('UPDATE users SET is_banned = ? WHERE id = ?', [isBanned ? 1 : 0, userId])

  res.json({ success: true, message: isBanned ? 'User banned' : 'User unbanned' })
})

router.patch('/users/:id/credits', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }

  const { credits } = req.body
  if (credits === undefined || credits < 0) {
    res.status(400).json({ success: false, error: 'Invalid credits amount' })
    return
  }

  await db.execute('UPDATE users SET credits = ? WHERE id = ?', [credits, userId])

  res.json({ success: true, message: 'User credits updated' })
})

router.get('/orders', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const status = req.query.status as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (status) {
    whereClause += ' AND o.status = ?'
    params.push(status)
  }

  const countRows = await db.query<any[]>(
    `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
    params
  )
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT o.id, o.order_no, o.amount, o.status, o.payment_method, o.paid_at, o.created_at, u.email, u.nickname
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: { list: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
  })
})

router.patch('/orders/:id/status', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const orderId = parseInt(req.params.id)
  if (isNaN(orderId) || orderId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid order ID' })
    return
  }

  const { status } = req.body
  if (!status || !['pending', 'paid', 'cancelled', 'failed'].includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status' })
    return
  }

  await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId])

  res.json({ success: true, message: 'Order status updated' })
})

router.get('/orders/stats', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const todayRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND DATE(created_at) = CURDATE()"
  )
  const todayAmount = todayRows.length > 0 ? todayRows[0].total : 0

  const weekRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
  )
  const weekAmount = weekRows.length > 0 ? weekRows[0].total : 0

  const monthRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
  )
  const monthAmount = monthRows.length > 0 ? monthRows[0].total : 0

  const statusRows = await db.query<any[]>("SELECT status, COUNT(*) as count FROM orders GROUP BY status")

  res.json({
    success: true,
    data: { todayAmount, weekAmount, monthAmount, statusCounts: statusRows },
  })
})

router.get('/works', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const type = req.query.type as string || ''
  const status = req.query.status as string || ''
  const userId = req.query.userId as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (type) {
    whereClause += ' AND w.type = ?'
    params.push(type)
  }
  if (status) {
    whereClause += ' AND w.status = ?'
    params.push(status)
  }
  if (userId) {
    whereClause += ' AND w.user_id = ?'
    params.push(parseInt(userId))
  }

  const countRows = await db.query<any[]>(
    `SELECT COUNT(*) as count FROM works w ${whereClause}`,
    params
  )
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT w.id, w.type, w.prompt, w.result_url, w.thumbnail_url, w.status, w.is_public, w.likes_count, w.category, w.created_at, u.email, u.nickname
     FROM works w
     LEFT JOIN users u ON w.user_id = u.id
     ${whereClause}
     ORDER BY w.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: { list: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
  })
})

router.patch('/works/:id/public', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const workId = parseInt(req.params.id)
  if (isNaN(workId) || workId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid work ID' })
    return
  }

  const { isPublic } = req.body

  await db.execute('UPDATE works SET is_public = ? WHERE id = ?', [isPublic ? 1 : 0, workId])

  res.json({ success: true, message: isPublic ? 'Work made public' : 'Work made private' })
})

router.delete('/works/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const workId = parseInt(req.params.id)
  if (isNaN(workId) || workId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid work ID' })
    return
  }

  await db.execute('DELETE FROM works WHERE id = ?', [workId])

  res.json({ success: true, message: 'Work deleted' })
})

export default router
