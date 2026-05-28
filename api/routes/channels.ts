import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminMiddleware, type AdminRequest } from '../middleware/admin.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// ===== API 渠道管理 =====

// 获取所有渠道
router.get('/', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const channels = db.prepare(
    'SELECT id, name, type, base_url, model, priority, is_active, weight, success_count, fail_count, last_used_at, created_at FROM api_channels ORDER BY priority DESC, created_at ASC'
  ).all() as Array<{
    id: number
    name: string
    type: string
    base_url: string
    model: string | null
    priority: number
    is_active: number
    weight: number
    success_count: number
    fail_count: number
    last_used_at: string | null
    created_at: string
  }>

  res.json({
    success: true,
    data: channels.map((c) => ({
      ...c,
      is_active: !!c.is_active,
    })),
  })
})

// 获取单个渠道详情（隐藏 api_key）
router.get('/:id', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const channel = db.prepare('SELECT id, name, type, base_url, model, priority, is_active, weight, success_count, fail_count, last_used_at, created_at FROM api_channels WHERE id = ?').get(req.params.id) as
    | {
        id: number
        name: string
        type: string
        base_url: string
        model: string | null
        priority: number
        is_active: number
        weight: number
        success_count: number
        fail_count: number
        last_used_at: string | null
        created_at: string
      }
    | undefined

  if (!channel) {
    res.status(404).json({ success: false, error: 'Channel not found' })
    return
  }

  res.json({
    success: true,
    data: {
      ...channel,
      is_active: !!channel.is_active,
      api_key: '***hidden***',
    },
  })
})

// 创建渠道
router.post('/', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const { name, type, base_url, api_key, model, priority, weight } = req.body

  if (!name || !type || !base_url || !api_key) {
    res.status(400).json({ success: false, error: 'name, type, base_url, api_key are required' })
    return
  }

  const result = db.prepare(
    'INSERT INTO api_channels (name, type, base_url, api_key, model, priority, weight) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, type, base_url, api_key, model || null, priority || 0, weight || 100)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'create_channel', 'channel', result.lastInsertRowid, JSON.stringify({ name, type })
  )

  res.json({ success: true, data: { id: result.lastInsertRowid } })
})

// 更新渠道
router.put('/:id', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const channelId = parseInt(req.params.id)
  const { name, type, base_url, api_key, model, priority, weight, is_active } = req.body

  const channel = db.prepare('SELECT id FROM api_channels WHERE id = ?').get(channelId) as { id: number } | undefined
  if (!channel) {
    res.status(404).json({ success: false, error: 'Channel not found' })
    return
  }

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (name !== undefined) { fields.push('name = ?'); values.push(name) }
  if (type !== undefined) { fields.push('type = ?'); values.push(type) }
  if (base_url !== undefined) { fields.push('base_url = ?'); values.push(base_url) }
  if (api_key !== undefined) { fields.push('api_key = ?'); values.push(api_key) }
  if (model !== undefined) { fields.push('model = ?'); values.push(model) }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority) }
  if (weight !== undefined) { fields.push('weight = ?'); values.push(weight) }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0) }

  if (fields.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' })
    return
  }

  values.push(channelId)
  db.prepare(`UPDATE api_channels SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'update_channel', 'channel', channelId, JSON.stringify(req.body)
  )

  res.json({ success: true })
})

// 删除渠道
router.delete('/:id', adminMiddleware, (req: AdminRequest, res: Response): void => {
  const channelId = parseInt(req.params.id)

  const channel = db.prepare('SELECT id FROM api_channels WHERE id = ?').get(channelId) as { id: number } | undefined
  if (!channel) {
    res.status(404).json({ success: false, error: 'Channel not found' })
    return
  }

  db.prepare('DELETE FROM api_channels WHERE id = ?').run(channelId)

  db.prepare('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.admin!.id, 'delete_channel', 'channel', channelId, ''
  )

  res.json({ success: true })
})

// 测试渠道连通性
router.post('/:id/test', adminMiddleware, async (req: AdminRequest, res: Response): Promise<void> => {
  const channelId = parseInt(req.params.id)

  const channel = db.prepare('SELECT * FROM api_channels WHERE id = ?').get(channelId) as
    | { id: number; base_url: string; api_key: string; type: string; model: string | null }
    | undefined

  if (!channel) {
    res.status(404).json({ success: false, error: 'Channel not found' })
    return
  }

  // SSRF protection: only allow http/https protocols
  const url = new URL(channel.base_url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    res.status(400).json({ success: false, error: 'Invalid URL protocol' })
    return
  }
  // Block private IP ranges
  const hostname = url.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
    res.status(400).json({ success: false, error: 'Private IP addresses are not allowed' })
    return
  }

  try {
    const response = await fetch(`${channel.base_url}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${channel.api_key}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      db.prepare('UPDATE api_channels SET success_count = success_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(channelId)
      res.json({ success: true, data: { status: 'ok', statusCode: response.status } })
    } else {
      db.prepare('UPDATE api_channels SET fail_count = fail_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(channelId)
      res.json({ success: false, error: `HTTP ${response.status}` })
    }
  } catch {
    db.prepare('UPDATE api_channels SET fail_count = fail_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(channelId)
    res.json({ success: false, error: 'Connection failed' })
  }
})

// 获取可用渠道（供生成接口内部调用）- 需要认证
router.get('/available/:type', authMiddleware, (req: AuthRequest, res: Response): void => {
  const type = req.params.type
  const channels = db.prepare(
    'SELECT id, name, base_url, api_key, model, weight FROM api_channels WHERE type = ? AND is_active = 1 ORDER BY priority DESC'
  ).all(type) as Array<{
    id: number
    name: string
    base_url: string
    api_key: string
    model: string | null
    weight: number
  }>

  res.json({ success: true, data: channels })
})

export default router
