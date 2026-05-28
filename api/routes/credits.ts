import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getCreditRecords, getCreditStats } from '../services/creditService.js'
import { success } from '../utils/response.js'
import { validate, paginationSchema } from '../utils/validator.js'

const router = Router()

router.get('/records', authMiddleware, (req: AuthRequest, res: Response): void => {
  const validation = validate(paginationSchema, req.query)
  const { page, pageSize } = validation.success ? validation.data : { page: 1, pageSize: 20 }
  const type = req.query.type as string || ''

  const result = getCreditRecords(req.user!.id, { page, pageSize, type })
  success(res, result)
})

router.get('/stats', authMiddleware, (req: AuthRequest, res: Response): void => {
  const stats = getCreditStats(req.user!.id)
  success(res, stats)
})

export default router
