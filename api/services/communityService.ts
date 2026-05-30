import db from '../db.js'

export interface CommunityMessage {
  id: number
  userId: number
  userName: string
  userAvatar: string | null
  content: string
  createdAt: string
}

export async function getCommunityMessages(limit: number = 50): Promise<CommunityMessage[]> {
  const rows = await db.query<any[]>(
    `SELECT
      id,
      user_id as userId,
      user_name as userName,
      user_avatar as userAvatar,
      content,
      created_at as createdAt
    FROM community_messages
    ORDER BY created_at DESC
    LIMIT ?`,
    [limit]
  )

  return rows.reverse()
}

export async function addCommunityMessage(
  userId: number,
  userName: string,
  userAvatar: string | null,
  content: string
): Promise<CommunityMessage> {
  const result = await db.execute(
    'INSERT INTO community_messages (user_id, user_name, user_avatar, content) VALUES (?, ?, ?, ?)',
    [userId, userName, userAvatar, content]
  )

  return {
    id: Number(result.insertId),
    userId,
    userName,
    userAvatar,
    content,
    createdAt: new Date().toISOString(),
  }
}
