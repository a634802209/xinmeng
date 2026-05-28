import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getCommunityMessages, addCommunityMessage } from '../services/communityService.js'
import { success, error } from '../utils/response.js'

const router = Router()

// 获取社区聊天消息 - 不需要登录
router.get('/messages', (_req, res: Response): void => {
  const limit = parseInt(_req.query.limit as string) || 50
  if (isNaN(limit) || limit < 1 || limit > 200) {
    error(res, 'Limit must be between 1 and 200', 400)
    return
  }
  const messages = getCommunityMessages(limit)
  success(res, { messages })
})

// 发送社区消息 - 需要登录
router.post('/messages', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { content } = req.body
  if (!content || typeof content !== 'string' || !content.trim()) {
    error(res, 'Message content required', 400)
    return
  }
  if (content.trim().length > 2000) {
    error(res, 'Message too long (max 2000 characters)', 400)
    return
  }

  const user = req.user!
  const message = addCommunityMessage(
    user.id,
    user.nickname || user.email || '匿名用户',
    user.avatar || null,
    content.trim()
  )

  success(res, { message }, 201)
})

export default router
