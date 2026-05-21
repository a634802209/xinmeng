import { Router } from 'express'
import type { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1515630278258-407f66498911?w=800&q=80',
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=800&q=80',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
  'https://images.unsplash.com/photo-1542259681-d4cd3839ae89?w=800&q=80',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
]

router.post('/image', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const { prompt, negativePrompt, style, aspectRatio, quality, count, seed, isPublic } = req.body

  if (!prompt) {
    res.status(400).json({ success: false, error: 'Prompt is required' })
    return
  }

  const taskId = uuidv4()
  db.prepare(
    'INSERT INTO generate_tasks (id, user_id, type, prompt, negative_prompt, style, aspect_ratio, quality, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(taskId, userId, 'image', prompt, negativePrompt || '', style || '赛博朋克', aspectRatio || '16:9', quality || '标准', count || 1)

  db.prepare('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)').run(
    userId, 'image', prompt, 'processing'
  )

  const estimatedTime = 15 + Math.floor(Math.random() * 30)

  simulateGeneration(taskId)

  res.json({
    success: true,
    taskId,
    estimatedTime,
  })
})

router.post('/video', authMiddleware, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id
  const { prompt, style, duration } = req.body

  if (!prompt) {
    res.status(400).json({ success: false, error: 'Prompt is required' })
    return
  }

  const taskId = uuidv4()
  db.prepare(
    'INSERT INTO generate_tasks (id, user_id, type, prompt, style) VALUES (?, ?, ?, ?, ?)'
  ).run(taskId, userId, 'video', prompt, style || '默认')

  db.prepare('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)').run(
    userId, 'video', prompt, 'processing'
  )

  simulateGeneration(taskId, 60000)

  res.json({
    success: true,
    taskId,
    estimatedTime: 60,
  })
})

router.get('/status/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const task = db.prepare('SELECT * FROM generate_tasks WHERE id = ?').get(req.params.id) as
    | {
        id: string
        status: string
        progress: number
        result: string
        type: string
      }
    | undefined

  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }

  res.json({
    success: true,
    task: {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      result: task.result ? JSON.parse(task.result) : null,
    },
  })
})

function simulateGeneration(taskId: string, intervalMs: number = 2000) {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
      const result = [DEMO_IMAGES[Math.floor(Math.random() * DEMO_IMAGES.length)]]
      db.prepare(
        'UPDATE generate_tasks SET status = ?, progress = ?, result = ?, completed_at = ? WHERE id = ?'
      ).run('completed', 100, JSON.stringify(result), new Date().toISOString(), taskId)
    } else {
      db.prepare('UPDATE generate_tasks SET status = ?, progress = ? WHERE id = ?').run(
        'processing',
        progress,
        taskId
      )
    }
  }, intervalMs)
}

export default router
