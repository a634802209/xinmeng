import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminAuthMiddleware, type AdminAuthRequest } from '../middleware/adminAuth.js'

const router = Router()

// ===== IP Blacklist Management =====

// List all blacklisted IPs
router.get('/ip-blacklist', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM ip_blacklist').get() as { count: number }).count

  const list = db.prepare(
    `SELECT b.*, u.email as banned_by_email
     FROM ip_blacklist b
     LEFT JOIN users u ON b.banned_by = u.id
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset) as Array<{
    id: number
    ip: string
    reason: string | null
    banned_by: number
    banned_by_email: string | null
    created_at: string
    expires_at: string | null
  }>

  res.json({
    success: true,
    data: {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// Add IP to blacklist
router.post('/ip-blacklist', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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
    db.prepare(
      `INSERT INTO ip_blacklist (ip, reason, banned_by, expires_at) VALUES (?, ?, ?, ?)`
    ).run(ip.trim(), reason || null, req.adminUser!.id, expiresAt || null)

    db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
      req.adminUser!.id, 'blacklist_ip', 'ip', 0, JSON.stringify({ ip, reason, expiresAt })
    )

    res.json({ success: true, message: 'IP blacklisted successfully' })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, error: 'IP already in blacklist' })
      return
    }
    throw err
  }
})

// Remove IP from blacklist
router.delete('/ip-blacklist/:id', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const id = parseInt(req.params.id)
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid ID' })
    return
  }

  const item = db.prepare('SELECT ip FROM ip_blacklist WHERE id = ?').get(id) as { ip: string } | undefined
  if (!item) {
    res.status(404).json({ success: false, error: 'IP blacklist entry not found' })
    return
  }

  db.prepare('DELETE FROM ip_blacklist WHERE id = ?').run(id)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'unblacklist_ip', 'ip', 0, JSON.stringify({ ip: item.ip })
  )

  res.json({ success: true })
})

// ===== Device Blacklist Management =====

// List all blacklisted devices
router.get('/device-blacklist', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM device_blacklist').get() as { count: number }).count

  const list = db.prepare(
    `SELECT b.*, a.username as banned_by_username
     FROM device_blacklist b
     LEFT JOIN admin_accounts a ON b.banned_by = a.id
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset) as Array<{
    id: number
    fingerprint: string
    reason: string | null
    banned_by: number
    banned_by_username: string | null
    created_at: string
    expires_at: string | null
  }>

  res.json({
    success: true,
    data: {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// Add device to blacklist
router.post('/device-blacklist', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const { fingerprint, reason, expiresAt } = req.body

  if (typeof fingerprint !== 'string' || !fingerprint.trim()) {
    res.status(400).json({ success: false, error: 'Device fingerprint is required' })
    return
  }

  try {
    db.prepare(
      `INSERT INTO device_blacklist (fingerprint, reason, banned_by, expires_at) VALUES (?, ?, ?, ?)`
    ).run(fingerprint.trim(), reason || null, req.adminUser!.id, expiresAt || null)

    db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
      req.adminUser!.id, 'blacklist_device', 'device', 0, JSON.stringify({ fingerprint, reason, expiresAt })
    )

    res.json({ success: true, message: 'Device blacklisted successfully' })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, error: 'Device already in blacklist' })
      return
    }
    throw err
  }
})

// Remove device from blacklist
router.delete('/device-blacklist/:id', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const id = parseInt(req.params.id)
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid ID' })
    return
  }

  const item = db.prepare('SELECT fingerprint FROM device_blacklist WHERE id = ?').get(id) as { fingerprint: string } | undefined
  if (!item) {
    res.status(404).json({ success: false, error: 'Device blacklist entry not found' })
    return
  }

  db.prepare('DELETE FROM device_blacklist WHERE id = ?').run(id)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.adminUser!.id, 'unblacklist_device', 'device', 0, JSON.stringify({ fingerprint: item.fingerprint })
  )

  res.json({ success: true })
})

// ===== Access Audit Logs =====

// List access audit logs
router.get('/audit-logs', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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

  const total = (db.prepare(`SELECT COUNT(*) as count FROM access_audit_logs ${whereClause}`).get(...params) as { count: number }).count

  const logs = db.prepare(
    `SELECT a.*, u.email as user_email
     FROM access_audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    ip: string
    fingerprint: string | null
    user_id: number | null
    user_email: string | null
    method: string
    path: string
    status_code: number | null
    user_agent: string | null
    risk_score: number
    is_blocked: number
    block_reason: string | null
    created_at: string
  }>

  res.json({
    success: true,
    data: {
      list: logs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// ===== Login Attempts =====

// List failed login attempts
router.get('/login-attempts', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
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

  const total = (db.prepare(`SELECT COUNT(*) as count FROM login_attempts ${whereClause}`).get(...params) as { count: number }).count

  const attempts = db.prepare(
    `SELECT * FROM login_attempts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as Array<{
    id: number
    ip: string
    email: string | null
    fingerprint: string | null
    success: number
    created_at: string
  }>

  res.json({
    success: true,
    data: {
      list: attempts,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
})

// Get security overview stats
router.get('/stats', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  const ipBlacklistCount = (db.prepare('SELECT COUNT(*) as count FROM ip_blacklist').get() as { count: number }).count
  const deviceBlacklistCount = (db.prepare('SELECT COUNT(*) as count FROM device_blacklist').get() as { count: number }).count
  const blockedRequestsToday = (db.prepare(
    "SELECT COUNT(*) as count FROM access_audit_logs WHERE is_blocked = 1 AND date(created_at) = date('now')"
  ).get() as { count: number }).count
  const failedLoginsToday = (db.prepare(
    "SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND date(created_at) = date('now')"
  ).get() as { count: number }).count
  const uniqueIpsToday = (db.prepare(
    "SELECT COUNT(DISTINCT ip) as count FROM access_audit_logs WHERE date(created_at) = date('now')"
  ).get() as { count: number }).count
  const highRiskEvents = (db.prepare(
    "SELECT COUNT(*) as count FROM access_audit_logs WHERE risk_score >= 50 AND date(created_at) = date('now')"
  ).get() as { count: number }).count

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
