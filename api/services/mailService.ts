import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER
const SITE_NAME = process.env.SITE_NAME || '新梦AI'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, SMTP_PASS')
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true,
    },
  })

  return transporter
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const trans = getTransporter()
  await trans.sendMail({
    from: `"${SITE_NAME}" <${SMTP_FROM}>`,
    to: email,
    subject: `【${SITE_NAME}】邮箱验证码`,
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${SITE_NAME}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">邮箱验证码</p>
        </div>
        <div style="background: #fff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">您好，</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">您正在进行邮箱验证操作，验证码如下：</p>
          <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3b82f6; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #64748b; margin: 0 0 8px;">验证码有效期为 <strong>10 分钟</strong>，请勿泄露给他人。</p>
          <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #f1f5f9;">如非本人操作，请忽略此邮件。</p>
        </div>
      </div>
    `,
    text: `【${SITE_NAME}】您的验证码是：${code}，有效期10分钟。如非本人操作请忽略。`,
  })
}

export async function sendPasswordReset(email: string, resetToken: string, resetUrl: string): Promise<void> {
  const trans = getTransporter()
  await trans.sendMail({
    from: `"${SITE_NAME}" <${SMTP_FROM}>`,
    to: email,
    subject: `【${SITE_NAME}】密码重置`,
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${SITE_NAME}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">密码重置</p>
        </div>
        <div style="background: #fff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">您好，</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">您申请了密码重置，请点击下方按钮完成操作：</p>
          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${resetUrl}?token=${resetToken}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 600;">重置密码</a>
          </div>
          <p style="font-size: 14px; color: #64748b; margin: 0 0 8px;">链接有效期为 <strong>30 分钟</strong>。</p>
          <p style="font-size: 13px; color: #94a3b8; margin: 16px 0 0;">如果按钮无法点击，请复制以下链接到浏览器：</p>
          <p style="font-size: 12px; color: #3b82f6; word-break: break-all; margin: 8px 0 0;">${resetUrl}?token=${resetToken}</p>
          <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #f1f5f9;">如非本人操作，请忽略此邮件。</p>
        </div>
      </div>
    `,
    text: `【${SITE_NAME}】请点击链接重置密码：${resetUrl}?token=${resetToken}（有效期30分钟）`,
  })
}

export async function sendSystemNotification(email: string, title: string, content: string): Promise<void> {
  const trans = getTransporter()
  await trans.sendMail({
    from: `"${SITE_NAME}" <${SMTP_FROM}>`,
    to: email,
    subject: `【${SITE_NAME}】${title}`,
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${SITE_NAME}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">系统通知</p>
        </div>
        <div style="background: #fff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <h2 style="font-size: 18px; margin: 0 0 16px; color: #1e293b;">${title}</h2>
          <div style="font-size: 15px; line-height: 1.6; color: #475569;">${content}</div>
          <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #f1f5f9;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      </div>
    `,
    text: `【${SITE_NAME}】${title}\n\n${content}`,
  })
}

export function isMailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS)
}
