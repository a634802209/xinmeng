import { z } from 'zod'

export const emailSchema = z.string().email('邮箱格式不正确')

export const loginSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, '验证码必须是6位数字'),
})

export const imageGenerateSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空').max(2000, '提示词最多2000字'),
  negativePrompt: z.string().max(1000).optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:2', '21:9']).optional(),
  quality: z.string().optional(),
  count: z.number().int().min(1).max(10).optional(),
})

export const videoGenerateSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空').max(2000, '提示词最多2000字'),
  style: z.string().optional(),
  duration: z.number().int().optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ValidateResult<T> =
  | { success: true; data: T; error?: undefined }
  | { success: false; error: string; data?: undefined }

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidateResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errorMessage = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
  return { success: false, error: errorMessage }
}
