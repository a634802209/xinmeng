import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/app.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

export function initDB() {
  // Users table - with migration for new columns
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
  `)

  // Migrate: add is_admin if not exists
  try {
    db.prepare('SELECT is_admin FROM users LIMIT 1').get()
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0')
  }

  // Migrate: add is_banned if not exists
  try {
    db.prepare('SELECT is_banned FROM users LIMIT 1').get()
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0')
  }

  // Migrate: add storage_used if not exists
  try {
    db.prepare('SELECT storage_used FROM users LIMIT 1').get()
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN storage_used INTEGER DEFAULT 0')
  }

  // Migrate: add storage_limit if not exists
  try {
    db.prepare('SELECT storage_limit FROM users LIMIT 1').get()
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN storage_limit INTEGER DEFAULT 104857600')
  }

  db.exec(`
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

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      amount INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Memberships table
    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_type TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expired_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Chat messages table
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Community chat messages table
    CREATE TABLE IF NOT EXISTS community_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Feedbacks table
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      contact TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- API tokens table
    CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      permissions TEXT,
      last_used_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Templates table
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      thumbnail TEXT,
      prompt TEXT NOT NULL,
      type TEXT DEFAULT 'image',
      is_hot INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Models table
    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      provider TEXT,
      price INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User settings table
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'zh',
      notify_email INTEGER DEFAULT 1,
      notify_push INTEGER DEFAULT 1,
      auto_save INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_expired_at ON memberships(expired_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    CREATE INDEX IF NOT EXISTS idx_models_type ON models(type);

    -- Security: IP blacklist table
    CREATE TABLE IF NOT EXISTS ip_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT UNIQUE NOT NULL,
      reason TEXT,
      banned_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (banned_by) REFERENCES users(id)
    );

    -- Security: Device fingerprint blacklist table
    CREATE TABLE IF NOT EXISTS device_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT UNIQUE NOT NULL,
      reason TEXT,
      banned_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (banned_by) REFERENCES users(id)
    );

    -- Security: Access audit log table
    CREATE TABLE IF NOT EXISTS access_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      fingerprint TEXT,
      user_id INTEGER,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER,
      user_agent TEXT,
      country TEXT,
      city TEXT,
      risk_score INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      block_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Security: Failed login attempts tracking
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      email TEXT,
      fingerprint TEXT,
      success INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip);
    CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires ON ip_blacklist(expires_at);
    CREATE INDEX IF NOT EXISTS idx_device_blacklist_fp ON device_blacklist(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_device_blacklist_expires ON device_blacklist(expires_at);
    CREATE INDEX IF NOT EXISTS idx_access_audit_ip ON access_audit_logs(ip);
    CREATE INDEX IF NOT EXISTS idx_access_audit_user ON access_audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_access_audit_created ON access_audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);

    -- Admin accounts table (independent from users)
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    -- P2 修复：迁移添加 deleted_at 字段
    try {
      db.prepare('SELECT deleted_at FROM admin_accounts LIMIT 1').get()
    } catch {
      db.exec('ALTER TABLE admin_accounts ADD COLUMN deleted_at DATETIME')
    }

    CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);

    -- Insert default admin account (username: admin, password: xinmeng2024)
    -- Password hash for 'xinmeng2024' using bcrypt (generated with bcrypt.hash('xinmeng2024', 10))
    INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, role) VALUES
      (1, 'admin', '$2b$10$UN3hzExPWcSY6cH.nhdeZ.BxtbqKSeD85qsZeK5fculltyGAUy1Dm', 'superadmin');

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('image_price', '1000'),
      ('video_price', '3000'),
      ('member_month_price', '2900'),
      ('free_storage_mb', '100'),
      ('member_storage_mb', '1024'),
      ('site_name', 'XinMeng.ai');

    -- Insert default templates
    INSERT OR IGNORE INTO templates (id, name, description, category, prompt, type, is_hot) VALUES
      (1, '赛博朋克', '霓虹灯下的未来都市', '风格', 'Cyberpunk city, neon lights, futuristic, rain, reflections, high detail, cinematic lighting', 'image', 1),
      (2, '国风山水', '水墨丹青意境', '风格', 'Chinese traditional landscape painting, ink wash style, mountains, mist, pine trees, poetic atmosphere', 'image', 1),
      (3, '二次元', '日系动漫风格', '风格', 'Anime style, vibrant colors, detailed character, soft lighting, clean lines', 'image', 0),
      (4, '写实风景', '真实自然风光', '风格', 'Realistic landscape photography, golden hour, dramatic sky, natural lighting, ultra detailed', 'image', 0),
      (5, '产品展示', '电商产品图', '商业', 'Product photography, clean background, professional lighting, commercial style, high quality', 'image', 0),
      (6, '科技未来', '科幻概念设计', '风格', 'Sci-fi concept art, futuristic technology, holographic interfaces, sleek design, dramatic lighting', 'image', 0);

    -- Insert default models
    INSERT OR IGNORE INTO models (id, name, description, type, provider, price, is_active) VALUES
      (1, '全能视频X-官方版', '官方推荐，效果最佳', 'video', 'xinmeng', 3000, 1),
      (2, 'SDXL', '高质量图片生成', 'image', 'stability', 1000, 1),
      (3, 'DALL-E 3', 'OpenAI 官方模型', 'image', 'openai', 1500, 1),
      (4, 'Midjourney V6', '艺术风格出众', 'image', 'midjourney', 2000, 1),
      (5, 'Flux', '开源高质量模型', 'image', 'blackforest', 800, 1);
  `)
}

export default db
