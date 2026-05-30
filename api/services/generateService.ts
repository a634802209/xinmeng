import { v4 as uuidv4 } from 'uuid'
import db, { getConnection } from '../db.js'
import type { ResultSetHeader } from 'mysql2/promise'
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

async function getPrice(key: string): Promise<number> {
  const rows = await db.query<any[]>("SELECT \`value\` FROM settings WHERE \`key\` = ?", [key])
  return parseInt(rows[0]?.value || '0') || (key === 'image_price' ? 10 : 30)
}

export async function createImageTask(userId: number, params: ImageGenerateParams): Promise<GenerateResult> {
  const { prompt, negativePrompt, aspectRatio, quality, count } = params

  const imagePrice = await getPrice('image_price')
  const cost = imagePrice * (count || 1)

  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    const [userRows] = await conn.query<any[]>('SELECT credits FROM users WHERE id = ?', [userId])
    const user = userRows[0]
    if (!user || user.credits < cost) {
      await conn.rollback()
      throw new Error('余额不足，请充值')
    }

    const newBalance = user.credits - cost

    const [updateResult] = await conn.execute<ResultSetHeader>(
      'UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?',
      [cost, userId, cost]
    )

    if (updateResult.affectedRows === 0) {
      await conn.rollback()
      throw new Error('余额不足，请充值')
    }

    await conn.execute<ResultSetHeader>(
      'INSERT INTO credit_records (user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'consume', -cost, newBalance, `图片生成 x${count || 1} - ${prompt.slice(0, 30)}`]
    )

    const taskId = uuidv4()
    await conn.execute<ResultSetHeader>(
      'INSERT INTO generate_tasks (id, user_id, type, prompt, negative_prompt, aspect_ratio, quality, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, userId, 'image', prompt, negativePrompt || '', aspectRatio || '16:9', quality || '标准', count || 1]
    )

    await conn.execute<ResultSetHeader>('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)', [
      userId, 'image', prompt, 'processing',
    ])

    await conn.commit()
    simulateGeneration(taskId)

    return {
      taskId,
      estimatedTime: 15 + Math.floor(Math.random() * 30),
      deductedCredits: cost,
      remainingCredits: newBalance,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function createVideoTask(userId: number, params: VideoGenerateParams): Promise<GenerateResult> {
  const { prompt, style } = params

  const videoPrice = await getPrice('video_price')
  const cost = videoPrice

  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    const [userRows] = await conn.query<any[]>('SELECT credits FROM users WHERE id = ?', [userId])
    const user = userRows[0]
    if (!user || user.credits < cost) {
      await conn.rollback()
      throw new Error('余额不足，请充值')
    }

    const newBalance = user.credits - cost

    const [updateResult] = await conn.execute<ResultSetHeader>(
      'UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?',
      [cost, userId, cost]
    )

    if (updateResult.affectedRows === 0) {
      await conn.rollback()
      throw new Error('余额不足，请充值')
    }

    await conn.execute<ResultSetHeader>(
      'INSERT INTO credit_records (user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'consume', -cost, newBalance, `视频生成 - ${prompt.slice(0, 30)}`]
    )

    const taskId = uuidv4()
    await conn.execute<ResultSetHeader>(
      'INSERT INTO generate_tasks (id, user_id, type, prompt, style) VALUES (?, ?, ?, ?, ?)',
      [taskId, userId, 'video', prompt, style || '默认']
    )

    await conn.execute<ResultSetHeader>('INSERT INTO works (user_id, type, prompt, status) VALUES (?, ?, ?, ?)', [
      userId, 'video', prompt, 'processing',
    ])

    await conn.commit()
    simulateGeneration(taskId, 60000)

    return {
      taskId,
      estimatedTime: 60,
      deductedCredits: cost,
      remainingCredits: newBalance,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function getTaskStatus(taskId: string, userId?: number) {
  const sql = userId
    ? 'SELECT * FROM generate_tasks WHERE id = ? AND user_id = ?'
    : 'SELECT * FROM generate_tasks WHERE id = ?'

  const params = userId ? [taskId, userId] : [taskId]

  const rows = await db.query<any[]>(sql, params)
  const task = rows[0]

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
  const interval = setInterval(async () => {
    try {
      progress += Math.floor(Math.random() * 15) + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        const result = [DEMO_IMAGES[Math.floor(Math.random() * DEMO_IMAGES.length)]]
        await db.execute(
          'UPDATE generate_tasks SET status = ?, progress = ?, result = ?, completed_at = ? WHERE id = ?',
          ['completed', 100, JSON.stringify(result), new Date().toISOString(), taskId]
        )
      } else {
        await db.execute('UPDATE generate_tasks SET status = ?, progress = ? WHERE id = ?', [
          'processing',
          progress,
          taskId,
        ])
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }, intervalMs)
}
