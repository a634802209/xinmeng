import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET
if (!ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET environment variable is required')
}

export interface AdminAuthRequest extends Request {
  adminUser?: {
    id: number
    username: string
    role: string
  }
}

export function adminAuthMiddleware(req: AdminAuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { id: number; username: string; role: string }
    req.adminUser = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
    return
  }
}

export async function adminAuthMiddlewareWithCheck(req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { id: number; username: string; role: string }

    const rows = await db.query<any[]>('SELECT id, username, role, is_active FROM admin_accounts WHERE id = ?', [decoded.id])
    const admin = rows[0]

    if (!admin || !admin.is_active) {
      res.status(403).json({ success: false, error: 'Admin account is disabled' })
      return
    }

    req.adminUser = { id: admin.id, username: admin.username, role: admin.role }
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
    return
  }
}

export function generateAdminToken(admin: { id: number; username: string; role: string }): string {
  return jwt.sign(admin, ADMIN_JWT_SECRET, { expiresIn: '8h' })
}

export function requireSuperAdmin(req: AdminAuthRequest, res: Response, next: NextFunction): void {
  if (req.adminUser?.role !== 'superadmin') {
    res.status(403).json({ success: false, error: 'Super admin access required' })
    return
  }
  next()
}
