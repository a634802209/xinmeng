import { useEffect, useState } from 'react'
import {
  Image as ImageIcon,
  Video,
  Grid3X3,
  Download,
  ZoomIn,
  Pencil,
  Copy,
  Share2,
  Heart,
  Trash2,
  Check,
  Mountain,
} from 'lucide-react'
import { generateApi } from '@/lib/api'
import { useGenerateStore } from '@/store/generateStore'

const DEMO_HISTORY = [
  'https://images.unsplash.com/photo-1515630278258-407f66498911?w=400&q=80',
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=400&q=80',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80',
  'https://images.unsplash.com/photo-1542259681-d4cd3839ae89?w=400&q=80',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
]

export default function ResultPanel() {
  const { currentTask, updateTask } = useGenerateStore()
  const [resultTab, setResultTab] = useState<'all' | 'image' | 'video'>('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentTask || currentTask.status === 'completed') return

    const interval = setInterval(async () => {
      try {
        const res = await generateApi.status(currentTask.taskId)
        if (res.success) {
          updateTask(currentTask.taskId, {
            status: res.task.status,
            progress: res.task.progress,
            result: res.task.result,
          })
          if (res.task.status === 'completed') {
            clearInterval(interval)
          }
        }
      } catch {
        clearInterval(interval)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [currentTask?.taskId, currentTask?.status])

  const handleCopy = () => {
    if (currentTask?.prompt) {
      navigator.clipboard.writeText(currentTask.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* 生成结果 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-800">生成结果</h3>
          <div className="flex items-center gap-1">
            {[
              { key: 'all', label: '全部' },
              { key: 'image', label: '图片', icon: ImageIcon },
              { key: 'video', label: '视频', icon: Video },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setResultTab(tab.key as typeof resultTab)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  resultTab === tab.key
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 结果展示区域 */}
        {currentTask?.status === 'completed' && currentTask.result ? (
          <div className="grid grid-cols-2 gap-3">
            {currentTask.result.map((url, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden">
                <img src={url} alt="generated" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button className="p-2 bg-white/90 rounded-lg hover:bg-white transition-all">
                      <Download className="w-4 h-4 text-slate-700" />
                    </button>
                    <button className="p-2 bg-white/90 rounded-lg hover:bg-white transition-all">
                      <ZoomIn className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : currentTask?.status === 'processing' || currentTask?.status === 'pending' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Mountain className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 mb-2">生成中... {currentTask.progress}%</p>
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${currentTask.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Mountain className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium mb-1">暂无生成结果</p>
            <p className="text-slate-400 text-sm mb-4">快去左侧输入你的创意，生成第一张作品吧！</p>
            <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
              去生成
            </button>
          </div>
        )}
      </div>

      {/* 生成中任务 */}
      {currentTask && currentTask.status !== 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-slate-800">生成中</span>
            <span className="text-xs text-slate-400">1</span>
          </div>
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
              <Mountain className="w-8 h-8 text-slate-300" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800 mb-1">{currentTask.prompt.slice(0, 20)}...</h4>
              <p className="text-sm text-slate-400 mb-3">{currentTask.prompt.slice(0, 40)}...</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
                <span className="text-sm text-slate-500">{currentTask.progress}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">预计剩余时间 00:00:18</p>
            </div>
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-medium text-slate-800 mb-4">历史记录</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {DEMO_HISTORY.map((url, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            >
              <img src={url} alt="history" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
