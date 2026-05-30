import mysql from 'mysql2/promise'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'app_db',
}

async function initAdmin() {
  const db = await mysql.createConnection(dbConfig)

  const [rows] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_admin = 1')
  const adminCount = (rows as any)[0].count

  if (adminCount > 0) {
    console.log('系统中已有管理员账号，无需初始化。')
    await db.end()
    process.exit(0)
  }

  const email = 'admin@xinmeng.ai'
  await db.query(
    'INSERT IGNORE INTO users (email, nickname, is_admin, credits) VALUES (?, ?, ?, ?)',
    [email, '系统管理员', 1, 999999]
  )

  const [insertResult] = await db.query('SELECT ROW_COUNT() as affected')
  const affected = (insertResult as any)[0].affected

  if (affected > 0) {
    console.log(`✅ 管理员账号创建成功！`)
    console.log(`   邮箱: ${email}`)
    console.log(`   密码: 使用邮箱验证码登录（演示模式输入 123456）`)
    console.log('')
    console.log('👉 访问 /login 登录后，顶部栏会出现「管理后台」入口')
  } else {
    await db.query('UPDATE users SET is_admin = 1 WHERE email = ?', [email])
    console.log(`✅ 已将 ${email} 设为管理员`)
  }

  await db.end()
}

initAdmin().catch(err => {
  console.error('初始化失败:', err)
  process.exit(1)
})
