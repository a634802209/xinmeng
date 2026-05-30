import db from '../db.js'

export interface UserSettings {
  theme: string
  language: string
  notifyEmail: boolean
  notifyPush: boolean
  autoSave: boolean
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  const rows = await db.query<any[]>('SELECT * FROM user_settings WHERE user_id = ?', [userId])
  const row = rows[0]

  if (!row) {
    await db.execute('INSERT INTO user_settings (user_id) VALUES (?)', [userId])
    return {
      theme: 'light',
      language: 'zh',
      notifyEmail: true,
      notifyPush: true,
      autoSave: true,
    }
  }

  return {
    theme: row.theme,
    language: row.language,
    notifyEmail: !!row.notify_email,
    notifyPush: !!row.notify_push,
    autoSave: !!row.auto_save,
  }
}

export async function updateUserSettings(userId: number, settings: Partial<UserSettings>): Promise<void> {
  const current = await getUserSettings(userId)
  const merged = { ...current, ...settings }

  await db.execute(
    `INSERT INTO user_settings (user_id, theme, language, notify_email, notify_push, auto_save)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       theme = VALUES(theme),
       language = VALUES(language),
       notify_email = VALUES(notify_email),
       notify_push = VALUES(notify_push),
       auto_save = VALUES(auto_save),
       updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      merged.theme,
      merged.language,
      merged.notifyEmail ? 1 : 0,
      merged.notifyPush ? 1 : 0,
      merged.autoSave ? 1 : 0,
    ]
  )
}
