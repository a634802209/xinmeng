import type { Response } from 'express'

/**
 * 统一成功响应格式
 */
export function success<T>(res: Response, data: T, msg: string = '请求成功', statusCode: number = 200): void {
  res.status(statusCode).json({ code: 200, msg, data })
}

/**
 * 带分页的成功响应
 */
export function successWithPagination<T>(
  res: Response,
  list: T[],
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
  msg: string = '请求成功',
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    code: 200,
    msg,
    data: { list, pagination },
  })
}

/**
 * 统一错误响应格式
 */
export function error(res: Response, msg: string, statusCode: number = 400, code?: number): void {
  res.status(statusCode).json({ code: code || statusCode, msg, data: null })
}

export function unauthorized(res: Response, msg: string = '未登录或Token已失效'): void {
  error(res, msg, 401, 401)
}

export function forbidden(res: Response, msg: string = '无权访问'): void {
  error(res, msg, 403, 403)
}

export function notFound(res: Response, msg: string = '资源不存在'): void {
  error(res, msg, 404, 404)
}

/**
 * 参数错误响应
 */
export function badRequest(res: Response, msg: string = '参数错误'): void {
  error(res, msg, 400, 400)
}

/**
 * 服务器内部错误响应
 */
export function serverError(res: Response, msg: string = '服务器内部错误'): void {
  error(res, msg, 500, 500)
}
