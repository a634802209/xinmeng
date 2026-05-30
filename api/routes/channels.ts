import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { adminAuthMiddleware, type AdminAuthRequest } from '../middleware/adminAuth.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const rows = await db.query<any[]>(
    'SELECT id, name, type, base_url, model, priority, is_active, weight, success_count, fail_count, last_used_at, created_at FROM api_channels ORDER BY priority DESC, created_at ASC'
  )

  res.json({
    success: true,
    data: rows.map((c) => ({
      ...c,
      is_active: !!c.is_active,
    })),
  })
})

router.get('/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const rows = await db.query<any[]>(
    'SELECT id, name, type, base_url, model, priority, is_active, weight, success_count, fail_count, last_used_at, created_at FROM api_channels WHERE id = ?',
    [req.params.id]
  )
  const channel = rows[0]

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

router.post('/', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const { name, type, base_url, api_key, model, priority, weight } = req.body

  if (!name || !type || !base_url || !api_key) {
    res.status(400).json({ success: false, error: 'name, type, base_url, api_key are required' })
    return
  }

  const result = await db.execute(
    'INSERT INTO api_channels (name, type, base_url, api_key, model, priority, weight) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, type, base_url, api_key, model || null, priority || 0, weight || 100]
  )

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'create_channel', 'channel', Number(result.insertId), JSON.stringify({ name, type }),
  ])

  res.json({ success: true, data: { id: Number(result.insertId) } })
})

router.put('/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const channelId = parseInt(req.params.id)
  const { name, type, base_url, api_key, model, priority, weight, is_active } = req.body

  const rows = await db.query<any[]>('SELECT id FROM api_channels WHERE id = ?', [channelId])
  if (!rows[0]) {
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
  await db.execute(`UPDATE api_channels SET ${fields.join(', ')} WHERE id = ?`, values)

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'update_channel', 'channel', channelId, JSON.stringify(req.body),
  ])

  res.json({ success: true })
})

router.delete('/:id', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const channelId = parseInt(req.params.id)

  const rows = await db.query<any[]>('SELECT id FROM api_channels WHERE id = ?', [channelId])
  if (!rows[0]) {
    res.status(404).json({ success: false, error: 'Channel not found' })
    return
  }

  await db.execute('DELETE FROM api_channels WHERE id = ?', [channelId])

  await db.execute('INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)', [
    req.adminUser!.id, 'delete_channel', 'channel', channelId, '',
  ])

  res.json({ success: true })
})

router.post('/:id/test', adminAuthMiddleware, async (req: AdminAuthRequest, res: Response): Promise<void> => {
  const channelId = parseInt(req.params.id)

  const rows = await db.query<any[]>('SELECT * FROM api_channels WHERE id = ?', [channelId])
  const channel = rows[0]

  if (!channel) {
    res.status(404).json({ success: false, error: 'Channel not found' })
    return
  }

  const url = new URL(channel.base_url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    res.status(400).json({ success: false, error: 'Invalid URL protocol' })
    return
  }
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
      await db.execute('UPDATE api_channels SET success_count = success_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [channelId])
      res.json({ success: true, data: { status: 'ok', statusCode: response.status } })
    } else {
      await db.execute('UPDATE api_channels SET fail_count = fail_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [channelId])
      res.json({ success: false, error: `HTTP ${response.status}` })
    }
  } catch {
    await db.execute('UPDATE api_channels SET fail_count = fail_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [channelId])
    res.json({ success: false, error: 'Connection failed' })
  }
})

router.get('/available/:type', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const type = req.params.type
  const rows = await db.query<any[]>(
    'SELECT id, name, base_url, api_key, model, weight FROM api_channels WHERE type = ? AND is_active = 1 ORDER BY priority DESC',
    [type]
  )

  res.json({ success: true, data: rows })
})

export default router
