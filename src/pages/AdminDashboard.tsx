import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CreditCard, Image, Video, TrendingUp, DollarSign,
  LayoutDashboard, UserCog, ShoppingCart, Settings, LogOut,
  Ban, CheckCircle, Search, ChevronLeft, ChevronRight,
  Trash2, Edit3, Save, X, Plus, Plug, Activity, Globe, KeyRound,
  Shield
} from 'lucide-react'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import SecurityPanel from '@/components/SecurityPanel'

interface Stats {
  totalUsers: number
  totalMembers: number
  todayRecharge: number
  totalRecharge: number
  todayGenerations: number
  totalGenerations: number
  totalWorks: number
  pendingOrders: number
}

interface UserItem {
  id: number
  email: string
  nickname: string | null
  credits: number
  is_member: boolean
  member_expire_at: string | null
  is_admin: boolean
  is_banned: boolean
  created_at: string
}

interface OrderItem {
  id: number
  order_no: string
  amount: number
  status: string
  payment_method: string | null
  paid_at: string | null
  created_at: string
  user_email: string
}

interface WorkItem {
  id: number
  type: string
  prompt: string
  result_url: string | null
  status: string
  created_at: string
  user_email: string
}

interface ChannelItem {
  id: number
  name: string
  type: string
  base_url: string
  model: string | null
  priority: number
  is_active: boolean
  weight: number
  success_count: number
  fail_count: number
  last_used_at: string | null
  created_at: string
}

