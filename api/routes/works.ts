import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const works = db
    .prepare('SELECT * FROM works WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(userId) as Array<{
    id: number
    type: string
    prompt: string
    result_url: string
    thumbnail_url: string
    status: string
    created_at: string
  }>

  res.json({
    success: true,
    works: works.map((w) => ({
      id: w.id,
      type: w.type,
      prompt: w.prompt,
      resultUrl: w.result_url,
      thumbnailUrl: w.thumbnail_url,
      status: w.status,
      createdAt: w.created_at,
    })),
  })
})

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const workId = req.params.id

  const work = db.prepare('SELECT * FROM works WHERE id = ? AND user_id = ?').get(workId, userId)
  if (!work) {
    res.status(404).json({ success: false, error: 'Work not found' })
    return
  }

  db.prepare('DELETE FROM works WHERE id = ?').run(workId)
  res.json({ success: true, message: 'Work deleted' })
})

export default router
