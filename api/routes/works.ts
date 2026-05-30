import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getWorksByUser, getWorkById, deleteWork } from '../services/workService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  getWorksByUser(req.user!.id).then((works) => {
    success(res, { works })
  })
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const workId = parseInt(req.params.id)

  const work = await getWorkById(workId)
  if (!work || work.user_id !== userId) {
    error(res, 'Work not found', 404)
    return
  }

  await deleteWork(workId)
  success(res, { message: 'Work deleted' })
})

export default router
