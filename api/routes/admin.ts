import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminAuthMiddleware, requireSuperAdmin, type AdminAuthRequest } from '../middleware/adminAuth.js'

const router = Router()

// ===== 1. 全站数据统计 =====
router.get('/stats', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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
router.get('/users', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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

// Get single user detail
router.get('/users/:id', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }

  const user = db.prepare(
    `SELECT id, email, nickname, avatar, credits, is_member, member_expire_at, is_admin, is_banned, storage_used, storage_limit, created_at
     FROM users WHERE id = ?`
  ).get(userId) as {
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
  } | undefined

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  // Get user's generation stats
  const generationStats = db.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today
     FROM generate_tasks WHERE user_id = ?`
  ).get(userId) as { total: number; completed: number; today: number }

  // Get user's orders
  const orders = db.prepare(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`
  ).all(userId) as Array<{
    id: number
    order_no: string
    amount: number
    status: string
    payment_method: string | null
    paid_at: string | null
    created_at: string
  }>

  res.json({
    success: true,
    data: {
      ...user,
      is_member: !!user.is_member,
      is_admin: !!user.is_admin,
      is_banned: !!user.is_banned,
      generationStats,
      orders,
    },
  })
})

router.post('/users/:id/balance', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }
  const { amount, reason } = req.body

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    res.status(400).json({ success: false, error: 'Amount must be a valid number' })
    return
  }

  const user = db.prepare('SELECT id, credits FROM users WHERE id = ?').get(userId) as { id: number; credits: number } | undefined
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  const newCredits = Math.max(0, user.credits + amount)
  db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(newCredits, userId)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'update_balance', 'user', userId, JSON.stringify({ amount, reason, oldCredits: user.credits, newCredits })
  )

  res.json({ success: true, data: { userId, newCredits } })
})

router.post('/users/:id/member', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }
  const { isMember, expireAt } = req.body
  if (typeof isMember !== 'boolean') {
    res.status(400).json({ success: false, error: 'isMember must be boolean' })
    return
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  db.prepare('UPDATE users SET is_member = ?, member_expire_at = ? WHERE id = ?').run(
    isMember ? 1 : 0, expireAt || null, userId
  )

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'update_member', 'user', userId, JSON.stringify({ isMember, expireAt })
  )

  res.json({ success: true })
})

router.post('/users/:id/ban', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const userId = parseInt(req.params.id)
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid user ID' })
    return
  }
  const { isBanned } = req.body
  if (typeof isBanned !== 'boolean') {
    res.status(400).json({ success: false, error: 'isBanned must be boolean' })
    return
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(isBanned ? 1 : 0, userId)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, isBanned ? 'ban_user' : 'unban_user', 'user', userId, ''
  )

  res.json({ success: true })
})

// ===== 3. 充值订单管理 =====
router.get('/orders', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const status = req.query.status as string || ''
  const userId = req.query.userId as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (status) {
    whereClause += ' AND o.status = ?'
    params.push(status)
  }
  if (userId) {
    whereClause += ' AND o.user_id = ?'
    params.push(parseInt(userId))
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

// Get order statistics
router.get('/orders/stats', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const todayAmount = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND date(created_at) = date('now')"
  ).get() as { total: number }).total

  const weekAmount = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at >= datetime('now', '-7 days')"
  ).get() as { total: number }).total

  const monthAmount = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at >= datetime('now', '-30 days')"
  ).get() as { total: number }).total

  const statusCounts = db.prepare(
    "SELECT status, COUNT(*) as count FROM orders GROUP BY status"
  ).all() as Array<{ status: string; count: number }>

  res.json({
    success: true,
    data: { todayAmount, weekAmount, monthAmount, statusCounts },
  })
})

// ===== 4. AI 生成记录管理 =====
router.get('/works', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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

// Get work statistics
router.get('/works/stats', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const todayCount = (db.prepare(
    "SELECT COUNT(*) as count FROM works WHERE date(created_at) = date('now')"
  ).get() as { count: number }).count

  const typeDistribution = db.prepare(
    "SELECT type, COUNT(*) as count FROM works GROUP BY type"
  ).all() as Array<{ type: string; count: number }>

  const statusDistribution = db.prepare(
    "SELECT status, COUNT(*) as count FROM works GROUP BY status"
  ).all() as Array<{ status: string; count: number }>

  res.json({
    success: true,
    data: { todayCount, typeDistribution, statusDistribution },
  })
})

router.delete('/works/:id', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const workId = parseInt(req.params.id)

  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId) as { id: number } | undefined
  if (!work) {
    res.status(404).json({ success: false, error: 'Work not found' })
    return
  }

  db.prepare('DELETE FROM works WHERE id = ?').run(workId)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'delete_work', 'work', workId, ''
  )

  res.json({ success: true })
})

