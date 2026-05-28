import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { createImageTask, createVideoTask, getTaskStatus } from '../services/generateService.js'
import { success, error } from '../utils/response.js'
import { validate, imageGenerateSchema, videoGenerateSchema } from '../utils/validator.js'

const router = Router()

router.post('/image', authMiddleware, (req: AuthRequest, res: Response): void => {
  const validation = validate(imageGenerateSchema, req.body)
  if (!validation.success) {
    error(res, validation.error, 400)
    return
  }

  try {
    const result = createImageTask(req.user!.id, validation.data)
    success(res, result, 201)
  } catch (err) {
    error(res, err instanceof Error ? err.message : '生成失败', 400)
  }
})

router.post('/video', authMiddleware, (req: AuthRequest, res: Response): void => {
  const validation = validate(videoGenerateSchema, req.body)
  if (!validation.success) {
    error(res, validation.error, 400)
    return
  }

  try {
    const result = createVideoTask(req.user!.id, validation.data)
    success(res, result, 201)
  } catch (err) {
    error(res, err instanceof Error ? err.message : '生成失败', 400)
  }
})

router.get('/status/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const task = getTaskStatus(req.params.id)

  if (!task) {
    error(res, 'Task not found', 404)
    return
  }

  success(res, { task })
})

export default router
