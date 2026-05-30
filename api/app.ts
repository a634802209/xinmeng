import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import { requestLogger } from './middleware/logger.js'
import { securityMiddleware, auditLogMiddleware } from './middleware/security.js'
import authRoutes from './routes/auth.js'
import generateRoutes from './routes/generate.js'
import worksRoutes from './routes/works.js'
import userRoutes from './routes/user.js'
import adminRoutes from './routes/admin.js'
import adminAuthRoutes from './routes/adminAuth.js'
import securityRoutes from './routes/security.js'
import channelRoutes from './routes/channels.js'
import creditRoutes from './routes/credits.js'
import canvasRoutes from './routes/canvas.js'
import configRoutes from './routes/config.js'
import paymentRoutes from './routes/payment.js'
import membershipRoutes from './routes/membership.js'
import chatRoutes from './routes/chat.js'
import notificationRoutes from './routes/notification.js'
import templateRoutes from './routes/template.js'
import modelRoutes from './routes/model.js'
import feedbackRoutes from './routes/feedback.js'
import settingsRoutes from './routes/settings.js'
import galleryRoutes from './routes/gallery.js'
import communityRoutes from './routes/community.js'
import uploadRoutes from './routes/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
initDB()

const app = express()

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))

// CORS with whitelist
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4173').split(',').map((s) => s.trim())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '请求过于频繁，请稍后再试', data: null },
})
app.use('/api/', generalLimiter)

const codeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '验证码发送过于频繁，请稍后再试', data: null },
})
app.use('/api/auth/send-code', codeLimiter)

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '生成请求过于频繁，请稍后再试', data: null },
})
app.use('/api/generate/', generateLimiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Security middleware: IP blacklist, device blacklist, brute force detection
app.use(securityMiddleware)

// Request logging
app.use(requestLogger)

// Audit logging for all API requests
app.use('/api/', auditLogMiddleware)

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/works', worksRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin-auth', adminAuthRoutes)
app.use('/api/security', securityRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/credits', creditRoutes)
app.use('/api/canvas', canvasRoutes)
app.use('/api/config', configRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/membership', membershipRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/models', modelRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/gallery', galleryRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/upload', uploadRoutes)

app.use('/api/health', (_req, res) => {
  res.status(200).json({ code: 0, msg: 'ok', data: null })
})

const distPath = path.join(__dirname, '../dist')
const uploadsPath = path.join(__dirname, '../public/uploads')

app.use('/uploads', express.static(uploadsPath))
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[Server Error]`, error)
  const isDev = process.env.NODE_ENV === 'development'
  res.status(500).json({
    code: 500,
    msg: isDev ? error.message : 'Server internal error',
    data: null,
  })
})

export default app
