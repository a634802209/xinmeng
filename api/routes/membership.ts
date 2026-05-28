import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getMembershipPlans, subscribeMembership, getMembershipStatus } from '../services/membershipService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/plans', authMiddleware, (_req: AuthRequest, res: Response): void => {
  const plans = getMembershipPlans()
  success(res, { plans })
})

router.post('/subscribe', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { planId } = req.body
  if (!planId || typeof planId !== 'number' || planId <= 0) {
    error(res, 'Plan ID must be a positive number', 400)
    return
  }

  try {
    const result = subscribeMembership(req.user!.id, planId)
    success(res, result)
  } catch (err) {
    error(res, err instanceof Error ? err.message : 'Subscribe failed', 400)
  }
})

router.get('/status', authMiddleware, (req: AuthRequest, res: Response): void => {
  const status = getMembershipStatus(req.user!.id)
  success(res, status)
})

export default router
