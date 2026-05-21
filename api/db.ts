import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, '../data/app.db'))
db.pragma('journal_mode = WAL')

export function initDB() {
  db.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      result_url TEXT,
      thumbnail_url TEXT,
      status TEXT DEFAULT 'processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

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
    );

    CREATE TABLE IF NOT EXISTS verify_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );

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
    );

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
    );

    CREATE TABLE IF NOT EXISTS canvas_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      nodes TEXT NOT NULL,
      connections TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id);
    CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_generate_tasks_user_id ON generate_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_generate_tasks_created_at ON generate_tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
    CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
    CREATE INDEX IF NOT EXISTS idx_credit_records_user_id ON credit_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_records_created_at ON credit_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_canvas_projects_user_id ON canvas_projects(user_id);

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('image_price', '1000'),
      ('video_price', '3000'),
      ('member_month_price', '2900'),
      ('free_storage_mb', '100'),
      ('member_storage_mb', '1024'),
      ('site_name', 'XinMeng.ai');
  `)
}

export default db
