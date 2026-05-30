import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    nickname?: string
    avatar?: string
    isAdmin?: boolean
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, msg: 'Unauthorized', data: null })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; isAdmin?: boolean }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ code: 401, msg: 'Invalid token', data: null })
    return
  }
}

export async function authMiddlewareWithBanCheck(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, msg: 'Unauthorized', data: null })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; isAdmin?: boolean }

    const rows = await db.query<any[]>('SELECT is_banned FROM users WHERE id = ?', [decoded.id])
    const user = rows[0]
    if (!user || user.is_banned) {
      res.status(403).json({ code: 403, msg: 'Account is banned', data: null })
      return
    }

    req.user = decoded
    next()
  } catch {
    res.status(401).json({ code: 401, msg: 'Invalid token', data: null })
    return
  }
}

export function generateToken(user: { id: number; email: string; nickname?: string; avatar?: string; isAdmin?: boolean }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
