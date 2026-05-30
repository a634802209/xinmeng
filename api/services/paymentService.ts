import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { addCreditRecord, updateUserCredits, getUserById } from './userService.js'

export interface RechargePackage {
  id: number
  name: string
  credits: number
  price: number
  bonus: number
  isHot: boolean
}

export function getRechargePackages(): RechargePackage[] {
  return [
    { id: 1, name: '100积分', credits: 100, price: 1000, bonus: 0, isHot: false },
    { id: 2, name: '500积分', credits: 500, price: 4500, bonus: 50, isHot: true },
    { id: 3, name: '1000积分', credits: 1000, price: 8000, bonus: 150, isHot: false },
    { id: 4, name: '5000积分', credits: 5000, price: 35000, bonus: 1000, isHot: false },
    { id: 5, name: '10000积分', credits: 10000, price: 60000, bonus: 3000, isHot: false },
  ]
}

export async function createPaymentOrder(userId: number, packageId: number) {
  const packages = getRechargePackages()
  const pkg = packages.find((p) => p.id === packageId)
  if (!pkg) {
    throw new Error('Invalid package')
  }

  const orderNo = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`
  const totalCredits = pkg.credits + pkg.bonus

  const result = await db.execute(
    'INSERT INTO payments (user_id, order_no, amount, credits, status) VALUES (?, ?, ?, ?, ?)',
    [userId, orderNo, pkg.price, totalCredits, 'pending']
  )

  return {
    orderId: Number(result.insertId),
    orderNo,
    amount: pkg.price,
    credits: totalCredits,
    package: pkg,
  }
}

export async function processPaymentCallback(orderNo: string, paymentMethod: string) {
  const rows = await db.query<any[]>('SELECT * FROM payments WHERE order_no = ?', [orderNo])
  const payment = rows[0]

  if (!payment) {
    throw new Error('Order not found')
  }

  if (payment.status === 'completed') {
    throw new Error('Order already paid')
  }

  await db.execute('UPDATE payments SET status = ?, payment_method = ?, paid_at = ? WHERE order_no = ?', [
    'completed', paymentMethod, new Date().toISOString(), orderNo,
  ])

  const user = await getUserById(payment.user_id)
  if (user) {
    const newBalance = user.credits + payment.credits
    await updateUserCredits(payment.user_id, newBalance)
    await addCreditRecord(payment.user_id, 'recharge', payment.credits, newBalance, `充值 - ${paymentMethod}`)
  }

  return { success: true, credits: payment.credits }
}

export async function getPaymentOrders(userId: number) {
  const rows = await db.query<any[]>(
    'SELECT id, order_no, amount, credits, status, payment_method, paid_at, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )
  return rows
}
