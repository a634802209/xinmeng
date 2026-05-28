import db from '../db.js'

export interface CreditRecord {
  id: number
  type: string
  amount: number
  balance: number
  description: string | null
  created_at: string
}

export function getCreditRecords(userId: number, options: { page?: number; pageSize?: number; type?: string } = {}) {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const type = options.type || ''
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE user_id = ?'
  const params: (string | number)[] = [userId]

  if (type) {
    whereClause += ' AND type = ?'
    params.push(type)
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM credit_records ${whereClause}`).get(...params) as { count: number }).count

  const records = db.prepare(
    `SELECT id, type, amount, balance, description, created_at
     FROM credit_records
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as CreditRecord[]

  return {
    list: records,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

export function getCreditStats(userId: number) {
  const totalRecharge = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM credit_records WHERE user_id = ? AND type = 'recharge'"
  ).get(userId) as { total: number }).total

  const totalConsume = (db.prepare(
    "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM credit_records WHERE user_id = ? AND type = 'consume'"
  ).get(userId) as { total: number }).total

  const currentBalance = (db.prepare(
    'SELECT credits FROM users WHERE id = ?'
  ).get(userId) as { credits: number } | undefined)?.credits || 0

  return { totalRecharge, totalConsume, currentBalance }
}

export function addCreditRecord(userId: number, type: string, amount: number, balance: number, description?: string): void {
  db.prepare(
    'INSERT INTO credit_records (user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type, amount, balance, description || null)
}
