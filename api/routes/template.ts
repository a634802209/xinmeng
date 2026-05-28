import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getTemplates, getTemplateById, incrementUsageCount } from '../services/templateService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/', (_req, res: Response): void => {
  const category = _req.query.category as string | undefined
  const type = _req.query.type as string | undefined
  const templates = getTemplates(category, type)
  success(res, { templates })
})

router.get('/:id', (req, res: Response): void => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    error(res, 'Invalid template ID', 400)
    return
  }
  const template = getTemplateById(id)
  if (!template) {
    error(res, 'Template not found', 404)
    return
  }
  success(res, { template })
})

router.post('/:id/use', authMiddleware, (req: AuthRequest, res: Response): void => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    error(res, 'Invalid template ID', 400)
    return
  }
  incrementUsageCount(id)
  success(res, { message: 'Usage count updated' })
})

export default router
