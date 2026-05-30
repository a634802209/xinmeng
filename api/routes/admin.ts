import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminAuthMiddleware, requireSuperAdmin, type AdminAuthRequest } from '../middleware/adminAuth.js'

const router = Router()

router.get('/stats', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const [usersRows] = await db.query<any[]>('SELECT COUNT(*) as count FROM users')
  const totalUsers = usersRows[0].count

  const [membersRows] = await db.query<any[]>('SELECT COUNT(*) as count FROM users WHERE is_member = 1')
  const totalMembers = membersRows[0].count

  const [todayRechargeRows] = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND date(created_at) = date('now')"
  )
  const todayRecharge = todayRechargeRows[0].total

  const [totalRechargeRows] = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid'"
  )
  const totalRecharge = totalRechargeRows[0].total

  const [todayGenRows] = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM generate_tasks WHERE date(created_at) = date('now')"
  )
  const todayGenerations = todayGenRows[0].count

  const [totalGenRows] = await db.query<any[]>('SELECT COUNT(*) as count FROM generate_tasks')
  const totalGenerations = totalGenRows[0].count

  const [worksRows] = await db.query<any[]>('SELECT COUNT(*) as count FROM works')
  const totalWorks = worksRows[0].count

  const [pendingRows] = await db.query<any[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'")
  const pendingOrders = pendingRows[0].count

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

  const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as count FROM users ${whereClause}`, params)
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
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

  const [userRows] = await db.query<any[]>(
    `SELECT id, email, nickname, avatar, credits, is_member, member_expire_at, is_admin, is_banned, storage_used, storage_limit, created_at
     FROM users WHERE id = ?`,
    [userId]
  )
  const user = userRows[0]

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  const [genStatsRows] = await db.query<any[]>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today
     FROM generate_tasks WHERE user_id = ?`,
    [userId]
  )
  const generationStats = genStatsRows[0]

  const [orderRows] = await db.query<any[]>(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
    [userId]
  )

  res.json({
    success: true,
    data: {
      ...user,
      is_member: !!user.is_member,
      is_admin: !!user.is_admin,
      is_banned: !!user.is_banned,
      generationStats,
      orders: orderRows,
    },
  })
})

router.post('/users/:id/balance', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  const [userRows] = await db.query<any[]>('SELECT id, credits FROM users WHERE id = ?', [userId])
  const user = userRows[0]
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  const newCredits = Math.max(0, user.credits + amount)
  await db.execute('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'update_balance', 'user', userId, JSON.stringify({ amount, reason, oldCredits: user.credits, newCredits }),
  ])

  res.json({ success: true, data: { userId, newCredits } })
})

router.post('/users/:id/member', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  const [userRows] = await db.query<any[]>('SELECT id FROM users WHERE id = ?', [userId])
  if (!userRows[0]) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  await db.execute('UPDATE users SET is_member = ?, member_expire_at = ? WHERE id = ?', [
    isMember ? 1 : 0, expireAt || null, userId,
  ])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'update_member', 'user', userId, JSON.stringify({ isMember, expireAt }),
  ])

  res.json({ success: true })
})

router.post('/users/:id/ban', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  const [userRows] = await db.query<any[]>('SELECT id FROM users WHERE id = ?', [userId])
  if (!userRows[0]) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  await db.execute('UPDATE users SET is_banned = ? WHERE id = ?', [isBanned ? 1 : 0, userId])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, isBanned ? 'ban_user' : 'unban_user', 'user', userId, '',
  ])

  res.json({ success: true })
})

router.get('/orders', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as count FROM orders o ${whereClause}`, params)
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
    `SELECT o.*, u.email as user_email, u.nickname as user_nickname
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.get('/orders/stats', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const [todayRows] = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND date(created_at) = date('now')"
  )
  const todayAmount = todayRows[0].total

  const [weekRows] = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at >= datetime('now', '-7 days')"
  )
  const weekAmount = weekRows[0].total

  const [monthRows] = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at >= datetime('now', '-30 days')"
  )
  const monthAmount = monthRows[0].total

  const [statusRows] = await db.query<any[]>("SELECT status, COUNT(*) as count FROM orders GROUP BY status")

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

  const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as count FROM works w ${whereClause}`, params)
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
    `SELECT w.*, u.email as user_email, u.nickname as user_nickname
     FROM works w
     JOIN users u ON w.user_id = u.id
     ${whereClause}
     ORDER BY w.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.get('/works/stats', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const [todayRows] = await db.query<any[]>("SELECT COUNT(*) as count FROM works WHERE date(created_at) = date('now')")
  const todayCount = todayRows[0].count

  const [typeRows] = await db.query<any[]>("SELECT type, COUNT(*) as count FROM works GROUP BY type")
  const [statusRows] = await db.query<any[]>("SELECT status, COUNT(*) as count FROM works GROUP BY status")

  res.json({
    success: true,
    data: { todayCount, typeDistribution: typeRows, statusDistribution: statusRows },
  })
})

