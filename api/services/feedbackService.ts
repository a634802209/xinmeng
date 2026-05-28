import db from '../db.js'

export interface Feedback {
  id: number
  type: string
  content: string
  contact: string | null
  status: string
  createdAt: string
}

export function createFeedback(userId: number, type: string, content: string, contact?: string): Feedback {
  const result = db.prepare(
    'INSERT INTO feedbacks (user_id, type, content, contact) VALUES (?, ?, ?, ?)'
  ).run(userId, type, content, contact || null)

  return {
    id: Number(result.lastInsertRowid),
    type,
    content,
    contact: contact || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export function getFeedbacks(userId: number): Feedback[] {
  const rows = db.prepare(
    'SELECT id, type, content, contact, status, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId) as Array<{
    id: number
    type: string
    content: string
    contact: string | null
    status: string
    created_at: string
  }>

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    content: r.content,
    contact: r.contact,
    status: r.status,
    createdAt: r.created_at,
  }))
}
