import db from '../db.js'

export interface Model {
  id: number
  name: string
  description: string | null
  type: string
  provider: string | null
  price: number
  isActive: boolean
  config: Record<string, unknown> | null
}

export function getModels(type?: string): Model[] {
  let sql = 'SELECT * FROM models WHERE is_active = 1'
  const params: string[] = []

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }

  sql += ' ORDER BY type, name'

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number
    name: string
    description: string | null
    type: string
    provider: string | null
    price: number
    is_active: number
    config: string | null
  }>

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    provider: r.provider,
    price: r.price,
    isActive: !!r.is_active,
    config: r.config ? JSON.parse(r.config) : null,
  }))
}

export function getModelById(id: number): Model | undefined {
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id) as
    | {
        id: number
        name: string
        description: string | null
        type: string
        provider: string | null
        price: number
        is_active: number
        config: string | null
      }
    | undefined

  if (!row) return undefined

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    provider: row.provider,
    price: row.price,
    isActive: !!row.is_active,
    config: row.config ? JSON.parse(row.config) : null,
  }
}
