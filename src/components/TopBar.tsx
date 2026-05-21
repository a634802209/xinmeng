import { useNavigate } from 'react-router-dom'
import { Diamond, Wallet, Coins, Bell, Receipt, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function TopBar() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-end px-6">
      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {user?.isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
          >
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">管理后台</span>
          </button>
        )}

        <button
          onClick={() => navigate('/membership')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
        >
          <Diamond className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">会员</span>
        </button>

        <button
          onClick={() => navigate('/recharge')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
        >
          <Wallet className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">充值</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
          <Receipt className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">余额明细</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">
            余额 {user?.credits?.toLocaleString() || '12,860'}
          </span>
        </button>

        <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        <button
          onClick={() => navigate('/login')}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-medium">
              {user?.nickname?.[0] || 'U'}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
