import db from '../db.js'

export interface Feedback {
  id: number
  type: string
  content: string
  contact: string | null
  status: string
  createdAt: string
}

export async function createFeedback(userId: number, type: string, content: string, contact?: string): Promise<Feedback> {
  const result = await db.execute(
    'INSERT INTO feedbacks (user_id, type, content, contact) VALUES (?, ?, ?, ?)',
    [userId, type, content, contact || null]
  )

  return {
    id: Number(result.insertId),
    type,
    content,
    contact: contact || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export async function getFeedbacks(userId: number): Promise<Feedback[]> {
  const rows = await db.query<any[]>(
    'SELECT id, type, content, contact, status, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    content: r.content,
    contact: r.contact,
    status: r.status,
    createdAt: r.created_at,
  }))
}
