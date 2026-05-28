import db from '../db.js'

export interface Work {
  id: number
  type: string
  prompt: string
  resultUrl: string | null
  thumbnailUrl: string | null
  status: string
  createdAt: string
}

export function getWorksByUser(userId: number, limit: number = 50): Work[] {
  const works = db
    .prepare('SELECT * FROM works WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit) as Array<{
      id: number
      type: string
      prompt: string
      result_url: string
      thumbnail_url: string
      status: string
      created_at: string
    }>

  return works.map((w) => ({
    id: w.id,
    type: w.type,
    prompt: w.prompt,
    resultUrl: w.result_url,
    thumbnailUrl: w.thumbnail_url,
    status: w.status,
    createdAt: w.created_at,
  }))
}

export function getWorkById(workId: number) {
  return db.prepare('SELECT * FROM works WHERE id = ?').get(workId) as
    | { id: number; user_id: number }
    | undefined
}

export function deleteWork(workId: number): void {
  db.prepare('DELETE FROM works WHERE id = ?').run(workId)
}

export function createWork(userId: number, type: string, prompt: string, status: string = 'processing'): number {
  const result = db.prepare('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)').run(
    userId, type, prompt, status
  )
  return Number(result.lastInsertRowid)
}

export function updateWorkStatus(workId: number, status: string, resultUrl?: string, thumbnailUrl?: string): void {
  if (resultUrl && thumbnailUrl) {
    db.prepare('UPDATE works SET status = ?, result_url = ?, thumbnail_url = ? WHERE id = ?').run(
      status, resultUrl, thumbnailUrl, workId
    )
  } else {
    db.prepare('UPDATE works SET status = ? WHERE id = ?').run(status, workId)
  }
}
