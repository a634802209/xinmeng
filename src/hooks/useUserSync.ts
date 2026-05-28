import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'

export function useUserSync(interval = 30000) {
  const { user, token, updateUser, setAuth } = useAuthStore()
  const prevCreditsRef = useRef(user?.credits)

  useEffect(() => {
    if (!token) return

    const fetchUser = async () => {
      try {
        const data = await authApi.me()
        if (data?.success && data.user) {
          if (user) {
            // 只在余额变化时更新
            if (data.user.credits !== prevCreditsRef.current) {
              prevCreditsRef.current = data.user.credits
              updateUser({ credits: data.user.credits })
            }
          } else {
            // 首次加载，设置完整用户信息
            setAuth(data.user, token)
            prevCreditsRef.current = data.user.credits
          }
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
  }, [token, user?.id, interval, updateUser, setAuth])
}
