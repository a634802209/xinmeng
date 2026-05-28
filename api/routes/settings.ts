import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { getUserSettings, updateUserSettings } from '../services/settingsService.js'
import { success, error } from '../utils/response.js'

const router = Router()

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const settings = getUserSettings(req.user!.id)
  success(res, { settings })
})

router.put('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { theme, language, notifyEmail, notifyPush, autoSave } = req.body

  if (theme !== undefined && !['light', 'dark', 'system'].includes(theme)) {
    error(res, 'Theme must be light, dark, or system', 400)
    return
  }
  if (language !== undefined && (typeof language !== 'string' || language.length > 10)) {
    error(res, 'Invalid language', 400)
    return
  }

  updateUserSettings(req.user!.id, {
    theme,
    language,
    notifyEmail,
    notifyPush,
    autoSave,
  })
  success(res, { message: 'Settings updated' })
})

export default router
