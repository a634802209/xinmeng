import { Router } from 'express'
import type { Response } from 'express'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/projects', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const rows = await db.query<any[]>(
    'SELECT id, name, created_at, updated_at FROM canvas_projects WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  )

  res.json({ success: true, data: rows })
})

router.get('/projects/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const projectId = parseInt(req.params.id)

  const rows = await db.query<any[]>(
    'SELECT * FROM canvas_projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  )
  const project = rows[0]

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

router.post('/projects', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const { name, nodes, connections } = req.body

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
    res.status(400).json({ success: false, error: 'Name must be 1-100 characters' })
    return
  }
  if (!Array.isArray(nodes) || !Array.isArray(connections)) {
    res.status(400).json({ success: false, error: 'Nodes and connections must be arrays' })
    return
  }

  const result = await db.execute(
    'INSERT INTO canvas_projects (user_id, name, nodes, connections) VALUES (?, ?, ?, ?)',
    [userId, name, JSON.stringify(nodes), JSON.stringify(connections)]
  )

  res.json({ success: true, data: { id: Number(result.insertId) } })
})

router.put('/projects/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const projectId = parseInt(req.params.id)
  if (isNaN(projectId) || projectId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid project ID' })
    return
  }
  const { name, nodes, connections } = req.body

  const projectRows = await db.query<any[]>('SELECT id FROM canvas_projects WHERE id = ? AND user_id = ?', [projectId, userId])
  if (!projectRows[0]) {
    res.status(404).json({ success: false, error: 'Project not found' })
    return
  }

  const updates: string[] = []
  const params: (string | number)[] = []

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      res.status(400).json({ success: false, error: 'Name must be 1-100 characters' })
      return
    }
    updates.push('name = ?')
    params.push(name.trim())
  }
  if (nodes !== undefined) {
    if (!Array.isArray(nodes)) {
      res.status(400).json({ success: false, error: 'Nodes must be an array' })
      return
    }
    updates.push('nodes = ?')
    params.push(JSON.stringify(nodes))
  }
  if (connections !== undefined) {
    if (!Array.isArray(connections)) {
      res.status(400).json({ success: false, error: 'Connections must be an array' })
      return
    }
    updates.push('connections = ?')
    params.push(JSON.stringify(connections))
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' })
    return
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(projectId)

  await db.execute(`UPDATE canvas_projects SET ${updates.join(', ')} WHERE id = ?`, params)

  res.json({ success: true })
})

router.delete('/projects/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const projectId = parseInt(req.params.id)

  await db.execute('DELETE FROM canvas_projects WHERE id = ? AND user_id = ?', [projectId, userId])

  res.json({ success: true })
})

export default router
