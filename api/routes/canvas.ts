import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取用户的画布项目列表
router.get('/projects', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const projects = db.prepare(
    'SELECT id, name, created_at, updated_at FROM canvas_projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(userId) as Array<{ id: number; name: string; created_at: string; updated_at: string }>

  res.json({ success: true, data: projects })
})

// 获取单个画布项目
router.get('/projects/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const projectId = parseInt(req.params.id)

  const project = db.prepare(
    'SELECT * FROM canvas_projects WHERE id = ? AND user_id = ?'
  ).get(projectId, userId) as
    | { id: number; name: string; nodes: string; connections: string; created_at: string; updated_at: string }
    | undefined

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' })
    return
  }

  res.json({
    success: true,
    data: {
      ...project,
      nodes: JSON.parse(project.nodes),
      connections: JSON.parse(project.connections),
    },
  })
})

// 创建画布项目
router.post('/projects', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const { name, nodes, connections } = req.body

  if (!name || !Array.isArray(nodes) || !Array.isArray(connections)) {
    res.status(400).json({ success: false, error: 'Invalid params' })
    return
  }

  const result = db.prepare(
    'INSERT INTO canvas_projects (user_id, name, nodes, connections) VALUES (?, ?, ?, ?)'
  ).run(userId, name, JSON.stringify(nodes), JSON.stringify(connections))

  res.json({ success: true, data: { id: result.lastInsertRowid } })
})

// 更新画布项目
router.put('/projects/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const projectId = parseInt(req.params.id)
  const { name, nodes, connections } = req.body

  const project = db.prepare('SELECT id FROM canvas_projects WHERE id = ? AND user_id = ?').get(projectId, userId) as
    | { id: number }
    | undefined

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' })
    return
  }

  const updates: string[] = []
  const params: (string | number)[] = []

  if (name !== undefined) {
    updates.push('name = ?')
    params.push(name)
  }
  if (nodes !== undefined) {
    updates.push('nodes = ?')
    params.push(JSON.stringify(nodes))
  }
  if (connections !== undefined) {
    updates.push('connections = ?')
    params.push(JSON.stringify(connections))
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' })
    return
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(projectId)

  db.prepare(`UPDATE canvas_projects SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  res.json({ success: true })
})

// 删除画布项目
router.delete('/projects/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const projectId = parseInt(req.params.id)

  db.prepare('DELETE FROM canvas_projects WHERE id = ? AND user_id = ?').run(projectId, userId)

  res.json({ success: true })
})

export default router
