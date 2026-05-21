import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'

export function useUserSync(interval = 30000) {
  const { user, token, updateUser } = useAuthStore()

  useEffect(() => {
    if (!token || !user) return

    const fetchUser = async () => {
      try {
        const data = await authApi.me()
        if (data?.success && data.user) {
          updateUser(data.user)
        }
      } catch {
        // 静默失败，不打扰用户
      }
    }

    // 立即执行一次
    fetchUser()

    // 定期刷新
    const timer = setInterval(fetchUser, interval)
    return () => clearInterval(timer)
  }, [token, user?.id, interval, updateUser])
}
