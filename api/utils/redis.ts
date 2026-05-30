import { createClient, type RedisClientType } from 'redis'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')

console.log(`[Redis] Configuration: host=${REDIS_HOST}:${REDIS_PORT}`)

let redisClient: RedisClientType | null = null

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] Client error:', err)
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully')
    })

    await redisClient.connect()
  }
  return redisClient
}

export async function setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
  const client = await getRedisClient()
  const strValue = typeof value === 'string' ? value : JSON.stringify(value)
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, strValue)
  } else {
    await client.set(key, strValue)
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const client = await getRedisClient()
  const value = await client.get(key)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value as T
  }
}

export async function delCache(key: string): Promise<void> {
  const client = await getRedisClient()
  await client.del(key)
}

export async function existsCache(key: string): Promise<boolean> {
  const client = await getRedisClient()
  const exists = await client.exists(key)
  return exists > 0
}

export async function incrCache(key: string): Promise<number> {
  const client = await getRedisClient()
  return await client.incr(key)
}

export async function expireCache(key: string, ttlSeconds: number): Promise<void> {
  const client = await getRedisClient()
  await client.expire(key, ttlSeconds)
}

export default { getRedisClient, setCache, getCache, delCache, existsCache, incrCache, expireCache }
