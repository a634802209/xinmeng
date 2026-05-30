import db from '../db'

interface ModelData {
  id: number
  name: string
  input_price: number
  output_price: number
}

export function calculateCost(model: ModelData, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * model.input_price
  const outputCost = (outputTokens / 1000) * model.output_price
  return parseFloat((inputCost + outputCost).toFixed(4))
}

export async function deductBalance(
  userId: number,
  apiKeyId: number,
  modelId: number,
  modelData: ModelData,
  inputTokens: number,
  outputTokens: number,
  requestId: string
): Promise<boolean> {
  const totalCost = calculateCost(modelData, inputTokens, outputTokens)

  try {
    await db.transaction(async (conn) => {
      await conn.execute(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [totalCost, userId]
      )

      await conn.execute(`
        INSERT INTO usage_logs 
        (user_id, api_key_id, model_id, input_tokens, output_tokens, total_cost, request_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, apiKeyId, modelId, inputTokens, outputTokens, totalCost, requestId])
    })

    return true
  } catch (err) {
    console.error('[Billing] 扣费失败:', err)
    return false
  }
}
