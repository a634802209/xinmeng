import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getUserById, getUsageStats } from '../services/userService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/profile', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = getUserById(req.user!.id)

  if (!user) {
    error(res, 'User not found', 404)
    return
  }

  success(res, {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      credits: user.credits,
      isMember: user.isMember,
    },
  })
})

router.get('/usage', authMiddleware, (req: AuthRequest, res: Response): void => {
  const usage = getUsageStats(req.user!.id)
  success(res, { usage })
})

export default router
