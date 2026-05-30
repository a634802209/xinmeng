import type { Response } from 'express'

<<<<<<< HEAD
/**
 * 统一成功响应格式
 */
export function success<T>(res: Response, data: T, msg: string = '请求成功', statusCode: number = 200): void {
  res.status(statusCode).json({ code: 200, msg, data })
=======
export const ResponseCode = {
  SUCCESS: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type ResponseCodeType = typeof ResponseCode[keyof typeof ResponseCode]

export function success<T>(res: Response, data: T, msg: string = 'success', statusCode: number = 200): void {
  res.status(statusCode).json({
    code: ResponseCode.SUCCESS,
    msg,
    data,
  })
>>>>>>> eabb14488c26617ad390a6d359b8ff609064cd21
}

/**
 * 带分页的成功响应
 */
export function successWithPagination<T>(
  res: Response,
  list: T[],
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
<<<<<<< HEAD
  msg: string = '请求成功',
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    code: 200,
=======
  msg: string = 'success',
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    code: ResponseCode.SUCCESS,
>>>>>>> eabb14488c26617ad390a6d359b8ff609064cd21
    msg,
    data: { list, pagination },
  })
}

<<<<<<< HEAD
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
=======
export function error(res: Response, msg: string, code: ResponseCodeType = ResponseCode.BAD_REQUEST, statusCode: number = 400): void {
  res.status(statusCode).json({
    code,
    msg,
    data: null,
  })
}

export function unauthorized(res: Response, msg: string = 'Unauthorized'): void {
  error(res, msg, ResponseCode.UNAUTHORIZED, 401)
}

export function forbidden(res: Response, msg: string = 'Forbidden'): void {
  error(res, msg, ResponseCode.FORBIDDEN, 403)
}

export function notFound(res: Response, msg: string = 'Not found'): void {
  error(res, msg, ResponseCode.NOT_FOUND, 404)
}

export function serverError(res: Response, msg: string = 'Server internal error'): void {
  error(res, msg, ResponseCode.INTERNAL_SERVER_ERROR, 500)
}

export function apiSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  success(res, data, 'success', statusCode)
}

export function apiError(res: Response, msg: string, statusCode: number = 400): void {
  error(res, msg, ResponseCode.BAD_REQUEST, statusCode)
>>>>>>> eabb14488c26617ad390a6d359b8ff609064cd21
}
