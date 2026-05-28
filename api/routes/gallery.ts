import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getGalleryWorks, getCategories, likeWork, getWorkById } from '../services/galleryService.js'
import { success, error } from '../utils/response.js'

const router = Router()

// 公开作品列表 - 不需要登录
router.get('/works', (req, res: Response): void => {
  const { type, category, sort, page, limit } = req.query

  const pageNum = page ? parseInt(page as string) : 1
  const limitNum = limit ? parseInt(limit as string) : 20

  if (isNaN(pageNum) || pageNum < 1) {
    error(res, 'Invalid page number', 400)
    return
  }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    error(res, 'Limit must be between 1 and 100', 400)
    return
  }
  if (sort && sort !== 'latest' && sort !== 'popular') {
    error(res, 'Sort must be latest or popular', 400)
    return
  }

  const result = getGalleryWorks({
    type: type as string,
    category: category as string,
    sort: sort as 'latest' | 'popular',
    page: pageNum,
    limit: limitNum,
  })

  success(res, result)
})

// 分类列表 - 不需要登录
router.get('/categories', (_req, res: Response): void => {
  success(res, { categories: getCategories() })
})

// 作品详情 - 不需要登录
router.get('/works/:id', (req, res: Response): void => {
  const workId = parseInt(req.params.id)
  const work = getWorkById(workId)

  if (!work) {
    error(res, 'Work not found', 404)
    return
  }

  success(res, { work })
})

// 点赞 - 可选登录
router.post('/works/:id/like', (req, res: Response): void => {
  const workId = parseInt(req.params.id)
  const success_like = likeWork(workId)

  if (!success_like) {
    error(res, 'Work not found', 404)
    return
  }

  success(res, { message: 'Liked' })
})

export default router
