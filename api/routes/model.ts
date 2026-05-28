import { Router } from 'express'
import type { Response } from 'express'
import { getModels, getModelById } from '../services/modelService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/', (req, res: Response): void => {
  const type = req.query.type as string | undefined
  const models = getModels(type)
  success(res, { models })
})

router.get('/:id', (req, res: Response): void => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    error(res, 'Invalid model ID', 400)
    return
  }
  const model = getModelById(id)
  if (!model) {
    error(res, 'Model not found', 404)
    return
  }
  success(res, { model })
})

export default router
