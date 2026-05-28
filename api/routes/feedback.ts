import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { createFeedback, getFeedbacks } from '../services/feedbackService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.post('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { type, content, contact } = req.body
  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    error(res, 'Type required', 400)
    return
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    error(res, 'Content required', 400)
    return
  }
  if (content.trim().length > 5000) {
    error(res, 'Content too long (max 5000 characters)', 400)
    return
  }
  if (contact !== undefined && (typeof contact !== 'string' || contact.length > 200)) {
    error(res, 'Contact too long', 400)
    return
  }

  const feedback = createFeedback(req.user!.id, type.trim(), content.trim(), contact?.trim())
  success(res, { feedback }, 201)
})

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const feedbacks = getFeedbacks(req.user!.id)
  success(res, { feedbacks })
})

export default router
