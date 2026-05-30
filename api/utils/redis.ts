import redis from 'redis'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')

let redisClient: redis.RedisClientType | null = null

export async function getRedisClient(): Promise<redis.RedisClientType> {
  if (!redisClient) {
    redisClient = redis.createClient({
      socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
  })
    await redisClient.connect()
    console.log(`[Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`)
  }
  return redisClient
}

/**
 * 设置缓存
 */
export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  const client = await getRedisClient()
  if (ttl) {
    await client.setEx(key, ttl, typeof value === 'string' ? value : JSON.stringify(value))
  } else {
    await client.set(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
}

/**
 * 获取缓存
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = await getRedisClient()
  const value = await client.get(key)
  if (value === null) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return value as unknown as T
  }
}

/**
 * 删除缓存
 */
export async function delCache(key: string): Promise<void> {
  const client = await getRedisClient()
  await client.del(key)
}

/**
 * 邮箱验证码相关
 */
export async function setVerifyCode(email: string, code: string, ttl: number = 300): Promise<void> {
  await setCache(`verify:${email}`, code, ttl)
}

export async function getVerifyCode(email: string): Promise<string | null> {
  return getCache<string>(`verify:${email}`)
}

export async function delVerifyCode(email: string): Promise<void> {
  await delCache(`verify:${email}`)
}

/**
 * 登录会话相关
 */
export async function setSession(token: string, userId: number, ttl: number = 86400 * 7): Promise<void> {
  await setCache(`session:${token}`, { userId }, ttl)
}

export async function getSession(token: string): Promise<{ userId: number } | null> {
  return getCache<{ userId: number }>(`session:${token}`)
}

export async function delSession(token: string): Promise<void> {
  await delCache(`session:${token}`)
}

/**
 * 接口限流相关
 */
export async function incrAndGetRateLimit(key: string, ttl: number = 60): Promise<number> {
  const client = await getRedisClient()
  const count = await client.incr(`ratelimit:${key}`)
  if (count === 1) {
    await client.expire(`ratelimit:${key}`, ttl)
  }
  return count
}

/**
 * 生成任务状态缓存
 */
export async function setTaskStatus(taskId: string, status: any, ttl: number = 3600): Promise<void> {
  await setCache(`task:${taskId}`, status, ttl)
}

export async function getTaskStatus(taskId: string): Promise<any> {
  return getCache(`task:${taskId}`)
}

export default {
  getRedisClient,
  setCache,
  getCache,
  delCache,
  setVerifyCode,
  getVerifyCode,
  delVerifyCode,
  setSession,
  getSession,
  delSession,
  incrAndGetRateLimit,
  setTaskStatus,
  getTaskStatus,
}
