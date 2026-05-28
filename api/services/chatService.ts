import db from '../db.js'

export interface ChatMessage {
  id: number
  role: string
  content: string
  model: string | null
  tokensUsed: number
  createdAt: string
}

export function getChatHistory(userId: number, limit: number = 50): ChatMessage[] {
  const messages = db.prepare(
    'SELECT id, role, content, model, tokens_used, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit) as Array<{
    id: number
    role: string
    content: string
    model: string | null
    tokens_used: number
    created_at: string
  }>

  return messages.reverse().map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    model: m.model,
    tokensUsed: m.tokens_used,
    createdAt: m.created_at,
  }))
}

export function addChatMessage(userId: number, role: string, content: string, model?: string, tokensUsed?: number): ChatMessage {
  const result = db.prepare(
    'INSERT INTO chat_messages (user_id, role, content, model, tokens_used) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, role, content, model || null, tokensUsed || 0)

  return {
    id: Number(result.lastInsertRowid),
    role,
    content,
    model: model || null,
    tokensUsed: tokensUsed || 0,
    createdAt: new Date().toISOString(),
  }
}

export function clearChatHistory(userId: number): void {
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId)
}
