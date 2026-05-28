import db from '../db.js'

export interface Notification {
  id: number
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
}

export function getNotifications(userId: number, limit: number = 20): Notification[] {
  const rows = db.prepare(
    'SELECT id, title, content, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit) as Array<{
    id: number
    title: string
    content: string
    type: string
    is_read: number
    created_at: string
  }>

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    type: r.type,
    isRead: !!r.is_read,
    createdAt: r.created_at,
  }))
}

export function getUnreadCount(userId: number): number {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId) as { count: number }
  return result.count
}

export function markAsRead(notificationId: number, userId: number): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId)
}

export function markAllAsRead(userId: number): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId)
}

export function createNotification(userId: number, title: string, content: string, type: string = 'system'): void {
  db.prepare(
    'INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)'
  ).run(userId, title, content, type)
}
