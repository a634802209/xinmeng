import { useState, useEffect } from 'react'
import { Receipt, TrendingDown, TrendingUp, Wallet, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout'

interface CreditRecord {
  id: number
  type: string
  amount: number
  balance: number
  description: string | null
  created_at: string
}

interface CreditStats {
  totalRecharge: number
  totalConsume: number
  currentBalance: number
}

export default function CreditRecords() {
  const { token, user } = useAuthStore()
  const [records, setRecords] = useState<CreditRecord[]>([])
  const [stats, setStats] = useState<CreditStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchWithAuth = async (url: string) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    return res.json()
  }

  const loadRecords = async () => {
    setLoading(true)
    const data = await fetchWithAuth(`/api/credits/records?page=${page}`)
    if (data?.success) {
      setRecords(data.data.list)
      setTotalPages(data.data.pagination.totalPages)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    const data = await fetchWithAuth('/api/credits/stats')
    if (data?.success) {
      setStats(data.data)
    }
  }

  useEffect(() => {
    loadRecords()
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <Layout title="余额明细" showBack={true} showTopBar={false}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">当前余额</p>
                <p className="text-xl font-bold text-slate-800">
                  ¥{stats?.currentBalance !== undefined ? (stats.currentBalance / 100).toFixed(2) : '---'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">累计充值</p>
                <p className="text-xl font-bold text-slate-800">
                  ¥{stats?.totalRecharge !== undefined ? (stats.totalRecharge / 100).toFixed(2) : '---'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">累计消费</p>
                <p className="text-xl font-bold text-slate-800">
                  ¥{stats?.totalConsume !== undefined ? (stats.totalConsume / 100).toFixed(2) : '---'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-700">收支记录</h2>
          </div>

          {loading && records.length === 0 ? (
            <div className="p-12 text-center text-slate-400">加载中...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p>暂无记录</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="text-left px-6 py-3">类型</th>
                    <th className="text-left px-6 py-3">描述</th>
                    <th className="text-right px-6 py-3">变动</th>
                    <th className="text-right px-6 py-3">余额</th>
                    <th className="text-right px-6 py-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            r.type === 'recharge'
                              ? 'bg-green-50 text-green-600'
                              : r.type === 'consume'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {r.type === 'recharge' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : r.type === 'consume' ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Receipt className="w-3 h-3" />
                          )}
                          {r.type === 'recharge' ? '充值' : r.type === 'consume' ? '消费' : '其他'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {r.description || '-'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={r.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {r.amount > 0 ? '+' : ''}
                          ¥{(Math.abs(r.amount) / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        ¥{(r.balance / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-400 text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-slate-400">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
