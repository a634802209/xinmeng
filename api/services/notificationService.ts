import db from '../db.js'

export interface Notification {
  id: number
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
}

export async function getNotifications(userId: number, limit: number = 20): Promise<Notification[]> {
  const rows = await db.query<any[]>(
    'SELECT id, title, content, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  )

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    type: r.type,
    isRead: !!r.is_read,
    createdAt: r.created_at,
  }))
}

export async function getUnreadCount(userId: number): Promise<number> {
  const rows = await db.query<any[]>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  )
  return rows.length > 0 ? rows[0].count : 0
}

export async function markAsRead(notificationId: number, userId: number): Promise<void> {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId])
}

export async function markAllAsRead(userId: number): Promise<void> {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId])
}

export async function createNotification(userId: number, title: string, content: string, type: string = 'system'): Promise<void> {
  await db.execute(
    'INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)',
    [userId, title, content, type]
  )
}
