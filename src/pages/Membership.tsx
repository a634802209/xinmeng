import { useState, useEffect } from 'react'
import { Crown, Check, X, Info, Calendar, Shield, Loader2 } from 'lucide-react'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'

interface MembershipPlan {
  id: number
  name: string
  duration: string
  durationDays: number
  price: number
  features: string[]
  isHot: boolean
}

interface MembershipStatus {
  isMember: boolean
  plan: {
    name: string
    type: string
    startedAt: string
    expiredAt: string
  } | null
  expiredAt: string | null
}

export default function Membership() {
  const { token, user, updateUser } = useAuthStore()
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [status, setStatus] = useState<MembershipStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [plansRes, statusRes] = await Promise.all([
          fetch('/api/membership/plans', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/membership/status', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const plansData = await plansRes.json()
        const statusData = await statusRes.json()
        if (plansData?.success) setPlans(plansData.data.plans)
        if (statusData?.success) setStatus(statusData.data)
      } catch (err) {
        console.error('加载会员数据失败:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) loadData()
  }, [token])

  const handleSubscribe = async (planId: number) => {
    setSubscribing(planId)
    try {
      const res = await fetch('/api/membership/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data?.success) {
        alert(`订阅成功！${data.data.plan.name}，有效期至 ${new Date(data.data.expiredAt).toLocaleDateString()}`)
        const statusRes = await fetch('/api/membership/status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const statusData = await statusRes.json()
        if (statusData?.success) setStatus(statusData.data)
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const meData = await meRes.json()
        if (meData?.success && meData.data?.user) {
          updateUser(meData.data.user)
        }
      } else {
        alert(data?.error || '订阅失败')
      }
    } catch (err) {
      alert('订阅失败')
    } finally {
      setSubscribing(null)
    }
  }

  const freePlan = {
    name: '免费用户',
    price: 0,
    duration: '永久',
    features: ['基础生成', '带水印下载', '500MB存储', '公共队列'],
  }

  return (
    <Layout showTopBar={true}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">会员体系</h1>
          <p className="text-slate-500">选择适合你的创作方案，解锁更快生成、更高清下载与更多高级功能</p>
          {status?.isMember && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm">
              <Crown className="w-4 h-4" />
              当前会员：{status.plan?.name}，有效期至 {new Date(status.expiredAt!).toLocaleDateString()}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : (
          <>
            {/* Plans */}
            <div className="grid grid-cols-4 gap-6 mb-10">
              {/* Free Plan */}
              <div className="relative bg-white rounded-2xl border border-slate-100 p-6 transition-all hover:shadow-lg">
                <span className="absolute -top-0 right-6 px-3 py-1 text-xs font-medium rounded-b-lg bg-slate-100 text-slate-500">
                  当前方案
                </span>
                <h3 className="text-lg font-medium text-slate-800 mb-4">{freePlan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-400">{freePlan.price}</span>
                  <span className="text-slate-500">元</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">{freePlan.duration}</p>
                <button className="w-full py-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-500 cursor-default">
                  当前使用中
                </button>
                <div className="mt-4 space-y-2">
                  {freePlan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-500">
                      <Check className="w-4 h-4 text-slate-300" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Paid Plans */}
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border p-6 transition-all hover:shadow-lg ${
                    plan.isHot ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'
                  }`}
                >
                  {plan.isHot && (
                    <span className="absolute -top-0 right-6 px-3 py-1 text-xs font-medium rounded-b-lg bg-blue-500 text-white">
                      推荐
                    </span>
                  )}
                  <h3 className="text-lg font-medium text-slate-800 mb-4">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold text-blue-600">¥{(plan.price / 100).toFixed(0)}</span>
                    <span className="text-slate-500">/{plan.duration}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">{plan.durationDays}天</p>
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id || status?.isMember}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                      plan.isHot
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                        : 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {subscribing === plan.id ? '处理中...' : status?.isMember ? '已是会员' : '立即开通'}
                  </button>
                  <div className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-500" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 mb-1">权益说明</h4>
                  <p className="text-sm text-slate-500">会员仅提升权益与效率，不额外改变单次生成消耗规则</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 mb-1">订阅说明</h4>
                  <p className="text-sm text-slate-500">年付会员与月付会员功能一致，仅订阅周期不同</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-5">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 mb-1">温馨提示</h4>
                  <p className="text-sm text-slate-500">免费用户生成内容可预览，但因水印限制不建议用于商业用途</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
