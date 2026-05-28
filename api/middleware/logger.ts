import type { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  res.on('finish', () => {
    const duration = Date.now() - start
    const method = req.method
    const path = req.path
    const status = res.statusCode
    const ip = req.ip || req.socket.remoteAddress || '-'

    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
    const resetColor = '\x1b[0m'

    console.log(
      `${timestamp} ${ip} ${method} ${path} ${statusColor}${status}${resetColor} ${duration}ms`
    )
  })

  next()
}
