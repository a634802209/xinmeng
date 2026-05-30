import { useState, useEffect, useRef } from 'react'
import { Check, Shield, Zap, Gift, QrCode, X } from 'lucide-react'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'
import { payApi } from '@/lib/api'

interface RechargePackage {
  id: number
  name: string
  power: number
  price: number
  bonus: number
  isHot: boolean
}

const RECHARGE_PACKAGES: RechargePackage[] = [
  { id: 1, name: '1000算力', power: 1000, price: 1000, bonus: 0, isHot: false },
  { id: 2, name: '5000算力', power: 5000, price: 4500, bonus: 500, isHot: true },
  { id: 3, name: '10000算力', power: 10000, price: 8000, bonus: 1500, isHot: false },
  { id: 4, name: '50000算力', power: 50000, price: 35000, bonus: 10000, isHot: false },
  { id: 5, name: '100000算力', power: 100000, price: 60000, bonus: 30000, isHot: false },
]

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
  const [selectedPackage, setSelectedPackage] = useState<number | null>(2)
  const [paymentMethod, setPaymentMethod] = useState('wechat')
  const [loading, setLoading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<{ orderNo: string; payUrl: string } | null>(null)
  const [orderStatus, setOrderStatus] = useState<number>(0)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const balance = user?.remain_power || 0

  const selectedPkg = RECHARGE_PACKAGES.find((p) => p.id === selectedPackage)

  // 清理轮询
  const clearPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => clearPolling()
  }, [])

  // 轮询订单状态
  const pollOrderStatus = async (orderNo: string) => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await payApi.getOrderStatus(orderNo)
        if (res.data?.status === 1) {
          // 支付成功
          clearPolling()
          setOrderStatus(1)
          setShowQrModal(false)
          
          // 刷新用户信息
          const userRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const userData = await userRes.json()
          if (userData.code === 200 && userData.data?.user) {
            updateUser(userData.data.user)
          }
          
          alert('充值成功！')
        }
      } catch (err) {
        console.error('轮询订单状态失败:', err)
      }
    }, 2000)
  }

  // 创建订单
  const handleRecharge = async () => {
    if (!selectedPkg) return
    
    setLoading(true)
    try {
      const res = await payApi.createOrder({
        recharge_type: 'power',
        amount: selectedPkg.price,
        power_num: selectedPkg.power + selectedPkg.bonus,
      })
      
      if (res.code === 200 && res.data) {
        setCurrentOrder(res.data)
        setOrderStatus(0)
        setShowQrModal(true)
        
        // 开始轮询订单状态
        pollOrderStatus(res.data.orderNo)
      }
    } catch (err: any) {
      alert(err.message || '创建订单失败')
    } finally {
      setLoading(false)
    }
  }

  // 关闭二维码弹窗
  const closeQrModal = () => {
    clearPolling()
    setShowQrModal(false)
    setCurrentOrder(null)
  }

  return (
    <Layout
      title="充值中心"
      showBack={true}
      showTopBar={false}
      rightContent={
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">当前算力</span>
          <span className="text-lg font-semibold text-slate-900">
            {balance}
          </span>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto py-10 px-6">
        {/* 充值套餐 */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            选择充值套餐
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {RECHARGE_PACKAGES.map((pkg) => (
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
                  获得 {pkg.power + pkg.bonus} 算力
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

        {/* 支付方式 */}
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

        {/* 充值摘要 */}
        {selectedPkg && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">充值套餐</span>
              <span className="font-medium">{selectedPkg.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-500">获得算力</span>
              <span className="font-medium text-blue-600">
                {selectedPkg.power + selectedPkg.bonus} 算力
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

        {/* 充值按钮 */}
        <button
          onClick={handleRecharge}
          disabled={!selectedPackage || loading}
          className="w-full py-3.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '创建订单中...' : '立即充值'}
        </button>

        {/* 安全提示 */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-slate-400">
          <Shield className="w-4 h-4" />
          <span className="text-xs">安全支付保障中，您的信息将严格保密</span>
        </div>
      </div>

      {/* 二维码弹窗 */}
      {showQrModal && currentOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={closeQrModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <QrCode className="w-12 h-12 mx-auto text-blue-500 mb-2" />
              <h3 className="text-xl font-bold text-slate-900">请扫码支付</h3>
              <p className="text-slate-500 mt-1">
                {selectedPkg && `¥${(selectedPkg.price / 100).toFixed(2)}`}
              </p>
            </div>

            <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-center mb-6">
              <div className="w-48 h-48 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <QrCode className="w-12 h-12 mx-auto mb-2" />
                  <span className="text-sm">二维码区域</span>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-slate-500">
              <p>订单号：{currentOrder.orderNo}</p>
              <p className="mt-1">正在等待支付...</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
