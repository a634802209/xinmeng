import { useState, useEffect } from 'react'
import { Check, Shield, Zap, Gift } from 'lucide-react'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'

interface RechargePackage {
  id: number
  name: string
  credits: number
  price: number
  bonus: number
  isHot: boolean
}

const PAYMENT_METHODS = [
  {
    id: 'wechat',
    name: '微信支付',
    icon: (
      <div className="w-10 h-10 rounded-xl bg-[#07C160] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
          <path d="M8.5,13.5A1.5,1.5 0 1,0 7,12A1.5,1.5 0 0,0 8.5,13.5M14.5,13.5A1.5,1.5 0 1,0 13,12A1.5,1.5 0 0,0 14.5,13.5M12,2C6.48,2 2,5.58 2,10C2,12.63 3.67,14.97 6.21,16.41L5.36,19.44C5.32,19.57 5.36,19.71 5.46,19.8C5.56,19.89 5.7,19.92 5.82,19.87L9.41,18.15C10.24,18.38 11.11,18.5 12,18.5C17.52,18.5 22,14.92 22,10.5C22,6.08 17.52,2.5 12,2.5M12,4C16.42,4 20,6.91 20,10.5C20,14.09 16.42,17 12,17C11.21,17 10.43,16.9 9.68,16.71L9.38,16.63L7.15,17.65L7.64,15.77L7.29,15.59C5.01,14.37 3.64,12.47 3.64,10.25C3.64,6.66 7.22,4 12,4Z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'alipay',
    name: '支付宝支付',
    icon: (
      <div className="w-10 h-10 rounded-xl bg-[#1677FF] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
          <path d="M5.5,2H18.5A2.5,2.5 0 0,1 21,4.5V19.5A2.5,2.5 0 0,1 18.5,22H5.5A2.5,2.5 0 0,1 3,19.5V4.5A2.5,2.5 0 0,1 5.5,2M12,4A4,4 0 0,0 8,8A4,4 0 0,0 12,12A4,4 0 0,0 16,8A4,4 0 0,0 12,4M12,14C9.33,14 4,15.33 4,18V20H20V18C20,15.33 14.67,14 12,14Z" />
        </svg>
      </div>
    ),
  },
]

export default function Recharge() {
  const { user, token, updateUser } = useAuthStore()
  const [packages, setPackages] = useState<RechargePackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('wechat')
  const [loading, setLoading] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)

  const balance = user?.credits || 0

  useEffect(() => {
    const loadPackages = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/payment/packages', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data?.success && data.data?.packages) {
          setPackages(data.data.packages)
          if (data.data.packages.length > 0) {
            setSelectedPackage(data.data.packages[0].id)
          }
        }
      } catch (err) {
        console.error('加载套餐失败:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) loadPackages()
  }, [token])

  const selectedPkg = packages.find((p) => p.id === selectedPackage)

  const handleRecharge = async () => {
    if (!selectedPackage) return
    setOrderLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: selectedPackage }),
      })
      const data = await res.json()
      if (data?.success && data.data?.order) {
        alert(`订单创建成功！订单号: ${data.data.order.orderNo}\n金额: ¥${(data.data.order.amount / 100).toFixed(2)}\n获得积分: ${data.data.order.credits}`)

        const callbackRes = await fetch('/api/payment/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNo: data.data.order.orderNo,
            paymentMethod: paymentMethod === 'wechat' ? '微信支付' : '支付宝',
          }),
        })
        const callbackData = await callbackRes.json()
        if (callbackData?.success) {
          alert(`支付成功！获得 ${callbackData.data.credits} 积分`)
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const meData = await meRes.json()
          if (meData?.success && meData.data?.user) {
            updateUser(meData.data.user)
          }
        }
      } else {
        alert(data?.error || '创建订单失败')
      }
    } catch (err) {
      alert('充值失败')
    } finally {
      setOrderLoading(false)
    }
  }

  return (
    <Layout
      title="充值中心"
      showBack={true}
      showTopBar={false}
      rightContent={
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">当前余额</span>
          <span className="text-lg font-semibold text-slate-900">
            ¥{(balance / 100).toFixed(2)}
          </span>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto py-10 px-6">
        {loading ? (
          <div className="text-center py-20 text-slate-400">加载中...</div>
        ) : (
          <>
            {/* Recharge Packages */}
            <div className="mb-8">
              <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                选择充值套餐
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative p-5 rounded-2xl border-2 text-center transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {pkg.isHot && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-medium">
                        HOT
                      </div>
                    )}
                    {pkg.bonus > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                        <Gift className="w-3 h-3" />
                        赠{pkg.bonus}
                      </div>
                    )}
                    <div className="text-lg font-bold mb-1">{pkg.name}</div>
                    <div className="text-2xl font-bold mb-1">
                      ¥{(pkg.price / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">
                      获得 {pkg.credits + pkg.bonus} 积分
                    </div>
                    {selectedPackage === pkg.id && (
                      <div className="absolute bottom-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-8">
              <h3 className="text-base font-medium text-slate-900 mb-4">支付方式</h3>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {method.icon}
                    <span className="text-sm font-medium text-slate-900">
                      {method.name}
                    </span>
                    {paymentMethod === method.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedPkg && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">充值套餐</span>
                  <span className="font-medium">{selectedPkg.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-500">获得积分</span>
                  <span className="font-medium text-blue-600">
                    {selectedPkg.credits + selectedPkg.bonus} 积分
                    {selectedPkg.bonus > 0 && (
                      <span className="text-xs text-orange-500 ml-1">
                        (含赠送 {selectedPkg.bonus})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">支付金额</span>
                  <span className="text-lg font-bold text-slate-900">
                    ¥{(selectedPkg.price / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Recharge Button */}
            <button
              onClick={handleRecharge}
              disabled={!selectedPackage || orderLoading}
              className="w-full py-3.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {orderLoading ? '处理中...' : '立即充值'}
            </button>

            {/* Security Note */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-slate-400">
              <Shield className="w-4 h-4" />
              <span className="text-xs">安全支付保障中，您的信息将严格保密</span>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
