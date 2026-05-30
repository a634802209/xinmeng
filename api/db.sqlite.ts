import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = process.env.DB_PATH || './data/xinmeng.db'
const dbPath = path.resolve(__dirname, '..', DB_PATH)

console.log(`[DB] Using SQLite database at: ${dbPath}`)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

export interface QueryResult {
  [key: string]: any
}

export function query(sql: string, params?: any[]): QueryResult[] {
  try {
    const stmt = db.prepare(sql)
    if (params && params.length > 0) {
      return stmt.all(...params) as QueryResult[]
    }
    return stmt.all() as QueryResult[]
  } catch (error) {
    console.error('[DB] Query error:', sql, error)
    throw error
  }
}

export function execute(sql: string, params?: any[]): { lastInsertRowid: number | bigint; changes: number } {
  try {
    const stmt = db.prepare(sql)
    let result
    if (params && params.length > 0) {
      result = stmt.run(...params)
    } else {
      result = stmt.run()
    }
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.changes
    }
  } catch (error) {
    console.error('[DB] Execute error:', sql, error)
    throw error
  }
}

export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  const result = db.transaction(() => {
    return callback()
  })()
  return result
}

export function getConnection() {
  return {
    execute: (sql: string, params?: any[]) => {
      return execute(sql, params)
    },
    query: (sql: string, params?: any[]) => {
      return query(sql, params)
    },
    beginTransaction: () => {},
    commit: () => {},
    rollback: () => {},
    release: () => {}
  }
}

export function initDB(): void {
  try {
    console.log('[DB] Initializing SQLite database...')

    execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        nickname TEXT,
        avatar TEXT,
        credits INTEGER DEFAULT 0,
        is_member INTEGER DEFAULT 0,
        member_expire_at DATETIME,
        is_admin INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        storage_used INTEGER DEFAULT 0,
        storage_limit INTEGER DEFAULT 104857600,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        result_url TEXT,
        thumbnail_url TEXT,
        status TEXT DEFAULT 'processing',
        is_public INTEGER DEFAULT 1,
        likes_count INTEGER DEFAULT 0,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS generate_tasks (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        negative_prompt TEXT,
        style TEXT,
        aspect_ratio TEXT,
        quality TEXT,
        count INTEGER,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS verify_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT NOT NULL,
        token TEXT PRIMARY KEY,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    execute(`
      CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_no TEXT UNIQUE NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS api_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model TEXT,
        priority INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        weight INTEGER DEFAULT 100,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS credit_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance INTEGER NOT NULL,
        description TEXT,
        related_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    execute(`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        is_active INTEGER DEFAULT 1,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `)

    execute(`
      CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username)
    `)

    execute(`
      INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, role) VALUES
        (1, 'admin', '$2b$10$lyOBawLdSpX3P582fiM4P.3dKhATV1DXWtI7Beqcczqy7NYpFhWRS', 'superadmin')
    `)

    execute(`
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('image_price', '10'),
        ('video_price', '30'),
        ('member_month_price', '29'),
        ('free_storage_mb', '100'),
        ('member_storage_mb', '1024'),
        ('site_name', '新梦AI')
    `)

    console.log('[DB] SQLite database initialized successfully')
  } catch (err) {
    console.error('[DB] Failed to initialize database:', err)
    throw err
  }
}

const sqliteDB = { query, execute, transaction, initDB, getConnection }
export default sqliteDB
