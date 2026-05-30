import db from '../db.js'
import { getCOSFileUrl } from '../utils/cos.js'

export interface Work {
  id: number
  type: string
  prompt: string
  resultUrl: string | null
  thumbnailUrl: string | null
  status: string
  createdAt: string
}

export async function getWorksByUser(userId: number, limit: number = 50): Promise<Work[]> {
  const rows = await db.query<any[]>(
    'SELECT * FROM works WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  )

  return rows.map((w) => ({
    id: w.id,
    type: w.type,
    prompt: w.prompt,
    resultUrl: w.result_url ? getCOSFileUrl(w.result_url) : null,
    thumbnailUrl: w.thumbnail_url ? getCOSFileUrl(w.thumbnail_url) : null,
    status: w.status,
    createdAt: w.created_at,
  }))
}

export async function getWorkById(workId: number) {
  const rows = await db.query<any[]>('SELECT * FROM works WHERE id = ?', [workId])
  if (rows[0]) {
    const w = rows[0]
    return {
      ...w,
      resultUrl: w.result_url ? getCOSFileUrl(w.result_url) : null,
      thumbnailUrl: w.thumbnail_url ? getCOSFileUrl(w.thumbnail_url) : null,
    }
  }
  return undefined
}

export async function deleteWork(workId: number): Promise<void> {
  await db.execute('DELETE FROM works WHERE id = ?', [workId])
}

export async function createWork(userId: number, type: string, prompt: string, status: string = 'processing'): Promise<number> {
  const result = await db.execute('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)', [
    userId, type, prompt, status,
  ])
  return Number(result.insertId)
}

export async function updateWorkStatus(workId: number, status: string, resultUrl?: string, thumbnailUrl?: string): Promise<void> {
  if (resultUrl && thumbnailUrl) {
    await db.execute('UPDATE works SET status = ?, result_url = ?, thumbnail_url = ? WHERE id = ?', [
      status, resultUrl, thumbnailUrl, workId,
    ])
  } else {
    await db.execute('UPDATE works SET status = ? WHERE id = ?', [status, workId])
  }
}
