import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import db from '../db.js'

export interface AdminRequest extends Request {
  admin?: {
    id: number
    email: string
    isAdmin: boolean
  }
}

export function adminMiddleware(req: AdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.split(' ')[1]
  const JWT_SECRET = process.env.JWT_SECRET || 'xinmeng-secret-key'

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
    const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(decoded.userId) as
      | { id: number; email: string; is_admin: number }
      | undefined

    if (!user || !user.is_admin) {
      res.status(403).json({ success: false, error: 'Forbidden: Admin access required' })
      return
    }

    req.admin = { id: user.id, email: user.email, isAdmin: true }
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}
