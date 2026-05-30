import db from '../db.js'

export interface ChatMessage {
  id: number
  role: string
  content: string
  model: string | null
  tokensUsed: number
  createdAt: string
}

export async function getChatHistory(userId: number, limit: number = 50): Promise<ChatMessage[]> {
  const rows = await db.query<any[]>(
    'SELECT id, role, content, model, tokens_used, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  )

  return rows.reverse().map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    model: m.model,
    tokensUsed: m.tokens_used,
    createdAt: m.created_at,
  }))
}

export async function addChatMessage(userId: number, role: string, content: string, model?: string, tokensUsed?: number): Promise<ChatMessage> {
  const result = await db.execute(
    'INSERT INTO chat_messages (user_id, role, content, model, tokens_used) VALUES (?, ?, ?, ?, ?)',
    [userId, role, content, model || null, tokensUsed || 0]
  )

  return {
    id: Number(result.insertId),
    role,
    content,
    model: model || null,
    tokensUsed: tokensUsed || 0,
    createdAt: new Date().toISOString(),
  }
}

export async function clearChatHistory(userId: number): Promise<void> {
  await db.execute('DELETE FROM chat_messages WHERE user_id = ?', [userId])
}
