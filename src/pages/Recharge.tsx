import { useState } from 'react'
import { Check, Shield } from 'lucide-react'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'

const PRESET_AMOUNTS = [10, 20, 50, 100, 200]

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
  {
    id: 'card',
    name: '银行卡支付',
    icon: (
      <div className="w-10 h-10 rounded-xl bg-[#FF6A00] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
          <path d="M20,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,18H4V12H20V18M20,8H4V6H20V8Z" />
        </svg>
      </div>
    ),
  },
]

export default function Recharge() {
  const { user } = useAuthStore()
  const [selectedAmount, setSelectedAmount] = useState(50)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('wechat')

  const balance = user?.credits || 0

  const handleAmountClick = (amount: number) => {
    setSelectedAmount(amount)
    setIsCustom(false)
    setCustomAmount('')
  }

  const handleCustomClick = () => {
    setIsCustom(true)
    setSelectedAmount(0)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setCustomAmount(value)
    if (value) {
      setSelectedAmount(parseInt(value))
    }
  }

  const finalAmount = isCustom ? (parseInt(customAmount) || 0) : selectedAmount

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
        {/* Recharge Amount */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-slate-900 mb-4">充值金额（单位：元）</h3>
          <div className="grid grid-cols-6 gap-3">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmountClick(amount)}
                className={`relative py-3 px-4 rounded-xl border-2 text-center transition-all ${
                  !isCustom && selectedAmount === amount
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-medium">{amount}元</span>
                {!isCustom && selectedAmount === amount && (
                  <div className="absolute top-0 right-0 w-5 h-5 bg-blue-500 rounded-bl-lg flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={handleCustomClick}
              className={`relative py-3 px-4 rounded-xl border-2 text-center transition-all ${
                isCustom
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="text-sm font-medium">其他金额</span>
              {isCustom && (
                <div className="absolute top-0 right-0 w-5 h-5 bg-blue-500 rounded-bl-lg flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-slate-900 mb-4">自定义金额（元）</h3>
          <input
            type="text"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="请输入充值金额"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Payment Method */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-slate-900 mb-4">支付方式</h3>
          <div className="grid grid-cols-3 gap-3">
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

        {/* Recharge Button */}
        <button
          disabled={finalAmount <= 0}
          className="w-full py-3.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          立即充值
        </button>

        {/* Security Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-slate-400">
          <Shield className="w-4 h-4" />
          <span className="text-xs">安全支付保障中，您的信息将严格保密</span>
        </div>
      </div>
    </Layout>
  )
}
