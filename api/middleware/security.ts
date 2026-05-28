import type { Request, Response, NextFunction } from 'express'
import db from '../db.js'

export interface SecurityRequest extends Request {
  fingerprint?: string
  clientIp?: string
  isBlocked?: boolean
  blockReason?: string
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string') {
    return realIp
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function getFingerprint(req: Request): string {
  const ua = req.headers['user-agent'] || ''
  const accept = req.headers['accept'] || ''
  const lang = req.headers['accept-language'] || ''
  const encoding = req.headers['accept-encoding'] || ''
  const raw = `${ua}|${accept}|${lang}|${encoding}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `fp_${Math.abs(hash).toString(36)}`
}

function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ]
  return privateRanges.some((r) => r.test(ip))
}

export function securityMiddleware(req: SecurityRequest, res: Response, next: NextFunction): void {
  const clientIp = getClientIp(req)
  const fingerprint = getFingerprint(req)
  req.clientIp = clientIp
  req.fingerprint = fingerprint

  if (isPrivateIP(clientIp)) {
    next()
    return
  }

  const now = new Date().toISOString()

  const ipBlocked = db.prepare(
    `SELECT 1 FROM ip_blacklist WHERE ip = ? AND (expires_at IS NULL OR expires_at > ?)`
  ).get(clientIp, now) as { '1': number } | undefined

  if (ipBlocked) {
    req.isBlocked = true
    req.blockReason = 'IP_BLACKLIST'
    logAccess(req, res, 403, 'IP_BLOCKED')
    res.status(403).json({ success: false, error: 'Access denied: IP blocked' })
    return
  }

  const deviceBlocked = db.prepare(
    `SELECT 1 FROM device_blacklist WHERE fingerprint = ? AND (expires_at IS NULL OR expires_at > ?)`
  ).get(fingerprint, now) as { '1': number } | undefined

  if (deviceBlocked) {
    req.isBlocked = true
    req.blockReason = 'DEVICE_BLACKLIST'
    logAccess(req, res, 403, 'DEVICE_BLOCKED')
    res.status(403).json({ success: false, error: 'Access denied: Device blocked' })
    return
  }

  const failedAttempts = db.prepare(
    `SELECT COUNT(*) as count FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > datetime('now', '-30 minutes')`
  ).get(clientIp) as { count: number }

  if (failedAttempts.count >= 10) {
    req.isBlocked = true
    req.blockReason = 'BRUTE_FORCE'
    logAccess(req, res, 429, 'TOO_MANY_FAILED_LOGINS')
    res.status(429).json({ success: false, error: 'Too many failed login attempts. Try again later.' })
    return
  }

  next()
}

export function logAccess(req: SecurityRequest, res: Response, statusCode?: number, blockReason?: string): void {
  try {
    const ip = req.clientIp || getClientIp(req)
    const fingerprint = req.fingerprint || getFingerprint(req)
    const userId = (req as any).user?.id || null
    const method = req.method
    const path = req.path
    const userAgent = req.headers['user-agent'] || null
    const code = statusCode || res.statusCode
    const blocked = blockReason ? 1 : 0
    const reason = blockReason || null

    let riskScore = 0
    if (blocked) riskScore += 100
    if (!userAgent) riskScore += 20
    if (userAgent && userAgent.length < 20) riskScore += 10
    if (method !== 'GET' && method !== 'POST') riskScore += 5

    db.prepare(
      `INSERT INTO access_audit_logs (ip, fingerprint, user_id, method, path, status_code, user_agent, risk_score, is_blocked, block_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(ip, fingerprint, userId, method, path, code, userAgent, riskScore, blocked, reason)
  } catch (err) {
    console.error('[Security] Failed to log access:', err)
  }
}

export function auditLogMiddleware(req: SecurityRequest, res: Response, next: NextFunction): void {
  const originalEnd = res.end.bind(res)
  let ended = false

  res.end = function (this: Response, ...args: any[]) {
    if (!ended) {
      ended = true
      logAccess(req, res)
    }
    return originalEnd.apply(this, args)
  } as any

  next()
}

export function trackLoginAttempt(ip: string, email: string | null, fingerprint: string | null, success: boolean): void {
  try {
    db.prepare(
      `INSERT INTO login_attempts (ip, email, fingerprint, success) VALUES (?, ?, ?, ?)`
    ).run(ip, email, fingerprint, success ? 1 : 0)

    if (!success) {
      const failed = db.prepare(
        `SELECT COUNT(*) as count FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > datetime('now', '-30 minutes')`
      ).get(ip) as { count: number }

      if (failed.count >= 10) {
        console.warn(`[Security] IP ${ip} has ${failed.count} failed login attempts. Consider blacklisting.`)
      }
    }
  } catch (err) {
    console.error('[Security] Failed to track login attempt:', err)
  }
}