router.post('/works/batch-delete', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const { ids } = req.body as { ids: number[] }

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(id))) {
    res.status(400).json({ success: false, error: 'ids must be an array of integers' })
    return
  }

  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM works WHERE id IN (${placeholders})`).run(...ids)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'batch_delete_works', 'work', 0, JSON.stringify({ ids })
  )

  res.json({ success: true, deleted: ids.length })
})

// ===== 5. 平台价格配置 =====
router.get('/settings', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all() as Array<{
    key: string
    value: string
    updated_at: string
  }>

  const settings: Record<string, string> = {}
  rows.forEach((row) => { settings[row.key] = row.value })

  res.json({ success: true, data: settings })
})

router.put('/settings', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const updates = req.body as Record<string, string | number>

  const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')

  for (const [key, value] of Object.entries(updates)) {
    stmt.run(String(value), key)
  }

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'update_settings', 'setting', 0, JSON.stringify(updates)
  )

  res.json({ success: true })
})

// ===== 6. 管理员日志 =====
router.get('/logs', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 50
  const action = req.query.action as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (action) {
    whereClause += ' AND l.action = ?'
    params.push(action)
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM admin_logs l ${whereClause}`).get(...params) as { count: number }).count

  const logs = db.prepare(
    `SELECT l.*, a.username as admin_username
     FROM admin_logs l
     JOIN admin_accounts a ON l.admin_id = a.id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    admin_id: number
    action: string
    target_type: string | null
    target_id: number
    detail: string | null
    created_at: string
    admin_username: string
  }>

  res.json({
    success: true,
    data: {
      list: logs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// ===== 7. 创建充值订单 =====
router.post('/orders/create', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const { userId, amount, paymentMethod } = req.body

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid userId' })
    return
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ success: false, error: 'Amount must be a positive number' })
    return
  }
  if (typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Payment method required' })
    return
  }

  const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`

  db.prepare('INSERT INTO orders (user_id, order_no, amount, payment_method) VALUES (?, ?, ?, ?)').run(
    userId, orderNo, amount, paymentMethod || 'wechat'
  )

  res.json({ success: true, data: { orderNo } })
})

router.post('/orders/:orderNo/pay', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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

  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(order.user_id) as { credits: number } | undefined
  if (user) {
    db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(user.credits + order.amount, order.user_id)
  }

  res.json({ success: true })
})

// ===== 8. 生成任务管理 =====
router.get('/generations', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const status = req.query.status as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (status) {
    whereClause += ' AND g.status = ?'
    params.push(status)
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM generate_tasks g ${whereClause}`).get(...params) as { count: number }).count

  const generations = db.prepare(
    `SELECT g.*, u.email as user_email
     FROM generate_tasks g
     JOIN users u ON g.user_id = u.id
     ${whereClause}
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    user_id: number
    type: string
    prompt: string
    status: string
    result_url: string | null
    credits_used: number
    created_at: string
    completed_at: string | null
    user_email: string
  }>

  res.json({
    success: true,
    data: {
      list: generations,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// ===== 9. 社区聊天管理 =====
router.get('/community/messages', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 50
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM community_messages').get() as { count: number }).count

  const messages = db.prepare(
    `SELECT m.*, u.email as user_email, u.nickname as user_nickname
     FROM community_messages m
     JOIN users u ON m.user_id = u.id
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset) as Array<{
    id: number
    user_id: number
    content: string
    created_at: string
    user_email: string
    user_nickname: string | null
  }>

  res.json({
    success: true,
    data: {
      list: messages,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.delete('/community/messages/:id', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const id = parseInt(req.params.id)
  db.prepare('DELETE FROM community_messages WHERE id = ?').run(id)
  res.json({ success: true })
})

// ===== 10. 画廊作品管理 =====
router.get('/gallery/works', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM gallery_works').get() as { count: number }).count

  const works = db.prepare(
    `SELECT g.*, u.email as user_email
     FROM gallery_works g
     JOIN users u ON g.user_id = u.id
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset) as Array<{
    id: number
    user_id: number
    title: string
    description: string | null
    media_url: string
    media_type: string
    likes: number
    views: number
    created_at: string
    user_email: string
  }>

  res.json({
    success: true,
    data: {
      list: works,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.delete('/gallery/works/:id', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const id = parseInt(req.params.id)
  db.prepare('DELETE FROM gallery_works WHERE id = ?').run(id)
  res.json({ success: true })
})

// ===== 11. 系统监控 =====
router.get('/system/status', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const dbSize = (db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number }).size

  const tableCounts = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all() as Array<{ name: string }>

  const tableStats = tableCounts.map((t) => {
    const count = (db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as { count: number }).count
    return { name: t.name, count }
  })

  res.json({
    success: true,
    data: {
      dbSize,
      tableStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    },
  })
})

export default router
