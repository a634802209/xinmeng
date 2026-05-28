import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getWorksByUser, getWorkById, deleteWork } from '../services/workService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const works = getWorksByUser(req.user!.id)
  success(res, { works })
})

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const workId = parseInt(req.params.id)

  const work = getWorkById(workId)
  if (!work || work.user_id !== userId) {
    error(res, 'Work not found', 404)
    return
  }

  deleteWork(workId)
  success(res, { message: 'Work deleted' })
})

export default router
