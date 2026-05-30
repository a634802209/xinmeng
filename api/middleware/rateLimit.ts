import type { Request, Response, NextFunction } from 'express'
import { incrAndGetRateLimit } from '../utils/redis.js'
import { error } from '../utils/response.js'

interface RateLimitConfig {
  limit: number
  windowSeconds: number
  keyGenerator?: (req: Request) => string
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
  keyGenerator: (req) => `ip:${req.ip}`,
}

export function rateLimit(config?: Partial<RateLimitConfig>) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = cfg.keyGenerator!(req)
      const count = await incrAndGetRateLimit(key, cfg.windowSeconds)

      if (count > cfg.limit) {
        return error(res, '请求过于频繁，请稍后再试', 429)
      }

      next()
    } catch (err) {
      // Redis出错时不阻断请求
      console.error('[RateLimit] Error:', err)
      next()
    }
  }
}

// 预设的限流配置
export const loginRateLimit = rateLimit({
  limit: 5,
  windowSeconds: 300,
  keyGenerator: (req) => `login:${req.ip}`,
})

export const sendCodeRateLimit = rateLimit({
  limit: 3,
  windowSeconds: 60,
  keyGenerator: (req) => `sendcode:${req.ip}`,
})

export const generateRateLimit = rateLimit({
  limit: 10,
  windowSeconds: 60,
  keyGenerator: (req) => `generate:${req.ip}`,
})
