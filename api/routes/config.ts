import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'

const router = Router()

// 获取生成配置（模型、尺寸、清晰度等）
router.get('/generate', (_req, res: Response): void => {
  const config = {
    models: [
      { id: 'gpt4o', name: 'GPT-4o', type: 'image', supported: ['image', 'text'] },
      { id: 'claude35', name: 'Claude 3.5', type: 'image', supported: ['image', 'text'] },
      { id: 'gemini', name: 'Gemini Pro', type: 'image', supported: ['image', 'video', 'text'] },
      { id: 'kimi', name: 'Kimi', type: 'text', supported: ['text'] },
      { id: 'wenxin', name: '文心一言', type: 'text', supported: ['text'] },
      { id: 'dalle3', name: 'DALL-E 3', type: 'image', supported: ['image'] },
      { id: 'sdxl', name: 'Stable Diffusion XL', type: 'image', supported: ['image'] },
    ],
    ratios: ['16:9', '9:16', '1:1', '4:3', '3:2', '21:9'],
    qualities: ['480p', '720p', '1080p', '2K', '4K'],
    counts: [1, 2, 4, 8],
    sizes: {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '1:1': '1024x1024',
      '4:3': '1440x1080',
      '3:2': '1536x1024',
      '21:9': '2560x1080',
    },
  }

  res.json({ success: true, data: config })
})

// 获取平台价格配置
router.get('/pricing', (_req, res: Response): void => {
  const imagePrice = (db.prepare("SELECT value FROM settings WHERE key = 'image_price'").get() as { value: string } | undefined)?.value || '1000'
  const videoPrice = (db.prepare("SELECT value FROM settings WHERE key = 'video_price'").get() as { value: string } | undefined)?.value || '3000'
  const memberPrice = (db.prepare("SELECT value FROM settings WHERE key = 'member_month_price'").get() as { value: string } | undefined)?.value || '2900'

  res.json({
    success: true,
    data: {
      image: parseInt(imagePrice),
      video: parseInt(videoPrice),
      member: parseInt(memberPrice),
    },
  })
})

export default router
