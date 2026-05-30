import dotenv from 'dotenv'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_TYPE = process.env.DB_TYPE || 'sqlite'

export interface QueryResult {
  [key: string]: any
}

let dbInstance: any = null

if (DB_TYPE === 'sqlite') {
  console.log('[DB] Using SQLite database')
  
  const DB_PATH = process.env.DB_PATH || './data/xinmeng.db'
  const dbPath = path.resolve(__dirname, '..', DB_PATH)

  console.log(`[DB] Database path: ${dbPath}`)

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  dbInstance = {
    query: (sql: string, params?: any[]): QueryResult[] => {
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
    },

    execute: (sql: string, params?: any[]): { lastInsertRowid: number | bigint; changes: number } => {
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
    },

    transaction: async <T>(callback: () => Promise<T>): Promise<T> => {
      const result = db.transaction(() => {
        return callback()
      })()
      return result
    },

    getConnection: () => {
      return {
        execute: (sql: string, params?: any[]) => {
          return dbInstance.execute(sql, params)
        },
        query: (sql: string, params?: any[]) => {
          return dbInstance.query(sql, params)
        },
        beginTransaction: () => {},
        commit: () => {},
        rollback: () => {},
        release: () => {}
      }
    },

    initDB: (): void => {
      try {
        console.log('[DB] Initializing SQLite database...')

        dbInstance.execute(`
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

        dbInstance.execute(`
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

        dbInstance.execute(`
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

        dbInstance.execute(`
          CREATE TABLE IF NOT EXISTS verify_codes (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)

        dbInstance.execute(`
          CREATE TABLE IF NOT EXISTS password_resets (
            email TEXT NOT NULL,
            token TEXT PRIMARY KEY,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)

        dbInstance.execute(`
          CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)
        `)

        dbInstance.execute(`
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

        dbInstance.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)

        dbInstance.execute(`
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

        dbInstance.execute(`
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

        dbInstance.execute(`
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

        dbInstance.execute(`
          CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username)
        `)

        dbInstance.execute(`
          INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, role) VALUES
            (1, 'admin', '$2b$10$lyOBawLdSpX3P582fiM4P.3dKhATV1DXWtI7Beqcczqy7NYpFhWRS', 'superadmin')
        `)

        dbInstance.execute(`
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
  }
} else {
  import('mysql2/promise').then((mysql) => {
    const DB_HOST = process.env.DB_HOST || 'localhost'
    const DB_PORT = parseInt(process.env.DB_PORT || '3306')
    const DB_USER = process.env.DB_USER
    const DB_PASSWORD = process.env.DB_PASSWORD
    const DB_NAME = process.env.DB_NAME || 'xinmeng'
    const DB_ROOT_USER = process.env.DB_ROOT_USER || 'root'
    const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD

    if (!DB_USER) {
      throw new Error('[DB] DB_USER environment variable is required')
    }
    if (!DB_PASSWORD) {
      throw new Error('[DB] DB_PASSWORD environment variable is required')
    }
    if (!DB_HOST) {
      throw new Error('[DB] DB_HOST environment variable is required')
    }

    console.log(`[DB] Configuration: host=${DB_HOST}:${DB_PORT}, user=${DB_USER}, database=${DB_NAME}`)

    let pool: any = null

    dbInstance = {
      getConnection: async (): Promise<any> => {
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
      },

      query: async <T>(sql: string, params?: any[]): Promise<T> => {
        const conn = await dbInstance.getConnection()
        try {
          const [rows] = await conn.execute(sql, params)
          return rows as T
        } finally {
          conn.release()
        }
      },

      execute: async (sql: string, params?: any[]): Promise<any> => {
        const conn = await dbInstance.getConnection()
        try {
          const [result] = await conn.execute(sql, params)
          return result
        } finally {
          conn.release()
        }
      },

      transaction: async <T>(callback: (conn: any) => Promise<T>): Promise<T> => {
        const conn = await dbInstance.getConnection()
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
      },

      initDB: async (): Promise<void> => {
        try {
          console.log(`[DB] Initializing MySQL database at: ${DB_HOST}:${DB_PORT}/${DB_NAME}`)

          const initConn = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_ROOT_USER,
            password: DB_ROOT_PASSWORD,
          })

          await initConn.execute(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`)
          
          await initConn.execute(`CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}'`)
          await initConn.execute(`GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%'`)
          await initConn.execute(`FLUSH PRIVILEGES`)
          
          await initConn.end()

          const conn = await dbInstance.getConnection()

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
              \`key\` VARCHAR(100) PRIMARY KEY,
              \`value\` TEXT NOT NULL,
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

          await conn.execute(`CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username)`)

          await conn.execute(`
            INSERT IGNORE INTO admin_accounts (id, username, password_hash, role) VALUES
              (1, 'admin', '$2b$10$lyOBawLdSpX3P582fiM4P.3dKhATV1DXWtI7Beqcczqy7NYpFhWRS', 'superadmin')
          `)

          await conn.execute(`
            UPDATE admin_accounts SET password_hash = '$2b$10$lyOBawLdSpX3P582fiM4P.3dKhATV1DXWtI7Beqcczqy7NYpFhWRS' WHERE username = 'admin'
          `)

          await conn.execute(`
            INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES
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
    }
  })
}

export const query = (sql: string, params?: any[]) => dbInstance.query(sql, params)
export const execute = (sql: string, params?: any[]) => dbInstance.execute(sql, params)
export const transaction = <T>(callback: any) => dbInstance.transaction(callback)
export const initDB = () => dbInstance.initDB()
export const getConnection = () => dbInstance.getConnection()

export default dbInstance
