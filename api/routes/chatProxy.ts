import express from 'express'
import { Request, Response } from 'express'
import { OpenAI } from 'openai'
import { apiKeyAuthMiddleware } from '../middleware/apiKeyAuth'
import { deductBalance } from '../services/billingService'
import db from '../db'

const router = express.Router()

router.post('/v1/chat/completions', apiKeyAuthMiddleware, async (req: Request, res: Response) => {
  const { model, messages, stream = false } = req.body
  const userId = req.user?.id
  const apiKeyId = req.apiKeyId

  if (!userId || !apiKeyId) {
    res.status(401).json({ error: '鉴权失败' })
    return
  }

  try {
    const [modelRows] = await db.query<any[]>(
      'SELECT * FROM models WHERE name = ? AND status = "active"',
      [model]
    )
    if (modelRows.length === 0) {
      res.status(400).json({ error: '不支持的模型' })
      return
    }
    const modelData = modelRows[0]

    const openai = new OpenAI({
      apiKey: modelData.api_key,
      baseURL: modelData.base_url
    })

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const completion = await openai.chat.completions.create({
        model,
        messages,
        stream: true
      })

      let inputTokens = 0
      let outputTokens = 0
      let requestId = ''

      for await (const chunk of completion) {
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || 0
          outputTokens = chunk.usage.completion_tokens || 0
        }
        if (chunk.id) requestId = chunk.id

        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }

      const estimatedInputTokens = messages.reduce((acc: number, msg: any) => acc + (msg.content?.length || 0) / 4, 0)
      await deductBalance(
        userId, apiKeyId, modelData.id, modelData,
        Math.round(estimatedInputTokens), outputTokens, requestId || `req_${Date.now()}`
      )
      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      const completion = await openai.chat.completions.create({
        model,
        messages
      })

      await deductBalance(
        userId, apiKeyId, modelData.id, modelData,
        completion.usage?.prompt_tokens || 0,
        completion.usage?.completion_tokens || 0,
        completion.id
      )

      res.json(completion)
    }
  } catch (err) {
    console.error('[Chat Proxy] 中转请求失败:', err)
    res.status(500).json({ error: '上游服务请求失败' })
  }
})

export default router
