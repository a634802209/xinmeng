import { useState, useEffect } from 'react'
import {
  Shield, Ban, Globe, Smartphone, Eye, Trash2, Search,
  AlertTriangle, Lock, Unlock, RefreshCw, Filter,
  ChevronLeft, ChevronRight, X, Plus
} from 'lucide-react'

interface IPBlacklistItem {
  id: number
  ip: string
  reason: string | null
  banned_by_username: string | null
  created_at: string
  expires_at: string | null
}

interface DeviceBlacklistItem {
  id: number
  fingerprint: string
  reason: string | null
  banned_by_username: string | null
  created_at: string
  expires_at: string | null
}

interface AuditLogItem {
  id: number
  ip: string
  fingerprint: string | null
  user_email: string | null
  method: string
  path: string
  status_code: number | null
  user_agent: string | null
  risk_score: number
  is_blocked: number
  block_reason: string | null
  created_at: string
}

interface SecurityStats {
  ipBlacklistCount: number
  deviceBlacklistCount: number
  blockedRequestsToday: number
  failedLoginsToday: number
  uniqueIpsToday: number
  highRiskEvents: number
}

export default function SecurityPanel({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'ip' | 'device' | 'audit'>('overview')
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [ipList, setIpList] = useState<IPBlacklistItem[]>([])
  const [deviceList, setDeviceList] = useState<DeviceBlacklistItem[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddIPModal, setShowAddIPModal] = useState(false)
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [newIPReason, setNewIPReason] = useState('')
  const [newDeviceFP, setNewDeviceFP] = useState('')
  const [newDeviceReason, setNewDeviceReason] = useState('')
  const [searchIP, setSearchIP] = useState('')
  const [auditFilter, setAuditFilter] = useState('')

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/security/stats', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data?.success) setStats(data.data)
    } catch (err) {
      console.error('Failed to fetch security stats:', err)
    }
  }

  const fetchIPList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/security/ip-blacklist', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data?.success) setIpList(data.data.list)
    } catch (err) {
      console.error('Failed to fetch IP blacklist:', err)
    }
    setLoading(false)
  }

  const fetchDeviceList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/security/device-blacklist', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data?.success) setDeviceList(data.data.list)
    } catch (err) {
      console.error('Failed to fetch device blacklist:', err)
    }
    setLoading(false)
  }

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const url = auditFilter
        ? `/api/security/audit-logs?ip=${encodeURIComponent(auditFilter)}`
        : '/api/security/audit-logs'
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data?.success) setAuditLogs(data.data.list)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'ip') fetchIPList()
    if (activeTab === 'device') fetchDeviceList()
    if (activeTab === 'audit') fetchAuditLogs()
  }, [activeTab])

  const handleAddIP = async () => {
    if (!newIP.trim()) return
    try {
      const res = await fetch('/api/security/ip-blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip: newIP.trim(), reason: newIPReason }),
      })
      if (res.ok) {
        setShowAddIPModal(false)
        setNewIP('')
        setNewIPReason('')
        fetchIPList()
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to add IP:', err)
    }
  }

  const handleRemoveIP = async (id: number) => {
    if (!confirm('确定要移除该IP黑名单吗？')) return
    try {
      const res = await fetch(`/api/security/ip-blacklist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchIPList()
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to remove IP:', err)
    }
  }

  const handleAddDevice = async () => {
    if (!newDeviceFP.trim()) return
    try {
      const res = await fetch('/api/security/device-blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fingerprint: newDeviceFP.trim(), reason: newDeviceReason }),
      })
      if (res.ok) {
        setShowAddDeviceModal(false)
        setNewDeviceFP('')
        setNewDeviceReason('')
        fetchDeviceList()
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to add device:', err)
    }
  }

  const handleRemoveDevice = async (id: number) => {
    if (!confirm('确定要移除该设备黑名单吗？')) return
    try {
      const res = await fetch(`/api/security/device-blacklist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchDeviceList()
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to remove device:', err)
    }
  }

  const filteredIPList = ipList.filter((item) =>
    searchIP ? item.ip.includes(searchIP) : true
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'overview', label: '安全概览', icon: Shield },
          { key: 'ip', label: 'IP黑名单', icon: Globe },
          { key: 'device', label: '设备黑名单', icon: Smartphone },
          { key: 'audit', label: '访问审计', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.ipBlacklistCount}</div>
                <div className="text-xs text-slate-500">IP黑名单</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.deviceBlacklistCount}</div>
                <div className="text-xs text-slate-500">设备黑名单</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.blockedRequestsToday}</div>
                <div className="text-xs text-slate-500">今日拦截请求</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.failedLoginsToday}</div>
                <div className="text-xs text-slate-500">今日失败登录</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.uniqueIpsToday}</div>
                <div className="text-xs text-slate-500">今日独立IP</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.highRiskEvents}</div>
                <div className="text-xs text-slate-500">今日高风险事件</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IP Blacklist Tab */}
      {activeTab === 'ip' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchIP}
                  onChange={(e) => setSearchIP(e.target.value)}
                  placeholder="搜索IP地址..."
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddIPModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加IP黑名单
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">IP地址</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">原因</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredIPList.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">{item.ip}</td>
                    <td className="px-4 py-3 text-slate-600">{item.reason || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.banned_by_username || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveIP(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="移除黑名单"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIPList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      暂无IP黑名单记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device Blacklist Tab */}
      {activeTab === 'device' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">管理被封禁的设备指纹</div>
            <button
              onClick={() => setShowAddDeviceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加设备黑名单
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">设备指纹</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">原因</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {deviceList.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 max-w-xs truncate">{item.fingerprint}</td>
                    <td className="px-4 py-3 text-slate-600">{item.reason || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.banned_by_username || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveDevice(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="移除黑名单"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deviceList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      暂无设备黑名单记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="筛选IP地址..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
              />
            </div>
            <button
              onClick={fetchAuditLogs}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">时间</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">IP</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">请求</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">风险</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className={`border-b border-slate-100 hover:bg-slate-50 ${log.is_blocked ? 'bg-red-50/50' : ''}`}>
                    <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{log.ip}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{log.user_email || '匿名'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">
                      <span className="font-medium">{log.method}</span> {log.path}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.status_code && log.status_code >= 400
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {log.status_code || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.risk_score >= 50
                          ? 'bg-red-100 text-red-600'
                          : log.risk_score >= 20
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {log.risk_score}
                      </span>
                      {log.is_blocked === 1 && (
                        <span className="ml-1 text-xs text-red-500">已拦截</span>
                      )}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      暂无访问审计记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add IP Modal */}
      {showAddIPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddIPModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">添加IP黑名单</h3>
              <button onClick={() => setShowAddIPModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IP地址</label>
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="例如: 192.168.1.1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原因（可选）</label>
                <input
                  type="text"
                  value={newIPReason}
                  onChange={(e) => setNewIPReason(e.target.value)}
                  placeholder="封禁原因..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddIPModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddIP}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddDeviceModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">添加设备黑名单</h3>
              <button onClick={() => setShowAddDeviceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">设备指纹</label>
                <input
                  type="text"
                  value={newDeviceFP}
                  onChange={(e) => setNewDeviceFP(e.target.value)}
                  placeholder="例如: fp_abc123..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原因（可选）</label>
                <input
                  type="text"
                  value={newDeviceReason}
                  onChange={(e) => setNewDeviceReason(e.target.value)}
                  placeholder="封禁原因..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddDevice}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
