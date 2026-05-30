import db from '../db.js'

export interface CreditRecord {
  id: number
  type: string
  amount: number
  balance: number
  description: string | null
  created_at: string
}

export async function getCreditRecords(userId: number, options: { page?: number; pageSize?: number; type?: string } = {}) {
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

  const countRows = await db.query<any[]>(`SELECT COUNT(*) as count FROM credit_records ${whereClause}`, params)
  const total = countRows[0].count

  const records = await db.query<any[]>(
    `SELECT id, type, amount, balance, description, created_at
     FROM credit_records
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    list: records,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

export async function getCreditStats(userId: number) {
  const rechargeRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM credit_records WHERE user_id = ? AND type = 'recharge'",
    [userId]
  )
  const totalRecharge = rechargeRows[0].total

  const consumeRows = await db.query<any[]>(
    "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM credit_records WHERE user_id = ? AND type = 'consume'",
    [userId]
  )
  const totalConsume = consumeRows[0].total

  const userRows = await db.query<any[]>('SELECT credits FROM users WHERE id = ?', [userId])
  const currentBalance = userRows[0]?.credits || 0

  return { totalRecharge, totalConsume, currentBalance }
}

export async function addCreditRecord(userId: number, type: string, amount: number, balance: number, description?: string): Promise<void> {
  await db.execute(
    'INSERT INTO credit_records (user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?)',
    [userId, type, amount, balance, description || null]
  )
}
