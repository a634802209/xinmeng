import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { updateUserCredits, getUserById } from './userService.js'
import { addCreditRecord } from './creditService.js'

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1515630278258-407f66498911?w=800&q=80',
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=800&q=80',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
  'https://images.unsplash.com/photo-1542259681-d4cd3839ae89?w=800&q=80',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
]

export interface ImageGenerateParams {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
  quality?: string
  count?: number
}

export interface VideoGenerateParams {
  prompt: string
  style?: string
  duration?: number
}

export interface GenerateResult {
  taskId: string
  estimatedTime: number
  deductedCredits: number
  remainingCredits: number
}

function getPrice(key: string): number {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined
  return parseInt(row?.value || '0') || (key === 'image_price' ? 10 : 30)
}

export function createImageTask(userId: number, params: ImageGenerateParams): GenerateResult {
  const { prompt, negativePrompt, aspectRatio, quality, count } = params

  const imagePrice = getPrice('image_price')
  const cost = imagePrice * (count || 1)

  const user = getUserById(userId)
  if (!user || user.credits < cost) {
    throw new Error('余额不足，请充值')
  }

  const newBalance = user.credits - cost
  updateUserCredits(userId, newBalance)
  addCreditRecord(userId, 'consume', -cost, newBalance, `图片生成 x${count || 1} - ${prompt.slice(0, 30)}`)

  const taskId = uuidv4()
  db.prepare(
    'INSERT INTO generate_tasks (id, user_id, type, prompt, negative_prompt, aspect_ratio, quality, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(taskId, userId, 'image', prompt, negativePrompt || '', aspectRatio || '16:9', quality || '标准', count || 1)

  db.prepare('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)').run(
    userId, 'image', prompt, 'processing'
  )

  simulateGeneration(taskId)

  return {
    taskId,
    estimatedTime: 15 + Math.floor(Math.random() * 30),
    deductedCredits: cost,
    remainingCredits: newBalance,
  }
}

export function createVideoTask(userId: number, params: VideoGenerateParams): GenerateResult {
  const { prompt, style } = params

  const videoPrice = getPrice('video_price')
  const cost = videoPrice

  const user = getUserById(userId)
  if (!user || user.credits < cost) {
    throw new Error('余额不足，请充值')
  }

  const newBalance = user.credits - cost
  updateUserCredits(userId, newBalance)
  addCreditRecord(userId, 'consume', -cost, newBalance, `视频生成 - ${prompt.slice(0, 30)}`)

  const taskId = uuidv4()
  db.prepare(
    'INSERT INTO generate_tasks (id, user_id, type, prompt, style) VALUES (?, ?, ?, ?, ?)'
  ).run(taskId, userId, 'video', prompt, style || '默认')

  db.prepare('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)').run(
    userId, 'video', prompt, 'processing'
  )

  simulateGeneration(taskId, 60000)

  return {
    taskId,
    estimatedTime: 60,
    deductedCredits: cost,
    remainingCredits: newBalance,
  }
}

export function getTaskStatus(taskId: string) {
  const task = db.prepare('SELECT * FROM generate_tasks WHERE id = ?').get(taskId) as
    | {
        id: string
        status: string
        progress: number
        result: string
        type: string
      }
    | undefined

  if (!task) return null

  return {
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    result: task.result ? JSON.parse(task.result) : null,
  }
}

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
