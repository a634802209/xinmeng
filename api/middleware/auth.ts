import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'xinmeng-ai-secret-key-2026'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    isAdmin?: boolean
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; isAdmin?: boolean }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

export function generateToken(user: { id: number; email: string; isAdmin?: boolean }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
