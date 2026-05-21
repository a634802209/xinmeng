import { useNavigate } from 'react-router-dom'
import { Crown, Check, X, Info, Calendar, Shield } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

const plans = [
  {
    name: '免费用户',
    price: '0',
    unit: '元',
    period: '永久',
    badge: '当前方案',
    badgeColor: 'bg-slate-100 text-slate-500',
    buttonText: '当前使用中',
    buttonStyle: 'bg-slate-100 text-slate-500 cursor-default',
    features: {
      price: '0元永久',
      generationPrice: '与会员完全相同',
      watermark: '所有生成图片/视频带半透明平台水印（右下角浅水印，不影响预览但无法商用）',
      storage: '500MB空间，作品仅保存7天，到期自动永久删除',
      speed: '普通公共队列，预计等待2-5分钟',
      concurrent: '同时只能生成1个任务',
      resolution: '最高2048x2048',
      permissions: ['文生图', '图生图', '5秒视频生成'],
      extras: '-',
    },
  },
  {
    name: '基础会员',
    price: '29',
    unit: '元/月',
    period: '按月订阅',
    badge: '推荐',
    badgeColor: 'bg-blue-500 text-white',
    buttonText: '立即开通',
    buttonStyle: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg',
    features: {
      price: '29元/月，290元/年（买10送2）',
      generationPrice: '与会员完全相同',
      watermark: '完全无水印，支持高清原图下载',
      storage: '2GB永久存储空间，作品永不删除，可手动删除释放空间',
      speed: '会员优先队列，预计等待30秒-2分钟',
      concurrent: '同时可生成3个任务',
      resolution: '最高4096x4096',
      permissions: ['全部免费功能', '10秒视频生成', '局部重绘', '2倍扩图'],
      extras: '优先体验所有新功能、专属客服通道（24小时内回复）',
    },
  },
  {
    name: '基础会员（年付）',
    price: '290',
    unit: '元/年',
    period: '',
    badge: '最划算',
    badgeColor: 'bg-amber-100 text-amber-600',
    buttonText: '立即开通',
    buttonStyle: 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50',
    features: {
      price: '29元/月，290元/年（买10送2）',
      generationPrice: '与会员完全相同',
      watermark: '完全无水印，支持高清原图下载',
      storage: '2GB永久存储空间，作品永不删除，可手动删除释放空间',
      speed: '会员优先队列，预计等待30秒-2分钟',
      concurrent: '同时可生成3个任务',
      resolution: '最高4096x4096',
      permissions: ['全部免费功能', '10秒视频生成', '局部重绘', '2倍扩图'],
      extras: '优先体验所有新功能、专属客服通道（24小时内回复）',
    },
  },
]

const compareItems = [
  { key: 'price', label: '订阅价格', icon: '💰' },
  { key: 'generationPrice', label: '生成定价', icon: '⚡' },
  { key: 'watermark', label: '水印', icon: '📷' },
  { key: 'storage', label: '云端存储', icon: '☁️' },
  { key: 'speed', label: '生成速度', icon: '🚀' },
  { key: 'concurrent', label: '并发生成数', icon: '🔧' },
  { key: 'resolution', label: '最高分辨率', icon: '📐' },
  { key: 'permissions', label: '功能权限', icon: '🔑' },
  { key: 'extras', label: '其他权益', icon: '✨' },
]

export default function Membership() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">会员体系</h1>
            <p className="text-slate-500">选择适合你的创作方案，解锁更快生成、更高清下载与更多高级功能</p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-white rounded-2xl border p-6 transition-all hover:shadow-lg ${
                  i === 1 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-0 right-6 px-3 py-1 text-xs font-medium rounded-b-lg ${plan.badgeColor}`}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3 className="text-lg font-medium text-slate-800 mb-4">{plan.name}</h3>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-blue-600">{plan.price}</span>
                  <span className="text-slate-500">{plan.unit}</span>
                </div>
                {plan.period && <p className="text-sm text-slate-400 mb-6">{plan.period}</p>}
                {i === 2 && <p className="text-sm text-red-500 mb-6">买10送2</p>}

                <button className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${plan.buttonStyle}`}>
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          {/* Compare Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-medium text-slate-800">权益对比表</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-500 w-32">权益项</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-slate-400" />
                      免费用户
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-blue-600">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-blue-500" />
                      基础会员（含月付/年付）
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareItems.map((item, idx) => (
                  <tr key={item.key} className={idx % 2 === 0 ? 'bg-slate-50/50' : ''}>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.label}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {Array.isArray(plans[0].features[item.key as keyof typeof plans[0]['features']]) ? (
                        <div className="flex flex-wrap gap-2">
                          {(plans[0].features[item.key as keyof typeof plans[0]['features']] as string[]).map((f) => (
                            <span key={f} className="inline-flex items-center gap-1 text-green-600">
                              <Check className="w-3.5 h-3.5" />
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : item.key === 'watermark' ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Check className="w-3.5 h-3.5" />
                          {plans[0].features[item.key as keyof typeof plans[0]['features']]}
                        </span>
                      ) : (
                        plans[0].features[item.key as keyof typeof plans[0]['features']]
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {Array.isArray(plans[1].features[item.key as keyof typeof plans[1]['features']]) ? (
                        <div className="flex flex-wrap gap-2">
                          {(plans[1].features[item.key as keyof typeof plans[1]['features']] as string[]).map((f) => (
                            <span key={f} className="inline-flex items-center gap-1 text-green-600">
                              <Check className="w-3.5 h-3.5" />
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : item.key === 'watermark' ? (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <X className="w-3.5 h-3.5" />
                          {plans[1].features[item.key as keyof typeof plans[1]['features']]}
                        </span>
                      ) : (
                        plans[1].features[item.key as keyof typeof plans[1]['features']]
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        </main>
      </div>
    </div>
  )
}
