import type { Response } from 'express'

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
}

export function successWithPagination<T>(
  res: Response,
  list: T[],
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
  msg: string = 'success',
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    code: ResponseCode.SUCCESS,
    msg,
    data: { list, pagination },
  })
}

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
}