const API_BASE = '/api/admin'
const CHANNEL_API = '/api/channels'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { adminToken, adminUser, isAdminLoggedIn, adminLogout } = useAdminAuthStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [works, setWorks] = useState<WorkItem[]>([])
  const [, setSettings] = useState<Record<string, string>>({})
  const [, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingUser, setEditingUser] = useState<number | null>(null)
  const [editCredits, setEditCredits] = useState('')
  const [editSettings, setEditSettings] = useState<Record<string, string>>({})

  // Channels state
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChannelItem | null>(null)
  const [channelForm, setChannelForm] = useState({
    name: '', type: 'image', base_url: '', api_key: '', model: '', priority: 0, weight: 100, is_active: true
  })

  const tabs = [
    { id: 'dashboard', label: '数据仪表盘', icon: LayoutDashboard },
    { id: 'users', label: '用户管理', icon: UserCog },
    { id: 'orders', label: '订单财务', icon: ShoppingCart },
    { id: 'works', label: '作品管理', icon: Image },
    { id: 'channels', label: 'API渠道', icon: Plug },
    { id: 'security', label: '安全管理', icon: Shield },
    { id: 'settings', label: '平台配置', icon: Settings },
  ]

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (res.status === 401 || res.status === 403) {
      adminLogout()
      navigate('/admin-login')
      return null
    }
    return res.json()
  }

  const loadStats = async () => {
    const data = await fetchWithAuth(`${API_BASE}/stats`)
    if (data?.success) setStats(data.stats)
  }

  const loadUsers = async () => {
    setLoading(true)
    const data = await fetchWithAuth(`${API_BASE}/users?page=${page}&search=${searchQuery}`)
    if (data?.success) {
      setUsers(data.data.list)
      setTotalPages(data.data.pagination.totalPages)
    }
    setLoading(false)
  }

  const loadOrders = async () => {
    setLoading(true)
    const data = await fetchWithAuth(`${API_BASE}/orders?page=${page}`)
    if (data?.success) {
      setOrders(data.data.list)
      setTotalPages(data.data.pagination.totalPages)
    }
    setLoading(false)
  }

  const loadWorks = async () => {
    setLoading(true)
    const data = await fetchWithAuth(`${API_BASE}/works?page=${page}`)
    if (data?.success) {
      setWorks(data.data.list)
      setTotalPages(data.data.pagination.totalPages)
    }
    setLoading(false)
  }

  const loadSettings = async () => {
    const data = await fetchWithAuth(`${API_BASE}/settings`)
    if (data?.success) {
      setSettings(data.data)
      setEditSettings(data.data)
    }
  }

  const loadChannels = async () => {
    setLoading(true)
    const data = await fetchWithAuth(`${CHANNEL_API}/`)
    if (data?.success) {
      setChannels(data.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isAdminLoggedIn) {
      navigate('/admin-login')
      return
    }
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminLoggedIn])

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'orders') loadOrders()
    if (activeTab === 'works') loadWorks()
    if (activeTab === 'settings') loadSettings()
    if (activeTab === 'channels') loadChannels()
    if (activeTab === 'dashboard') loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, searchQuery])

  const handleUpdateBalance = async (userId: number) => {
    const amount = parseInt(editCredits)
    if (isNaN(amount)) return
    await fetchWithAuth(`${API_BASE}/users/${userId}/balance`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason: 'Admin adjustment' }),
    })
    setEditingUser(null)
    loadUsers()
    loadStats()
  }

  const handleToggleMember = async (userId: number, isMember: boolean) => {
    const expireAt = isMember ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await fetchWithAuth(`${API_BASE}/users/${userId}/member`, {
      method: 'POST',
      body: JSON.stringify({ isMember: !isMember, expireAt }),
    })
    loadUsers()
    loadStats()
  }

  const handleToggleBan = async (userId: number, isBanned: boolean) => {
    await fetchWithAuth(`${API_BASE}/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ isBanned: !isBanned }),
    })
    loadUsers()
  }

  const handleDeleteWork = async (workId: number) => {
    if (!confirm('确定删除该作品？')) return
    await fetchWithAuth(`${API_BASE}/works/${workId}`, { method: 'DELETE' })
    loadWorks()
    loadStats()
  }

  const handleSaveSettings = async () => {
    await fetchWithAuth(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(editSettings),
    })
    loadSettings()
  }

  // Channel handlers
  const handleSaveChannel = async () => {
    if (!channelForm.name || !channelForm.base_url || !channelForm.api_key) return

    if (editingChannel) {
      await fetchWithAuth(`${CHANNEL_API}/${editingChannel.id}`, {
        method: 'PUT',
        body: JSON.stringify(channelForm),
      })
    } else {
      await fetchWithAuth(`${CHANNEL_API}/`, {
        method: 'POST',
        body: JSON.stringify(channelForm),
      })
    }

    setShowChannelForm(false)
    setEditingChannel(null)
    setChannelForm({ name: '', type: 'image', base_url: '', api_key: '', model: '', priority: 0, weight: 100, is_active: true })
    loadChannels()
  }

  const handleEditChannel = (ch: ChannelItem) => {
    setEditingChannel(ch)
    setChannelForm({
      name: ch.name,
      type: ch.type,
      base_url: ch.base_url,
      api_key: '',
      model: ch.model || '',
      priority: ch.priority,
      weight: ch.weight,
      is_active: ch.is_active,
    })
    setShowChannelForm(true)
  }

  const handleDeleteChannel = async (id: number) => {
    if (!confirm('确定删除该API渠道？')) return
    await fetchWithAuth(`${CHANNEL_API}/${id}`, { method: 'DELETE' })
    loadChannels()
  }

  const handleTestChannel = async (id: number) => {
    const data = await fetchWithAuth(`${CHANNEL_API}/${id}/test`, { method: 'POST' })
    alert(data?.success ? '连接成功' : `连接失败: ${data?.error}`)
    loadChannels()
  }

  const handleToggleChannel = async (ch: ChannelItem) => {
    await fetchWithAuth(`${CHANNEL_API}/${ch.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !ch.is_active }),
    })
    loadChannels()
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '总注册用户', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400' },
          { label: '付费会员', value: stats?.totalMembers || 0, icon: CreditCard, color: 'text-purple-400' },
          { label: '今日充值', value: `¥${stats?.todayRecharge || 0}`, icon: DollarSign, color: 'text-green-400' },
          { label: '总充值', value: `¥${stats?.totalRecharge || 0}`, icon: TrendingUp, color: 'text-amber-400' },
        ].map((item) => (
          <div key={item.label} className="bg-[#1a1d29] border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{item.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
              </div>
              <item.icon className={`w-8 h-8 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '今日AI生成', value: stats?.todayGenerations || 0, icon: Image, color: 'text-cyan-400' },
          { label: '总生成次数', value: stats?.totalGenerations || 0, icon: Video, color: 'text-pink-400' },
          { label: '作品总数', value: stats?.totalWorks || 0, icon: Image, color: 'text-indigo-400' },
          { label: '待支付订单', value: stats?.pendingOrders || 0, icon: ShoppingCart, color: 'text-red-400' },
        ].map((item) => (
          <div key={item.label} className="bg-[#1a1d29] border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{item.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
              </div>
              <item.icon className={`w-8 h-8 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            placeholder="搜索邮箱或昵称..."
            className="w-full pl-10 pr-4 py-2 bg-[#1a1d29] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="bg-[#1a1d29] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-slate-400">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">邮箱</th>
              <th className="text-left px-4 py-3">余额</th>
              <th className="text-left px-4 py-3">会员</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">注册时间</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-slate-300">{u.id}</td>
                <td className="px-4 py-3 text-white">{u.email}</td>
                <td className="px-4 py-3">
                  {editingUser === u.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editCredits}
                        onChange={(e) => setEditCredits(e.target.value)}
                        className="w-20 px-2 py-1 bg-[#0f1117] border border-white/10 rounded text-white text-xs"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateBalance(u.id)} className="text-green-400 hover:text-green-300">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingUser(null)} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-300">{u.credits}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleMember(u.id, u.is_member)}
                    className={`px-2 py-0.5 rounded text-xs ${u.is_member ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'}`}
                  >
                    {u.is_member ? '会员' : '普通'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${u.is_banned ? 'text-red-400' : 'text-green-400'}`}>
                    {u.is_banned ? '已禁用' : '正常'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingUser(u.id); setEditCredits(String(u.credits)) }}
                      className="text-blue-400 hover:text-blue-300"
                      title="修改余额"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleBan(u.id, u.is_banned)}
                      className={u.is_banned ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
                      title={u.is_banned ? '解禁' : '禁用'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )

  const renderOrders = () => (
    <div className="space-y-4">
      <div className="bg-[#1a1d29] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-slate-400">
              <th className="text-left px-4 py-3">订单号</th>
              <th className="text-left px-4 py-3">用户</th>
              <th className="text-left px-4 py-3">金额</th>
              <th className="text-left px-4 py-3">支付方式</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{o.order_no}</td>
                <td className="px-4 py-3 text-white">{o.user_email}</td>
                <td className="px-4 py-3 text-green-400">¥{o.amount}</td>
                <td className="px-4 py-3 text-slate-300">{o.payment_method || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${o.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {o.status === 'paid' ? '已支付' : '待支付'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )

  const renderWorks = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {works.map((w) => (
          <div key={w.id} className="bg-[#1a1d29] border border-white/5 rounded-xl overflow-hidden">
            <div className="bg-[#0f1117] flex items-center justify-center">
              {w.result_url ? (
                <img src={w.result_url} alt="" className="w-full h-auto object-contain" />
              ) : (
                <Image className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="p-3">
              <p className="text-xs text-slate-400 truncate">{w.prompt}</p>
              <p className="text-xs text-slate-500 mt-1">{w.user_email}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${w.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {w.type === 'image' ? '图片' : '视频'}
                </span>
                <button onClick={() => handleDeleteWork(w.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )

  const renderChannels = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">API 渠道管理</h3>
        <button
          onClick={() => { setShowChannelForm(true); setEditingChannel(null); setChannelForm({ name: '', type: 'image', base_url: '', api_key: '', model: '', priority: 0, weight: 100, is_active: true }) }}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          添加渠道
        </button>
      </div>

      {showChannelForm && (
        <div className="bg-[#1a1d29] border border-white/10 rounded-xl p-5 space-y-3">
          <h4 className="text-white text-sm font-medium">{editingChannel ? '编辑渠道' : '新建渠道'}</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">渠道名称</label>
              <input
                type="text"
                value={channelForm.name}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="如：OpenAI-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">类型</label>
              <select
                value={channelForm.type}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="image">图片生成</option>
                <option value="video">视频生成</option>
                <option value="text">文本生成</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">模型</label>
              <input
                type="text"
                value={channelForm.model}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="如：dall-e-3"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Base URL</label>
              <input
                type="text"
                value={channelForm.base_url}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, base_url: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">API Key</label>
              <input
                type="password"
                value={channelForm.api_key}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, api_key: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">优先级</label>
              <input
                type="number"
                value={channelForm.priority}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">权重</label>
              <input
                type="number"
                value={channelForm.weight}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, weight: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                checked={channelForm.is_active}
                onChange={(e) => setChannelForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-600"
              />
              <span className="text-sm text-slate-300">启用</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSaveChannel} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              保存
            </button>
            <button onClick={() => setShowChannelForm(false)} className="px-4 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700">
              取消
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {channels.map((ch) => (
          <div key={ch.id} className={`bg-[#1a1d29] border rounded-xl p-4 ${ch.is_active ? 'border-white/5' : 'border-red-500/20 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ch.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                <h4 className="text-white font-medium text-sm">{ch.name}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleTestChannel(ch.id)} className="p-1 text-slate-400 hover:text-blue-400" title="测试连通">
                  <Activity className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleEditChannel(ch)} className="p-1 text-slate-400 hover:text-blue-400" title="编辑">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteChannel(ch.id)} className="p-1 text-slate-400 hover:text-red-400" title="删除">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Globe className="w-3 h-3" />
                <span className="truncate">{ch.base_url}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <KeyRound className="w-3 h-3" />
                <span>{ch.model || '默认模型'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className={`px-2 py-0.5 rounded ${ch.type === 'image' ? 'bg-blue-500/20 text-blue-400' : ch.type === 'video' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                  {ch.type === 'image' ? '图片' : ch.type === 'video' ? '视频' : '文本'}
                </span>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>优先级 {ch.priority}</span>
                  <span className="text-green-400">{ch.success_count} 成功</span>
                  <span className="text-red-400">{ch.fail_count} 失败</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggleChannel(ch)}
              className={`mt-3 w-full py-1.5 text-xs rounded-lg transition-all ${ch.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
            >
              {ch.is_active ? '停用' : '启用'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="bg-[#1a1d29] border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">价格配置</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'image_price', label: '图片生成单价（积分）' },
            { key: 'video_price', label: '视频生成单价（积分）' },
            { key: 'member_month_price', label: '月卡会员价格（元）' },
            { key: 'free_storage_mb', label: '免费用户存储（MB）' },
            { key: 'member_storage_mb', label: '会员用户存储（MB）' },
            { key: 'site_name', label: '站点名称' },
          ].map((item) => (
            <div key={item.key}>
              <label className="text-sm text-slate-400 block mb-1">{item.label}</label>
              <input
                type="text"
                value={editSettings[item.key] || ''}
                onChange={(e) => setEditSettings((prev) => ({ ...prev, [item.key]: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveSettings}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          保存配置
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-[#0f1117] flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1a1d29] border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <span className="text-white font-bold">管理后台</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => { adminLogout(); navigate('/admin-login') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-[#1a1d29]/80 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-white font-medium">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{adminUser?.username}</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
              {adminUser?.role === 'superadmin' ? '超级管理员' : '管理员'}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'works' && renderWorks()}
          {activeTab === 'channels' && renderChannels()}
          {activeTab === 'security' && <SecurityPanel token={adminToken || ''} />}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  )
}
