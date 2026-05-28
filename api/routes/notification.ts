import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/notificationService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const limit = parseInt(req.query.limit as string) || 20
  if (isNaN(limit) || limit < 1 || limit > 100) {
    error(res, 'Limit must be between 1 and 100', 400)
    return
  }
  const notifications = getNotifications(req.user!.id, limit)
  const unreadCount = getUnreadCount(req.user!.id)
  success(res, { notifications, unreadCount })
})

router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response): void => {
  const notificationId = parseInt(req.params.id)
  if (isNaN(notificationId)) {
    error(res, 'Invalid notification ID', 400)
    return
  }
  markAsRead(notificationId, req.user!.id)
  success(res, { message: 'Marked as read' })
})

router.put('/read-all', authMiddleware, (req: AuthRequest, res: Response): void => {
  markAllAsRead(req.user!.id)
  success(res, { message: 'All notifications marked as read' })
})

export default router
