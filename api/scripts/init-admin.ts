import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, '../../data/app.db'))

// 检查是否已有管理员
const adminCount = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get() as { count: number }).count

if (adminCount > 0) {
  console.log('系统中已有管理员账号，无需初始化。')
  process.exit(0)
}

// 创建一个默认管理员账号
const email = 'admin@xinmeng.ai'
const result = db.prepare(
  'INSERT OR IGNORE INTO users (email, nickname, is_admin, credits) VALUES (?, ?, ?, ?)'
).run(email, '系统管理员', 1, 999999)

if (result.changes > 0) {
  console.log(`✅ 管理员账号创建成功！`)
  console.log(`   邮箱: ${email}`)
  console.log(`   密码: 使用邮箱验证码登录（演示模式输入 123456）`)
  console.log('')
  console.log('👉 访问 /login 登录后，顶部栏会出现「管理后台」入口')
} else {
  // 如果邮箱已存在，直接设为管理员
  db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email)
  console.log(`✅ 已将 ${email} 设为管理员`)
}
