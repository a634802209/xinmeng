import db from '../db.js'

export interface CommunityMessage {
  id: number
  userId: number
  userName: string
  userAvatar: string | null
  content: string
  createdAt: string
}

export function getCommunityMessages(limit: number = 50): CommunityMessage[] {
  const messages = db
    .prepare(
      `SELECT
        id,
        user_id as userId,
        user_name as userName,
        user_avatar as userAvatar,
        content,
        created_at as createdAt
      FROM community_messages
      ORDER BY created_at DESC
      LIMIT ?`
    )
    .all(limit) as Array<{
      id: number
      userId: number
      userName: string
      userAvatar: string | null
      content: string
      createdAt: string
    }>

  return messages.reverse()
}

export function addCommunityMessage(
  userId: number,
  userName: string,
  userAvatar: string | null,
  content: string
): CommunityMessage {
  const result = db
    .prepare(
      'INSERT INTO community_messages (user_id, user_name, user_avatar, content) VALUES (?, ?, ?, ?)'
    )
    .run(userId, userName, userAvatar, content)

  return {
    id: Number(result.lastInsertRowid),
    userId,
    userName,
    userAvatar,
    content,
    createdAt: new Date().toISOString(),
  }
}
