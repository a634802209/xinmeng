import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getChatHistory, addChatMessage, clearChatHistory } from '../services/chatService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/history', authMiddleware, (req: AuthRequest, res: Response): void => {
  const limit = parseInt(req.query.limit as string) || 50
  if (isNaN(limit) || limit < 1 || limit > 200) {
    error(res, 'Limit must be between 1 and 200', 400)
    return
  }
  const messages = getChatHistory(req.user!.id, limit)
  success(res, { messages })
})

router.post('/message', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { content, model } = req.body
  if (!content || !content.trim()) {
    error(res, 'Message content required', 400)
    return
  }

  addChatMessage(req.user!.id, 'user', content, model)

  const reply = addChatMessage(
    req.user!.id,
    'assistant',
    `这是一个模拟回复。你发送了：${content}`,
    model,
    0
  )

  success(res, { reply }, 201)
})

router.post('/clear', authMiddleware, (req: AuthRequest, res: Response): void => {
  clearChatHistory(req.user!.id)
  success(res, { message: 'Chat history cleared' })
})

export default router
