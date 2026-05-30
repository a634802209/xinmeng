import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise'

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT || '3306')
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'xinmeng'

let pool: Pool | null = null

export async function getConnection(): Promise<PoolConnection> {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool.getConnection()
}

export async function query<T extends RowDataPacket[] | ResultSetHeader>(
  sql: string,
  params?: any[]
): Promise<T> {
  const conn = await getConnection()
  try {
    const [rows] = await conn.execute<T>(sql, params)
    return rows
  } finally {
    conn.release()
  }
}

export async function execute(
  sql: string,
  params?: any[]
): Promise<ResultSetHeader> {
  const conn = await getConnection()
  try {
    const [result] = await conn.execute<ResultSetHeader>(sql, params)
    return result
  } finally {
    conn.release()
  }
}

export async function transaction<T>(
  callback: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getConnection()
  try {
    await conn.beginTransaction()
    const result = await callback(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function initDB(): Promise<void> {
  try {
    console.log(`[DB] Initializing MySQL database at: ${DB_HOST}:${DB_PORT}/${DB_NAME}`)

    const initConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    })

    await initConn.execute(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`)
    await initConn.end()

    const conn = await getConnection()

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        nickname VARCHAR(255),
        avatar VARCHAR(500),
        credits INT DEFAULT 0,
        is_member INT DEFAULT 0,
        member_expire_at DATETIME,
        is_admin INT DEFAULT 0,
        is_banned INT DEFAULT 0,
        storage_used INT DEFAULT 0,
        storage_limit INT DEFAULT 104857600,
        password_hash VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS works (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        prompt TEXT NOT NULL,
        result_url VARCHAR(1000),
        thumbnail_url VARCHAR(1000),
        status VARCHAR(50) DEFAULT 'processing',
        is_public INT DEFAULT 1,
        likes_count INT DEFAULT 0,
        category VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS generate_tasks (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        prompt TEXT NOT NULL,
        negative_prompt TEXT,
        style VARCHAR(100),
        aspect_ratio VARCHAR(20),
        quality VARCHAR(50),
        count INT,
        status VARCHAR(50) DEFAULT 'pending',
        progress INT DEFAULT 0,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS verify_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) NOT NULL,
        token VARCHAR(64) PRIMARY KEY,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_password_resets_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_no VARCHAR(64) UNIQUE NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS api_channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        base_url VARCHAR(500) NOT NULL,
        api_key TEXT NOT NULL,
        model VARCHAR(255),
        priority INT DEFAULT 0,
        is_active INT DEFAULT 1,
        weight INT DEFAULT 100,
        success_count INT DEFAULT 0,
        fail_count INT DEFAULT 0,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS credit_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        balance INT NOT NULL,
        description VARCHAR(500),
        related_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        is_active INT DEFAULT 1,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`CREATE INDEX idx_admin_accounts_username ON admin_accounts(username)`)

    await conn.execute(`
      INSERT IGNORE INTO admin_accounts (id, username, password_hash, role) VALUES
        (1, 'admin', '\$2b\$10\$lyOBawLdSpX3P582fiM4P.3dKhATV1DXWtI7Beqcczqy7NYpFhWRS', 'superadmin')
    `)

    await conn.execute(`
      UPDATE admin_accounts SET password_hash = '\$2b\$10\$lyOBawLdSpX3P582fiM4P.3dKhATV1DXWtI7Beqcczqy7NYpFhWRS' WHERE username = 'admin'
    `)

    await conn.execute(`
      INSERT IGNORE INTO settings (key, value) VALUES
        ('image_price', '10'),
        ('video_price', '30'),
        ('member_month_price', '29'),
        ('free_storage_mb', '100'),
        ('member_storage_mb', '1024'),
        ('site_name', '新梦AI')
    `)

    conn.release()
    console.log('[DB] MySQL database initialized successfully')
  } catch (err) {
    console.error('[DB] Failed to initialize database:', err)
    throw err
  }
}

const db = { query, execute, transaction, initDB, getConnection }
export default db
