import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'

const router = Router()

// 获取生成配置（模型、尺寸、清晰度等）- 动态从数据库/设置读取
router.get('/generate', (_req, res: Response): void => {
  // 从 settings 表读取配置，如果没有则使用默认值
  const getSetting = (key: string, defaultValue: string) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined
    return row?.value || defaultValue
  }

  // 图片模型配置
  const imageModels = getSetting('image_models',
    'GPT-4o|gpt4o|image;Claude 3.5|claude35|image;DALL-E 3|dalle3|image;Stable Diffusion XL|sdxl|image;Midjourney V6|midjourney|image;Flux.1|flux|image'
  )

  // 视频模型配置
  const videoModels = getSetting('video_models',
    'Sora|sora|video;Runway Gen-3|runway|video;Pika 1.5|pika|video;Stable Video|svd|video;Kling|kling|video'
  )

  // 尺寸比例配置
  const ratios = getSetting('ratios', '16:9,9:16,1:1,4:3,3:2,21:9')

  // 清晰度配置
  const qualities = getSetting('qualities', '480p,720p,1080p,2K,4K')

  // 生成数量配置
  const counts = getSetting('counts', '1,2,4,8')

  // 解析模型配置字符串 "显示名|id|类型"
  const parseModels = (config: string) => {
    return config.split(';').map(m => {
      const [name, id, type] = m.split('|')
      return { name: name.trim(), id: id.trim(), type: type.trim() }
    }).filter(m => m.name && m.id)
  }

  const config = {
    imageModels: parseModels(imageModels),
    videoModels: parseModels(videoModels),
    ratios: ratios.split(',').map(r => r.trim()).filter(Boolean),
    qualities: qualities.split(',').map(q => q.trim()).filter(Boolean),
    counts: counts.split(',').map(c => parseInt(c.trim())).filter(Boolean),
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

// 更新生成配置（管理员接口）
router.post('/generate', (_req, res: Response): void => {
  // 简化版：直接返回当前配置
  // 实际应用中需要管理员权限校验
  res.json({ success: true, message: '配置更新接口' })
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
