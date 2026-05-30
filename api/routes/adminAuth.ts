import { Router } from 'express'
import type { Response } from 'express'
import bcrypt from 'bcryptjs'
import { generateAdminToken, adminAuthMiddleware, requireSuperAdmin, type AdminAuthRequest } from '../middleware/adminAuth.js'
import { trackLoginAttempt } from '../middleware/security.js'
import db from '../db.js'

const router = Router()

function getClientIp(req: AdminAuthRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string') return realIp
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function validateRequired(value: any, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`
  }
  return null
}

function validateLength(value: string, min: number, max: number, field: string): string | null {
  if (value.length < min || value.length > max) {
    return `${field} must be ${min}-${max} characters`
  }
  return null
}

function validatePasswordComplexity(password: string): string | null {
  if (password.length < 12) {
    return 'Password must be at least 12 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit'
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character'
  }
  return null
}

router.post('/login', async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { username, password } = req.body

  const usernameError = validateRequired(username, 'Username')
  if (usernameError) {
    res.status(400).json({ success: false, error: usernameError })
    return
  }

  const passwordError = validateRequired(password, 'Password')
  if (passwordError) {
    res.status(400).json({ success: false, error: passwordError })
    return
  }

  const clientIp = getClientIp(req)

  const [rows] = await db.query<any[]>('SELECT * FROM admin_accounts WHERE username = ?', [username])
  const admin = rows[0]

  if (!admin) {
    await trackLoginAttempt(clientIp, username, null, false)
    res.status(401).json({ success: false, error: 'Invalid username or password' })
    return
  }

  if (!admin.is_active) {
    await trackLoginAttempt(clientIp, username, null, false)
    res.status(403).json({ success: false, error: 'Account is disabled' })
    return
  }

  const isValid = await bcrypt.compare(password, admin.password_hash)
  if (!isValid) {
    await trackLoginAttempt(clientIp, username, null, false)
    res.status(401).json({ success: false, error: 'Invalid username or password' })
    return
  }

  await db.execute("UPDATE admin_accounts SET last_login_at = datetime('now') WHERE id = ?", [admin.id])
  await trackLoginAttempt(clientIp, username, null, true)

  const token = generateAdminToken({ id: admin.id, username: admin.username, role: admin.role })

  res.json({
    success: true,
    data: {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    },
  })
})

router.get('/me', adminAuthMiddleware, (req: AdminAuthRequest, res: Response): void => {
  res.json({
    success: true,
    data: req.adminUser,
  })
})

router.post('/change-password', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body

  const currentError = validateRequired(currentPassword, 'Current password')
  if (currentError) {
    res.status(400).json({ success: false, error: currentError })
    return
  }

  const newError = validateRequired(newPassword, 'New password')
  if (newError) {
    res.status(400).json({ success: false, error: newError })
    return
  }

  if (newPassword.length < 8) {
    res.status(400).json({ success: false, error: 'New password must be at least 8 characters' })
    return
  }

  const adminId = req.adminUser!.id

  const [rows] = await db.query<any[]>('SELECT password_hash FROM admin_accounts WHERE id = ?', [adminId])
  const admin = rows[0]

  if (!admin) {
    res.status(404).json({ success: false, error: 'Admin not found' })
    return
  }

  const isValid = await bcrypt.compare(currentPassword, admin.password_hash)
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Current password is incorrect' })
    return
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  await db.execute('UPDATE admin_accounts SET password_hash = ? WHERE id = ?', [newHash, adminId])

  res.json({ success: true, message: 'Password changed successfully' })
})

router.get('/accounts', adminAuthMiddleware, requireSuperAdmin, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const [rows] = await db.query<any[]>(
    'SELECT id, username, role, is_active, last_login_at, created_at FROM admin_accounts ORDER BY id'
  )

  res.json({ success: true, data: rows })
})

router.post('/accounts', adminAuthMiddleware, requireSuperAdmin, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { username, password, role = 'admin' } = req.body

  const usernameError = validateRequired(username, 'Username') || validateLength(username, 3, 50, 'Username')
  if (usernameError) {
    res.status(400).json({ success: false, error: usernameError })
    return
  }

  const passwordError = validateRequired(password, 'Password')
  if (passwordError) {
    res.status(400).json({ success: false, error: passwordError })
    return
  }

  const complexityError = validatePasswordComplexity(password)
  if (complexityError) {
    res.status(400).json({ success: false, error: complexityError })
    return
  }

  if (role !== 'admin' && role !== 'superadmin') {
    res.status(400).json({ success: false, error: 'Role must be admin or superadmin' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await db.execute('INSERT INTO admin_accounts (username, password_hash, role) VALUES (?, ?, ?)', [
      username, passwordHash, role,
    ])
    res.json({ success: true, message: 'Admin account created' })
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Username already exists' })
      return
    }
    throw err
  }
})

router.patch('/accounts/:id/status', adminAuthMiddleware, requireSuperAdmin, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { isActive } = req.body

  if (id === req.adminUser!.id) {
    res.status(400).json({ success: false, error: 'Cannot disable your own account' })
    return
  }

  await db.execute('UPDATE admin_accounts SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id])
  res.json({ success: true })
})

router.delete('/accounts/:id', adminAuthMiddleware, requireSuperAdmin, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)

  if (id === req.adminUser!.id) {
    res.status(400).json({ success: false, error: 'Cannot delete your own account' })
    return
  }

  await db.execute("UPDATE admin_accounts SET is_active = 0, deleted_at = datetime('now') WHERE id = ?", [id])
  res.json({ success: true, message: 'Account soft deleted' })
})

export default router
