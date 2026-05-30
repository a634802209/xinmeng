import { Router } from 'express'
import type { Request, Response } from 'express'
import { success, error, badRequest } from '../utils/response.js'
import { setVerifyCode } from '../utils/redis.js'
import { sendCodeRateLimit } from '../middleware/rateLimit.js'
import { sendVerificationCode, isMailConfigured } from '../services/mailService.js'

const router = Router()

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

router.post('/send-code', sendCodeRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      badRequest(res, '邮箱格式不正确')
      return
    }

    const code = generateCode()
    
    await setVerifyCode(email, code, 300)

    if (isMailConfigured()) {
      try {
        await sendVerificationCode(email, code)
        success(res, null, '验证码已发送')
      } catch (err: any) {
        console.error('[Mail] Failed to send verification code:', err)
        error(res, '邮件发送失败', 500, 500)
      }
    } else {
      console.warn('[Mail] SMTP not configured, returning demo code')
      success(res, { demoCode: code }, '验证码已发送')
    }
  } catch (err: any) {
    console.error('[Email] Send code error:', err)
    error(res, '服务器异常，请重试', 500, 500)
  }
})

export default router
