import db from '../db.js'

export interface UserProfile {
  id: number
  email: string
  nickname: string | null
  avatar: string | null
  credits: number
  isMember: boolean
  isAdmin: boolean
  isBanned: boolean
}

export async function getUserById(userId: number): Promise<UserProfile | undefined> {
  const [rows] = await db.query<any[]>('SELECT * FROM users WHERE id = ?', [userId])
  const user = rows[0]

  if (!user) return undefined

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    credits: user.credits,
    isMember: !!user.is_member,
    isAdmin: !!user.is_admin,
    isBanned: !!user.is_banned,
  }
}

export async function getUserByEmail(email: string): Promise<UserProfile | undefined> {
  const [rows] = await db.query<any[]>('SELECT * FROM users WHERE email = ?', [email])
  const user = rows[0]

  if (!user) return undefined

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    credits: user.credits,
    isMember: !!user.is_member,
    isAdmin: !!user.is_admin,
    isBanned: !!user.is_banned,
  }
}

export async function createUser(email: string, nickname: string, avatar: string): Promise<UserProfile> {
  const result = await db.execute('INSERT INTO users (email, nickname, avatar) VALUES (?, ?, ?)', [email, nickname, avatar])
  return getUserById(Number(result.insertId))!
}

export async function updateUserCredits(userId: number, credits: number): Promise<void> {
  await db.execute('UPDATE users SET credits = ? WHERE id = ?', [credits, userId])
}

export async function addCreditRecord(userId: number, type: string, amount: number, balance: number, description?: string): Promise<void> {
  await db.execute(
    'INSERT INTO credit_records (user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?)',
    [userId, type, amount, balance, description || null]
  )
}

export async function getUsageStats(userId: number) {
  const [todayRows] = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM generate_tasks WHERE user_id = ? AND date(created_at) = date('now')",
    [userId]
  )
  const todayCount = todayRows[0].count

  const [monthRows] = await db.query<any[]>(
    "SELECT COUNT(*) as count FROM generate_tasks WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
    [userId]
  )
  const monthCount = monthRows[0].count

  const totalQuota = 100000
  const usedQuota = (monthCount || 0) * 350
  const remainingQuota = Math.max(0, totalQuota - usedQuota)

  return {
    remainingQuota,
    totalQuota,
    todayUsage: (todayCount || 0) * 350,
    monthUsage: usedQuota,
    todayChange: 12,
    monthChange: -8,
  }
}
