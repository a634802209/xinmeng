import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/generate', async (_req, res: Response): Promise<void> => {
  const getSetting = async (key: string, defaultValue: string) => {
    const rows = await db.query<any[]>("SELECT \`value\` FROM settings WHERE \`key\` = ?", [key])
    return rows[0]?.value || defaultValue
  }

  const imageModels = await getSetting('image_models',
    'GPT-4o|gpt4o|image|1000;Claude 3.5|claude35|image|800;DALL-E 3|dalle3|image|1200;Stable Diffusion XL|sdxl|image|500;Midjourney V6|midjourney|image|1500;Flux.1|flux|image|600'
  )

  const videoModels = await getSetting('video_models',
    'Sora|sora|video|5000;Runway Gen-3|runway|video|3000;Pika 1.5|pika|video|2500;Stable Video|svd|video|2000;Kling|kling|video|3500'
  )

  const ratios = await getSetting('ratios', '16:9,9:16,1:1,4:3,3:2,21:9')
  const qualities = await getSetting('qualities', '480p,720p,1080p,2K,4K')
  const counts = await getSetting('counts', '1,2,4,8')

  const parseModels = (config: string) => {
    return config.split(';').map(m => {
      const [name, id, type, price] = m.split('|')
      return {
        name: name.trim(),
        id: id.trim(),
        type: type.trim(),
        price: price ? parseInt(price.trim()) : 0
      }
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

router.post('/generate', (_req, res: Response): void => {
  res.json({ success: true, message: '配置更新接口' })
})

router.get('/pricing', async (_req, res: Response): Promise<void> => {
  const imageRows = await db.query<any[]>("SELECT \`value\` FROM settings WHERE \`key\` = 'image_price'")
  const imagePrice = imageRows[0]?.value || '1000'

  const videoRows = await db.query<any[]>("SELECT \`value\` FROM settings WHERE \`key\` = 'video_price'")
  const videoPrice = videoRows[0]?.value || '3000'

  const memberRows = await db.query<any[]>("SELECT \`value\` FROM settings WHERE \`key\` = 'member_month_price'")
  const memberPrice = memberRows[0]?.value || '2900'

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
