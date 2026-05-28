import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, '../../data/app.db'))

const email = process.argv[2] || '2778193304@qq.com'

// 确保用户存在并设置为管理员
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
if (!user) {
  // 创建用户
  const result = db.prepare(
    'INSERT INTO users (email, nickname, avatar, is_admin) VALUES (?, ?, ?, 1)'
  ).run(email, email.split('@')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`)
  console.log(`Created admin user: ${email} (ID: ${result.lastInsertRowid})`)
} else {
  // 更新为管理员
  db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email)
  console.log(`Updated user to admin: ${email} (ID: ${user.id})`)
}

// 验证
const updated = db.prepare('SELECT id, email, is_admin FROM users WHERE email = ?').get(email)
console.log('User:', updated)

db.close()
