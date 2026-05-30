import db from '../db.js'

export interface Template {
  id: number
  name: string
  description: string | null
  category: string
  thumbnail: string | null
  prompt: string
  type: string
  isHot: boolean
  usageCount: number
}

export async function getTemplates(category?: string, type?: string): Promise<Template[]> {
  let sql = 'SELECT * FROM templates WHERE 1=1'
  const params: (string | number)[] = []

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }
  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }

  sql += ' ORDER BY is_hot DESC, usage_count DESC'

  const [rows] = await db.query<any[]>(sql, params)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    thumbnail: r.thumbnail,
    prompt: r.prompt,
    type: r.type,
    isHot: !!r.is_hot,
    usageCount: r.usage_count,
  }))
}

export async function getTemplateById(id: number): Promise<Template | undefined> {
  const [rows] = await db.query<any[]>('SELECT * FROM templates WHERE id = ?', [id])
  const row = rows[0]

  if (!row) return undefined

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    thumbnail: row.thumbnail,
    prompt: row.prompt,
    type: row.type,
    isHot: !!row.is_hot,
    usageCount: row.usage_count,
  }
}

export async function incrementUsageCount(id: number): Promise<void> {
  await db.execute('UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?', [id])
}
