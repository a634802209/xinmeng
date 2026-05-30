import db from '../db.js'

export interface GalleryWork {
  id: number
  userId: number
  userName: string
  userAvatar: string | null
  type: string
  prompt: string
  resultUrl: string | null
  thumbnailUrl: string | null
  status: string
  isPublic: number
  likesCount: number
  category: string | null
  createdAt: string
}

export interface GalleryFilter {
  type?: string
  category?: string
  sort?: 'latest' | 'popular'
  page?: number
  limit?: number
}

const CATEGORIES = [
  '全部',
  '赛博朋克',
  '国风山水',
  '二次元',
  '写实摄影',
  '抽象艺术',
  '科幻未来',
  '自然风景',
  '人物肖像',
  '建筑设计',
  '其他',
]

export function getCategories(): string[] {
  return CATEGORIES
}

export async function getGalleryWorks(filter: GalleryFilter = {}): Promise<{
  works: GalleryWork[]
  total: number
  hasMore: boolean
}> {
  const { type, category, sort = 'latest', page = 1, limit = 20 } = filter

  let whereClause = 'WHERE w.is_public = 1 AND w.status = \'completed\''
  const params: any[] = []

  if (type && type !== 'all') {
    whereClause += ' AND w.type = ?'
    params.push(type)
  }

  if (category && category !== '全部') {
    whereClause += ' AND w.category = ?'
    params.push(category)
  }

  const orderBy = sort === 'popular'
    ? 'ORDER BY w.likes_count DESC, w.created_at DESC'
    : 'ORDER BY w.created_at DESC'

  const [countRows] = await db.query<any[]>(`SELECT COUNT(*) as total FROM works w ${whereClause}`, params)
  const countResult = countRows[0]

  const offset = (page - 1) * limit
  const [workRows] = await db.query<any[]>(
    `
      SELECT
        w.id,
        w.user_id as userId,
        u.nickname as userName,
        u.avatar as userAvatar,
        w.type,
        w.prompt,
        w.result_url as resultUrl,
        w.thumbnail_url as thumbnailUrl,
        w.status,
        w.is_public as isPublic,
        w.likes_count as likesCount,
        w.category,
        w.created_at as createdAt
      FROM works w
      LEFT JOIN users u ON w.user_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  )

  const works = workRows

  return {
    works: works.map((w) => ({
      id: w.id,
      userId: w.userId,
      userName: w.userName || '匿名用户',
      userAvatar: w.userAvatar,
      type: w.type,
      prompt: w.prompt,
      resultUrl: w.resultUrl,
      thumbnailUrl: w.thumbnailUrl,
      status: w.status,
      isPublic: w.isPublic,
      likesCount: w.likesCount,
      category: w.category,
      createdAt: w.createdAt,
    })),
    total: countResult.total,
    hasMore: countResult.total > page * limit,
  }
}

export async function likeWork(workId: number): Promise<boolean> {
  const result = await db.execute('UPDATE works SET likes_count = likes_count + 1 WHERE id = ?', [workId])
  return result.affectedRows > 0
}

export async function getWorkById(workId: number): Promise<GalleryWork | null> {
  const [rows] = await db.query<any[]>(
    `
      SELECT
        w.id,
        w.user_id as userId,
        u.nickname as userName,
        u.avatar as userAvatar,
        w.type,
        w.prompt,
        w.result_url as resultUrl,
        w.thumbnail_url as thumbnailUrl,
        w.status,
        w.is_public as isPublic,
        w.likes_count as likesCount,
        w.category,
        w.created_at as createdAt
      FROM works w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `,
    [workId]
  )
  const work = rows[0]

  if (!work) return null

  return {
    id: work.id,
    userId: work.userId,
    userName: work.userName || '匿名用户',
    userAvatar: work.userAvatar,
    type: work.type,
    prompt: work.prompt,
    resultUrl: work.resultUrl,
    thumbnailUrl: work.thumbnailUrl,
    status: work.status,
    isPublic: work.isPublic,
    likesCount: work.likesCount,
    category: work.category,
    createdAt: work.createdAt,
  }
}
