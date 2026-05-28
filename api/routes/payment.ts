import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getRechargePackages, createPaymentOrder, processPaymentCallback, getPaymentOrders } from '../services/paymentService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/packages', authMiddleware, (_req: AuthRequest, res: Response): void => {
  const packages = getRechargePackages()
  success(res, { packages })
})

router.post('/create', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { packageId } = req.body
  if (!packageId || typeof packageId !== 'number' || packageId <= 0) {
    error(res, 'Package ID must be a positive number', 400)
    return
  }

  try {
    const order = createPaymentOrder(req.user!.id, packageId)
    success(res, { order }, 201)
  } catch (err) {
    error(res, err instanceof Error ? err.message : 'Create order failed', 400)
  }
})

router.post('/callback', (req, res): void => {
  const { orderNo, paymentMethod } = req.body
  if (!orderNo || typeof orderNo !== 'string' || orderNo.trim().length === 0) {
    error(res, 'Order number required', 400)
    return
  }
  if (!paymentMethod || typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) {
    error(res, 'Payment method required', 400)
    return
  }

  try {
    const result = processPaymentCallback(orderNo.trim(), paymentMethod.trim())
    success(res, result)
  } catch (err) {
    error(res, err instanceof Error ? err.message : 'Payment failed', 400)
  }
})

router.get('/orders', authMiddleware, (req: AuthRequest, res: Response): void => {
  const orders = getPaymentOrders(req.user!.id)
  success(res, { orders })
})

export default router
