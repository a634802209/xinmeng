import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminAuthMiddleware, type AdminAuthRequest } from '../middleware/adminAuth.js'

const router = Router()

router.get('/ip-blacklist', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const offset = (page - 1) * pageSize

  const countRows = await db.query<any[]>('SELECT COUNT(*) as count FROM ip_blacklist')
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT b.*, u.email as banned_by_email
     FROM ip_blacklist b
     LEFT JOIN users u ON b.banned_by = u.id
     ORDER BY b.created_at DESC
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

router.post('/ip-blacklist', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { ip, reason, expiresAt } = req.body

  if (typeof ip !== 'string' || !ip.trim()) {
    res.status(400).json({ success: false, error: 'IP address is required' })
    return
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F:]+)$/
  if (!ipRegex.test(ip.trim())) {
    res.status(400).json({ success: false, error: 'Invalid IP address format' })
    return
  }

  try {
    await db.execute(
      `INSERT INTO ip_blacklist (ip, reason, banned_by, expires_at) VALUES (?, ?, ?, ?)`,
      [ip.trim(), reason || null, req.adminUser!.id, expiresAt || null]
    )

    await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
      req.adminUser!.id, 'blacklist_ip', 'ip', 0, JSON.stringify({ ip, reason, expiresAt }),
    ])

    res.json({ success: true, message: 'IP blacklisted successfully' })
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'IP already in blacklist' })
      return
    }
    throw err
  }
})

router.delete('/ip-blacklist/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid ID' })
    return
  }

  const rows = await db.query<any[]>('SELECT ip FROM ip_blacklist WHERE id = ?', [id])
  const item = rows[0]
  if (!item) {
    res.status(404).json({ success: false, error: 'IP blacklist entry not found' })
    return
  }

  await db.execute('DELETE FROM ip_blacklist WHERE id = ?', [id])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'unblacklist_ip', 'ip', 0, JSON.stringify({ ip: item.ip }),
  ])

  res.json({ success: true })
})

router.get('/device-blacklist', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const offset = (page - 1) * pageSize

  const countRows = await db.query<any[]>('SELECT COUNT(*) as count FROM device_blacklist')
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT b.*, a.username as banned_by_username
     FROM device_blacklist b
     LEFT JOIN admin_accounts a ON b.banned_by = a.id
     ORDER BY b.created_at DESC
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

router.post('/device-blacklist', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { fingerprint, reason, expiresAt } = req.body

  if (typeof fingerprint !== 'string' || !fingerprint.trim()) {
    res.status(400).json({ success: false, error: 'Device fingerprint is required' })
    return
  }

  try {
    await db.execute(
      `INSERT INTO device_blacklist (fingerprint, reason, banned_by, expires_at) VALUES (?, ?, ?, ?)`,
      [fingerprint.trim(), reason || null, req.adminUser!.id, expiresAt || null]
    )

    await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
      req.adminUser!.id, 'blacklist_device', 'device', 0, JSON.stringify({ fingerprint, reason, expiresAt }),
    ])

    res.json({ success: true, message: 'Device blacklisted successfully' })
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Device already in blacklist' })
      return
    }
    throw err
  }
})

router.delete('/device-blacklist/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid ID' })
    return
  }

  const rows = await db.query<any[]>('SELECT fingerprint FROM device_blacklist WHERE id = ?', [id])
  const item = rows[0]
  if (!item) {
    res.status(404).json({ success: false, error: 'Device blacklist entry not found' })
    return
  }

  await db.execute('DELETE FROM device_blacklist WHERE id = ?', [id])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'unblacklist_device', 'device', 0, JSON.stringify({ fingerprint: item.fingerprint }),
  ])

  res.json({ success: true })
})

router.get('/audit-logs', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 50
  const ip = req.query.ip as string || ''
  const userId = req.query.userId as string || ''
  const isBlocked = req.query.isBlocked as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (ip) {
    whereClause += ' AND ip = ?'
    params.push(ip)
  }
  if (userId) {
    whereClause += ' AND user_id = ?'
    params.push(parseInt(userId))
  }
  if (isBlocked === '1') {
    whereClause += ' AND is_blocked = 1'
  }

  const countRows = await db.query<any[]>(`SELECT COUNT(*) as count FROM access_audit_logs ${whereClause}`, params)
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT a.*, u.email as user_email
     FROM access_audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
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

router.get('/login-attempts', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 50
  const ip = req.query.ip as string || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (ip) {
    whereClause += ' AND ip = ?'
    params.push(ip)
  }

  const countRows = await db.query<any[]>(`SELECT COUNT(*) as count FROM login_attempts ${whereClause}`, params)
  const total = countRows.length > 0 ? countRows[0].count : 0

  const rows = await db.query<any[]>(
    `SELECT * FROM login_attempts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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

router.get('/stats', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const ipRows = await db.query<any[]>('SELECT COUNT(*) as count FROM ip_blacklist')
  const ipBlacklistCount = ipRows.length > 0 ? ipRows[0].count : 0

  const deviceRows = await db.query<any[]>('SELECT COUNT(*) as count FROM device_blacklist')
  const deviceBlacklistCount = deviceRows.length > 0 ? deviceRows[0].count : 0

  const blockedRows = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM access_audit_logs WHERE is_blocked = 1 AND DATE(created_at) = CURDATE()"
  )
  const blockedRequestsToday = blockedRows.length > 0 ? blockedRows[0].count : 0

  const failedRows = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND DATE(created_at) = CURDATE()"
  )
  const failedLoginsToday = failedRows.length > 0 ? failedRows[0].count : 0

  const uniqueRows = await db.query<any[]>(
    "SELECT COUNT(DISTINCT ip) as count FROM access_audit_logs WHERE DATE(created_at) = CURDATE()"
  )
  const uniqueIpsToday = uniqueRows.length > 0 ? uniqueRows[0].count : 0

  const highRiskRows = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM access_audit_logs WHERE risk_score >= 50 AND DATE(created_at) = CURDATE()"
  )
  const highRiskEvents = highRiskRows.length > 0 ? highRiskRows[0].count : 0

  res.json({
    success: true,
    data: {
      ipBlacklistCount,
      deviceBlacklistCount,
      blockedRequestsToday,
      failedLoginsToday,
      uniqueIpsToday,
      highRiskEvents,
    },
  })
})

export default router