router.delete('/works/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const workId = parseInt(req.params.id)

  const [workRows] = await db.query<any[]>('SELECT id FROM works WHERE id = ?', [workId])
  if (!workRows[0]) {
    res.status(404).json({ success: false, error: 'Work not found' })
    return
  }

  await db.execute('DELETE FROM works WHERE id = ?', [workId])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'delete_work', 'work', workId, '',
  ])

  res.json({ success: true })
})

router.post('/works/batch-delete', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { ids } = req.body as { ids: number[] }

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(id))) {
    res.status(400).json({ success: false, error: 'ids must be an array of integers' })
    return
  }

  const placeholders = ids.map(() => '?').join(',')
  await db.execute(`DELETE FROM works WHERE id IN (${placeholders})`, ids)

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'batch_delete_works', 'work', 0, JSON.stringify({ ids }),
  ])

  res.json({ success: true, deleted: ids.length })
})

router.get('/settings', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const [rows] = await db.query<any[]>('SELECT key, value, updated_at FROM settings')

  const settings: Record<string, string> = {}
  rows.forEach((row: any) => { settings[row.key] = row.value })

  res.json({ success: true, data: settings })
})

router.put('/settings', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const updates = req.body as Record<string, string | number>

  for (const [key, value] of Object.entries(updates)) {
    await db.execute('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [String(value), key])
  }

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'update_settings', 'setting', 0, JSON.stringify(updates),
  ])

  res.json({ success: true })
})

router.get('/logs', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as count FROM admin_logs l ${whereClause}`, params)
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
    `SELECT l.*, a.username as admin_username
     FROM admin_logs l
     JOIN admin_accounts a ON l.admin_id = a.id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.post('/orders/create', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  await db.execute('INSERT INTO orders (user_id, order_no, amount, payment_method) VALUES (?, ?, ?, ?)', [
    userId, orderNo, amount, paymentMethod || 'wechat',
  ])

  res.json({ success: true, data: { orderNo } })
})

router.post('/orders/:orderNo/pay', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const orderNo = req.params.orderNo

  const [orderRows] = await db.query<any[]>('SELECT * FROM orders WHERE order_no = ?', [orderNo])
  const order = orderRows[0]

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' })
    return
  }

  if (order.status === 'paid') {
    res.status(400).json({ success: false, error: 'Order already paid' })
    return
  }

  await db.execute("UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE order_no = ?", [orderNo])

  const [userRows] = await db.query<any[]>('SELECT credits FROM users WHERE id = ?', [order.user_id])
  const user = userRows[0]
  if (user) {
    await db.execute('UPDATE users SET credits = ? WHERE id = ?', [user.credits + order.amount, order.user_id])
  }

  res.json({ success: true })
})

router.get('/generations', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
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

  const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as count FROM generate_tasks g ${whereClause}`, params)
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
    `SELECT g.*, u.email as user_email
     FROM generate_tasks g
     JOIN users u ON g.user_id = u.id
     ${whereClause}
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.get('/community/messages', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 50
  const offset = (page - 1) * pageSize

  const [countRows] = await db.query<any[]>('SELECT COUNT(*) as count FROM community_messages')
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
    `SELECT m.*, u.email as user_email, u.nickname as user_nickname
     FROM community_messages m
     JOIN users u ON m.user_id = u.id
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.delete('/community/messages/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  await db.execute('DELETE FROM community_messages WHERE id = ?', [id])
  res.json({ success: true })
})

router.get('/gallery/works', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const offset = (page - 1) * pageSize

  const [countRows] = await db.query<any[]>('SELECT COUNT(*) as count FROM gallery_works')
  const total = countRows[0].count

  const [rows] = await db.query<any[]>(
    `SELECT g.*, u.email as user_email
     FROM gallery_works g
     JOIN users u ON g.user_id = u.id
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  )

  res.json({
    success: true,
    data: {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

router.delete('/gallery/works/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  await db.execute('DELETE FROM gallery_works WHERE id = ?', [id])
  res.json({ success: true })
})

router.get('/system/status', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const [tableRows] = await db.query<any[]>("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()")
  const tableStats = []

  for (const t of tableRows) {
    const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as count FROM \`${t.table_name}\``)
    tableStats.push({ name: t.table_name, count: countRows[0].count })
  }

  res.json({
    success: true,
    data: {
      tableStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    },
  })
})

export default router
