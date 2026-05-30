import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { success, error, badRequest, notFound } from '../utils/response.js'
import db from '../db.js'
import { createPayOrder, md5Sign } from '../utils/pay.js'

const router = Router()

/**
 * 创建充值订单
 * POST /api/pay/create
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const { recharge_type, amount, power_num } = req.body

    // 1. 参数校验
    if (!amount || !power_num) {
      badRequest(res, '充值参数不全')
      return
    }

    // 2. 生成唯一订单号
    const orderNo = `ORD_${Date.now()}_${userId}`

    // 3. 写入订单表（状态：待支付 - 0）
    await db.execute(
      'INSERT INTO orders (order_no, user_id, amount, power_num, status, create_time) VALUES (?, ?, ?, ?, 0, NOW())',
      [orderNo, userId, amount, power_num]
    )

    // 4. 调用支付接口，生成支付二维码/链接
    const payResult = await createPayOrder({
      orderNo,
      fee: amount
    })

    success(res, {
      orderNo,
      payUrl: payResult.pay_url
    }, '订单创建成功')
  } catch (err) {
    console.error('[Pay] 创建订单异常：', err)
    error(res, '订单创建失败', 500, 500)
  }
})

/**
 * 查询订单状态
 * GET /api/pay/status/:orderNo
 */
router.get('/status/:orderNo', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params
    const userId = req.user!.id

    // 查询订单
    const rows = await db.query<any[]>(
      'SELECT order_no, amount, power_num, status FROM orders WHERE order_no = ? AND user_id = ?',
      [orderNo, userId]
    )
    
    if (!rows || rows.length === 0) {
      notFound(res, '订单不存在')
      return
    }

    success(res, {
      status: rows[0].status // 0待支付 1已支付 2已取消
    }, '查询成功')
  } catch (err) {
    console.error('[Pay] 查询订单异常：', err)
    error(res, '查询失败', 500, 500)
  }
})

/**
 * 支付异步回调
 * POST /api/pay/notify
 */
router.post('/notify', async (req: Request, res: Response): Promise<void> => {
  try {
    const params = req.body
    
    // 1. 校验MD5签名（防伪造请求）
    const sign = params.sign
    const paramsWithoutSign = { ...params }
    delete paramsWithoutSign.sign
    
    const checkSign = md5Sign(paramsWithoutSign, process.env.PAY_API_KEY || 'your_secret_key')
    
    if (sign !== checkSign) {
      console.error('[Pay] 签名验证失败')
      res.send('fail')
      return
    }

    // 2. 获取订单号和支付状态
    const orderNo = params.out_trade_no
    const tradeStatus = params.trade_status

    // 3. 查询订单，幂等性判断（防止重复回调）
    const rows = await db.query<any[]>('SELECT * FROM orders WHERE order_no = ?', [orderNo])
    if (!rows || rows.length === 0 || rows[0].status === 1) {
      res.send('success')
      return
    }

    const order = rows[0]

    // 4. 订单状态更新为已支付（1）
    await db.execute('UPDATE orders SET status = 1, paid_at = NOW() WHERE order_no = ?', [orderNo])

    // 5. 给用户增加算力
    const userId = order.user_id
    const addPower = order.power_num
    await db.execute(
      'UPDATE users SET remain_power = remain_power + ? WHERE id = ?',
      [addPower, userId]
    )

    console.log(`[Pay] 订单 ${orderNo} 支付成功，用户 ${userId} 获得 ${addPower} 算力`)

    // 6. 回调返回success，通知平台处理完成
    res.send('success')
  } catch (err) {
    console.error('[Pay] 支付回调异常：', err)
    res.send('fail')
  }
})

export default router
