import { Router } from 'express'
import type { Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { success, error } from '../utils/response.js'
import db from '../db.js'
import { isCOSEnabled, uploadToCOS } from '../utils/cos.js'

const router = Router()

const uploadDir = path.resolve(process.cwd(), 'public/uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only images and videos are allowed'))
    }
  },
})

router.post('/work', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      error(res, 'No file uploaded', 400)
      return
    }

    const { prompt, category, type } = req.body
    if (prompt !== undefined && (typeof prompt !== 'string' || prompt.length > 2000)) {
      error(res, 'Prompt too long (max 2000 characters)', 400)
      return
    }
    if (category !== undefined && (typeof category !== 'string' || category.length > 100)) {
      error(res, 'Category too long', 400)
      return
    }
    const user = req.user!

    let fileUrl: string
    const localPath = path.join(uploadDir, req.file.filename)

    if (isCOSEnabled()) {
      const cosKey = `works/${user.id}/${Date.now()}-${req.file.filename}`
      fileUrl = await uploadToCOS(localPath, cosKey)
      fs.unlinkSync(localPath)
    } else {
      fileUrl = `/uploads/${req.file.filename}`
    }

    const workType = type || (req.file.mimetype.startsWith('video') ? 'video' : 'image')

    // P0 修复：is_public 默认改为 0，由用户显式设置
    const result = db
      .prepare(
        'INSERT INTO works (user_id, type, prompt, result_url, thumbnail_url, status, is_public, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(user.id, workType, prompt || '', fileUrl, fileUrl, 'completed', 0, category || null)

    success(res, {
      work: {
        id: result.lastInsertRowid,
        type: workType,
        prompt: prompt || '',
        resultUrl: fileUrl,
        thumbnailUrl: fileUrl,
        status: 'completed',
        category: category || null,
      },
    })
  } catch (err) {
    console.error('Upload error:', err)
    error(res, 'Upload failed', 500)
  }
})

// P0 修复：添加认证，并且禁用该接口（避免敏感文件泄露）
router.get('/files', authMiddleware, (_req: AuthRequest, res: Response): void => {
  // 暂时禁用该接口，实际项目可改为只返回当前用户自己上传的文件
  error(res, 'File list endpoint disabled for security', 403)
  /*
  try {
    const files = fs.readdirSync(uploadDir)
    success(res, { files })
  } catch {
    error(res, 'Failed to read directory', 500)
  }
  */
})

export default router
