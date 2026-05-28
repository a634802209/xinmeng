import db from '../db.js'
import { getUserById, updateUserCredits } from './userService.js'
import { addCreditRecord } from './creditService.js'

export interface MembershipPlan {
  id: number
  name: string
  duration: string
  durationDays: number
  price: number
  features: string[]
  isHot: boolean
}

export function getMembershipPlans(): MembershipPlan[] {
  return [
    {
      id: 1,
      name: '月度会员',
      duration: '1个月',
      durationDays: 30,
      price: 2900,
      features: ['每月10000积分', '无限生成', '优先队列', '1080P高清', '会员专属模型'],
      isHot: false,
    },
    {
      id: 2,
      name: '季度会员',
      duration: '3个月',
      durationDays: 90,
      price: 7900,
      features: ['每月12000积分', '无限生成', '优先队列', '2K超清', '会员专属模型', '批量生成'],
      isHot: true,
    },
    {
      id: 3,
      name: '年度会员',
      duration: '12个月',
      durationDays: 365,
      price: 24900,
      features: ['每月15000积分', '无限生成', 'VIP队列', '4K超清', '全部模型', '批量生成', 'API访问'],
      isHot: false,
    },
  ]
}

export function subscribeMembership(userId: number, planId: number) {
  const plans = getMembershipPlans()
  const plan = plans.find((p) => p.id === planId)
  if (!plan) {
    throw new Error('Invalid plan')
  }

  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  if (user.credits < plan.price) {
    throw new Error('余额不足，请充值')
  }

  const now = new Date()
  const expiredAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

  db.prepare(
    'INSERT INTO memberships (user_id, plan_type, plan_name, price, duration_days, expired_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, plan.duration, plan.name, plan.price, plan.durationDays, expiredAt.toISOString())

  const newBalance = user.credits - plan.price
  updateUserCredits(userId, newBalance)
  addCreditRecord(userId, 'consume', -plan.price, newBalance, `购买${plan.name}`)

  db.prepare('UPDATE users SET is_member = 1, member_expire_at = ? WHERE id = ?').run(
    expiredAt.toISOString(),
    userId
  )

  return {
    plan,
    expiredAt: expiredAt.toISOString(),
    remainingCredits: newBalance,
  }
}

export function getMembershipStatus(userId: number) {
  const membership = db.prepare(
    'SELECT * FROM memberships WHERE user_id = ? AND is_active = 1 AND expired_at > datetime("now") ORDER BY expired_at DESC LIMIT 1'
  ).get(userId) as
    | {
        id: number
        plan_name: string
        plan_type: string
        expired_at: string
        started_at: string
      }
    | undefined

  if (!membership) {
    return { isMember: false, plan: null, expiredAt: null }
  }

  return {
    isMember: true,
    plan: {
      name: membership.plan_name,
      type: membership.plan_type,
      startedAt: membership.started_at,
      expiredAt: membership.expired_at,
    },
    expiredAt: membership.expired_at,
  }
}
