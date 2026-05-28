import type { Response } from 'express'

export function success<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json({ success: true, data })
}

export function successWithPagination<T>(
  res: Response,
  list: T[],
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    data: { list, pagination },
  })
}

export function error(res: Response, message: string, statusCode: number = 400): void {
  res.status(statusCode).json({ success: false, error: message })
}

export function unauthorized(res: Response, message: string = 'Unauthorized'): void {
  error(res, message, 401)
}

export function forbidden(res: Response, message: string = 'Forbidden'): void {
  error(res, message, 403)
}

export function notFound(res: Response, message: string = 'Not found'): void {
  error(res, message, 404)
}
