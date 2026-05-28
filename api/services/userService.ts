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

export function getUserById(userId: number): UserProfile | undefined {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | {
        id: number
        email: string
        nickname: string | null
        avatar: string | null
        credits: number
        is_member: number
        is_admin: number
        is_banned: number
      }
    | undefined

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

export function getUserByEmail(email: string): UserProfile | undefined {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | {
        id: number
        email: string
        nickname: string | null
        avatar: string | null
        credits: number
        is_member: number
        is_admin: number
        is_banned: number
      }
    | undefined

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

export function createUser(email: string, nickname: string, avatar: string): UserProfile {
  const result = db.prepare('INSERT INTO users (email, nickname, avatar) VALUES (?, ?, ?)').run(email, nickname, avatar)
  return getUserById(Number(result.lastInsertRowid))!
}

export function updateUserCredits(userId: number, credits: number): void {
  db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(credits, userId)
}

export function addCreditRecord(userId: number, type: string, amount: number, balance: number, description?: string): void {
  db.prepare(
    'INSERT INTO credit_records (user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type, amount, balance, description || null)
}

export function getUsageStats(userId: number) {
  const todayCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM generate_tasks WHERE user_id = ? AND date(created_at) = date('now')"
    )
    .get(userId) as { count: number }

  const monthCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM generate_tasks WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    )
    .get(userId) as { count: number }

  const totalQuota = 100000
  const usedQuota = (monthCount.count || 0) * 350
  const remainingQuota = Math.max(0, totalQuota - usedQuota)

  return {
    remainingQuota,
    totalQuota,
    todayUsage: (todayCount.count || 0) * 350,
    monthUsage: usedQuota,
    todayChange: 12,
    monthChange: -8,
  }
}
