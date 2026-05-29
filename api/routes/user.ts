import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getUserById, getUsageStats } from '../services/userService.js'
import { success, error } from '../utils/response.js'

const router = Router()

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `*@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

router.get('/profile', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = getUserById(req.user!.id)

  if (!user) {
    error(res, 'User not found', 404)
    return
  }

  success(res, {
    user: {
      id: user.id,
      email: maskEmail(user.email),
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
