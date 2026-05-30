import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'app_db',
}

async function setAdmin() {
  const db = await mysql.createConnection(dbConfig)
  const email = process.argv[2] || '2778193304@qq.com'

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email])
  const user = rows[0]

  if (!user) {
    const [result] = await db.execute(
      'INSERT INTO users (email, nickname, avatar, is_admin) VALUES (?, ?, ?, 1)',
      [email, email.split('@')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`]
    )
    console.log(`Created admin user: ${email} (ID: ${result.insertId})`)
  } else {
    await db.execute('UPDATE users SET is_admin = 1 WHERE email = ?', [email])
    console.log(`Updated user to admin: ${email} (ID: ${user.id})`)
  }

  const [updated] = await db.query('SELECT id, email, is_admin FROM users WHERE email = ?', [email])
  console.log('User:', updated[0])

  await db.end()
}

setAdmin().catch(err => {
  console.error('Failed to set admin:', err)
  process.exit(1)
})
