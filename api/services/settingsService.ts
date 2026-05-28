import db from '../db.js'

export interface UserSettings {
  theme: string
  language: string
  notifyEmail: boolean
  notifyPush: boolean
  autoSave: boolean
}

export function getUserSettings(userId: number): UserSettings {
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as
    | {
        theme: string
        language: string
        notify_email: number
        notify_push: number
        auto_save: number
      }
    | undefined

  if (!row) {
    db.prepare(
      'INSERT INTO user_settings (user_id) VALUES (?)'
    ).run(userId)
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

export function updateUserSettings(userId: number, settings: Partial<UserSettings>): void {
  const current = getUserSettings(userId)
  const merged = { ...current, ...settings }

  db.prepare(
    `INSERT INTO user_settings (user_id, theme, language, notify_email, notify_push, auto_save)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       theme = excluded.theme,
       language = excluded.language,
       notify_email = excluded.notify_email,
       notify_push = excluded.notify_push,
       auto_save = excluded.auto_save,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    userId,
    merged.theme,
    merged.language,
    merged.notifyEmail ? 1 : 0,
    merged.notifyPush ? 1 : 0,
    merged.autoSave ? 1 : 0
  )
}
