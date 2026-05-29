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
  // P0 修复：临时禁用不安全的支付回调，先注释掉，实际项目请配置签名验证
  // 建议：
  // 1. 添加支付平台签名验证（微信支付 RSA 验签/支付宝 RSA2 验签）
  // 2. 添加 IP 白名单（仅允许支付平台服务器 IP）
  // 3. 添加幂等性控制（用 orderNo 做唯一索引，避免重复处理）
  // 4. 使用随机 UUID 订单号
  error(res, 'Payment callback temporarily disabled for security fix', 503)
  return
  
  /*
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
  */
})

router.get('/orders', authMiddleware, (req: AuthRequest, res: Response): void => {
  const orders = getPaymentOrders(req.user!.id)
  success(res, { orders })
})

export default router
