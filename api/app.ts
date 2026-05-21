import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import generateRoutes from './routes/generate.js'
import worksRoutes from './routes/works.js'
import userRoutes from './routes/user.js'
import adminRoutes from './routes/admin.js'
import channelRoutes from './routes/channels.js'
import creditRoutes from './routes/credits.js'
import canvasRoutes from './routes/canvas.js'
import configRoutes from './routes/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
initDB()

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/works', worksRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/credits', creditRoutes)
app.use('/api/canvas', canvasRoutes)
app.use('/api/config', configRoutes)

app.use('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'ok' })
})

const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.use((error: Error, _req: express.Request, res: express.Response) => {
  console.error(error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

export default app
