import { Request, Response, NextFunction } from 'express'
import db from '../db'

export interface ApiKeyUser {
  id: number
  balance: number
}

declare global {
  namespace Express {
    interface Request {
      user?: ApiKeyUser
      apiKeyId?: number
    }
  }
}

export async function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '缺少有效的API Key' })
      return
    }

    const apiKey = authHeader.split(' ')[1]

    const [keyRows] = await db.query<any[]>(`
      SELECT ak.*, u.balance FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.\`key\` = ? AND ak.status = 'active' AND u.status = 'active'
    `, [apiKey])

    if (keyRows.length === 0) {
      res.status(401).json({ error: '无效或已禁用的API Key' })
      return
    }

    const keyData = keyRows[0]

    if (keyData.balance <= 0) {
      res.status(402).json({ error: '账户余额不足，请充值' })
      return
    }

    req.user = {
      id: keyData.user_id,
      balance: keyData.balance
    }
    req.apiKeyId = keyData.id

    next()
  } catch (err) {
    console.error('[API Key Auth] 鉴权失败:', err)
    res.status(500).json({ error: '服务器鉴权错误' })
  }
}
