import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { success, error, notFound } from '../utils/response.js'
import db from '../db.js'
import { getCache } from '../utils/redis.js'
import { getCOSFileUrl } from '../utils/cos.js'

const router = Router()

router.get('/init', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    const [userRows] = await db.query<any[]>('SELECT nickname, avatar, credits as remain_power, is_member as isMember FROM users WHERE id = ?', [userId])
    if (userRows.length === 0) {
      notFound(res, '用户不存在')
      return
    }
    const user = userRows[0]

    const [worksRows] = await db.query<any[]>(
      'SELECT id, type as work_name, result_url as file_path, created_at FROM works WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    const workList = worksRows.map((item: any) => ({
      workId: item.id,
      workName: item.work_name,
      fileUrl: item.file_path ? getCOSFileUrl(item.file_path) : null,
      createTime: item.created_at,
    }))

    const unreadMsg = await getCache<number>(`msg_unread:${userId}`) || 0

    success(res, {
      userInfo: {
        nickname: user.nickname,
        avatar: user.avatar,
        remain_power: user.remain_power,
        isMember: !!user.isMember,
      },
      unreadMsg: Number(unreadMsg),
      workList,
    }, '数据加载成功')
  } catch (err: any) {
    console.error('[Home] Init error:', err)
    error(res, '数据加载失败', 500, 500)
  }
})

export default router
