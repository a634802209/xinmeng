import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminMiddleware, type AdminRequest } from '../middleware/admin.js'

const router = Router()

// ===== 1. 全站数据统计 =====
router.get('/stats', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count
  const totalMembers = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_member = 1').get() as { count: number }).count
  const todayRecharge = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND date(created_at) = date('now')"
  ).get() as { total: number }).total
  const totalRecharge = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid'"
  ).get() as { total: number }).total
  const todayGenerations = (db.prepare(
    "SELECT COUNT(*) as count FROM generate_tasks WHERE date(created_at) = date('now')"
  ).get() as { count: number }).count
  const totalGenerations = (db.prepare('SELECT COUNT(*) as count FROM generate_tasks').get() as { count: number }).count
  const totalWorks = (db.prepare('SELECT COUNT(*) as count FROM works').get() as { count: number }).count
  const pendingOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as { count: number }).count

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

// ===== 2. 用户管理 =====
// 分页查看所有用户
router.get('/users', adminMiddleware, (req: AdminRequest, res: Response): void => {
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

  const total = (db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params) as { count: number }).count

  const users = db.prepare(
    `SELECT id, email, nickname, avatar, credits, is_member, member_expire_at, is_admin, is_banned, storage_used, storage_limit, created_at
     FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    email: string
    nickname: string | null
    avatar: string | null
    credits: number
    is_member: number
    member_expire_at: string | null
    is_admin: number
    is_banned: number
    storage_used: number
    storage_limit: number
    created_at: string
  }>

  res.json({
    success: true,
    data: {
      list: users.map((u) => ({
        ...u,
        is_member: !!u.is_member,
        is_admin: !!u.is_admin,
        is_banned: !!u.is_banned,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// 修改用户余额
router.post('/users/:id/balance', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  const { amount, reason } = req.body

  if (typeof amount !== 'number') {
    res.status(400).json({ success: false, error: 'Amount must be a number' })
    return
  }

  const user = db.prepare('SELECT id, credits FROM users WHERE id = ?').get(userId) as { id: number; credits: number } | undefined
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  const newCredits = Math.max(0, user.credits + amount)
  db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(newCredits, userId)

  // Log admin action
  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'update_balance', 'user', userId, JSON.stringify({ amount, reason, oldCredits: user.credits, newCredits })
  )

  res.json({ success: true, data: { userId, newCredits } })
})

// 开通/关闭会员
router.post('/users/:id/member', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  const { isMember, expireAt } = req.body

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  db.prepare('UPDATE users SET is_member = ?, member_expire_at = ? WHERE id = ?').run(
    isMember ? 1 : 0, expireAt || null, userId
  )

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'update_member', 'user', userId, JSON.stringify({ isMember, expireAt })
  )

  res.json({ success: true })
})

// 禁用/启用用户
router.post('/users/:id/ban', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  const { isBanned } = req.body

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(isBanned ? 1 : 0, userId)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, isBanned ? 'ban_user' : 'unban_user', 'user', userId, ''
  )

  res.json({ success: true })
})

// ===== 3. 充值订单管理 =====
router.get('/orders', adminMiddleware, (req: AdminRequest, res: Response): void => {
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

  const total = (db.prepare(`SELECT COUNT(*) as count FROM orders o ${whereClause}`).get(...params) as { count: number }).count

  const orders = db.prepare(
    `SELECT o.*, u.email as user_email, u.nickname as user_nickname
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    user_id: number
    order_no: string
    amount: number
    status: string
    payment_method: string | null
    paid_at: string | null
    created_at: string
    user_email: string
    user_nickname: string | null
  }>

  res.json({
    success: true,
    data: {
      list: orders,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// ===== 4. AI 生成记录管理 =====
router.get('/works', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const type = req.query.type as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (type) {
    whereClause += ' AND w.type = ?'
    params.push(type)
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM works w ${whereClause}`).get(...params) as { count: number }).count

  const works = db.prepare(
    `SELECT w.*, u.email as user_email, u.nickname as user_nickname
     FROM works w
     JOIN users u ON w.user_id = u.id
     ${whereClause}
     ORDER BY w.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    user_id: number
    type: string
    prompt: string
    result_url: string | null
    thumbnail_url: string | null
    status: string
    created_at: string
    user_email: string
    user_nickname: string | null
  }>

  res.json({
    success: true,
    data: {
      list: works,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// 删除作品
router.delete('/works/:id', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const workId = parseInt(req.params.id)

  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId) as { id: number } | undefined
  if (!work) {
    res.status(404).json({ success: false, error: 'Work not found' })
    return
  }

  db.prepare('DELETE FROM works WHERE id = ?').run(workId)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'delete_work', 'work', workId, ''
  )

  res.json({ success: true })
})

// 批量删除作品
router.post('/works/batch-delete', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const { ids } = req.body as { ids: number[] }

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: 'ids array required' })
    return
  }

  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM works WHERE id IN (${placeholders})`).run(...ids)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'batch_delete_works', 'work', 0, JSON.stringify({ ids })
  )

  res.json({ success: true, deleted: ids.length })
})

// ===== 5. 平台价格配置 =====
router.get('/settings', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all() as Array<{
    key: string
    value: string
    updated_at: string
  }>

  const settings: Record<string, string> = {}
  rows.forEach((row) => { settings[row.key] = row.value })

  res.json({ success: true, data: settings })
})

router.put('/settings', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const updates = req.body as Record<string, string | number>

  const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')

  for (const [key, value] of Object.entries(updates)) {
    stmt.run(String(value), key)
  }

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'update_settings', 'setting', 0, JSON.stringify(updates)
  )

  res.json({ success: true })
})

// ===== 6. 管理员日志 =====
router.get('/logs', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 50
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM admin_logs').get() as { count: number }).count

  const logs = db.prepare(
    `SELECT l.*, u.email as admin_email
     FROM admin_logs l
     JOIN users u ON l.admin_id = u.id
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset) as Array<{
    id: number
    admin_id: number
    action: string
    target_type: string | null
    target_id: number
    detail: string | null
    created_at: string
    admin_email: string
  }>

  res.json({
    success: true,
    data: {
      list: logs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// ===== 7. 创建充值订单（用户端调用） =====
router.post('/orders/create', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const { userId, amount, paymentMethod } = req.body

  if (!userId || !amount || amount <= 0) {
    res.status(400).json({ success: false, error: 'Invalid params' })
    return
  }

  const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`

  db.prepare('INSERT INTO orders (user_id, order_no, amount, payment_method) VALUES (?, ?, ?, ?)').run(
    userId, orderNo, amount, paymentMethod || 'wechat'
  )

  res.json({ success: true, data: { orderNo } })
})

// 模拟支付回调（演示用）
router.post('/orders/:orderNo/pay', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const orderNo = req.params.orderNo

  const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo) as
    | { id: number; user_id: number; amount: number; status: string }
    | undefined

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' })
    return
  }

  if (order.status === 'paid') {
    res.status(400).json({ success: false, error: 'Order already paid' })
    return
  }

  db.prepare("UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE order_no = ?").run(orderNo)

  // Add credits to user
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(order.user_id) as { credits: number } | undefined
  if (user) {
    db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(user.credits + order.amount, order.user_id)
  }

  res.json({ success: true })
})

export default router
