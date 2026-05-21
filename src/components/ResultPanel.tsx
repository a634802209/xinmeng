import { useState, useRef, useEffect } from 'react'
import {
  Image as ImageIcon,
  Video,
  Download,
  Trash2,
  RotateCcw,
  Mountain,
  Send,
  User,
  Bot,
  Loader2,
  Users,
  Clock,
} from 'lucide-react'
import { useGenerateStore } from '@/store/generateStore'

interface ResultItem {
  id: string
  url: string
  type: 'image' | 'video'
  prompt: string
  createdAt: number
}

const MAX_THUMBNAILS = 20
const MAX_LARGE_ITEMS = 4

const generateMockData = (): ResultItem[] => {
  const prompts = [
    '赛博朋克城市夜景',
    '抽象艺术背景',
    '水彩风景画',
    '未来科技概念',
    '梦幻森林场景',
    '星空宇宙探索',
    '古风山水画卷',
    '现代建筑设计',
    '海洋生物世界',
    '机械齿轮美学',
    '樱花飘落街道',
    '极光冰川探险',
    '沙漠金字塔',
    '热带雨林深处',
    '欧洲小镇风光',
  ]
  return Array.from({ length: 15 }, (_, i) => ({
    id: `mock-${i}`,
    url: `https://picsum.photos/400/300?random=${i + 10}`,
    type: 'image' as const,
    prompt: prompts[i] || `生成作品 ${i + 1}`,
    createdAt: Date.now() - i * 60000,
  }))
}

export default function ResultPanel() {
  const { currentTask } = useGenerateStore()
  const [resultTab, setResultTab] = useState<'all' | 'image' | 'video'>('all')
  const [allResults, setAllResults] = useState<ResultItem[]>(generateMockData())

  // 将结果分为大图区和缩略图区
  const sortedResults = [...allResults].sort((a, b) => b.createdAt - a.createdAt)
  const largeItems = sortedResults.slice(0, MAX_LARGE_ITEMS)
  const thumbnailItems = sortedResults.slice(MAX_LARGE_ITEMS, MAX_LARGE_ITEMS + MAX_THUMBNAILS)

  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: '你好！我是 AI 助手，有什么可以帮你的吗？' },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiEndRef = useRef<HTMLDivElement>(null)

  const [communityMessages] = useState([
    { role: 'user', name: '用户A', content: '这个模型生成效果真不错！' },
    { role: 'user', name: '用户B', content: '有人试过视频生成功能吗？' },
    { role: 'user', name: '用户C', content: '排队时间有点长啊...' },
    { role: 'user', name: '用户D', content: '新出的模型效果很棒' },
  ])
  const [communityInput, setCommunityInput] = useState('')
  const [queueInfo] = useState({ queueCount: 12, estimatedTime: '约 3 分钟' })

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  const handleSendAiMessage = async () => {
    if (!aiInput.trim()) return
    setAiMessages((prev) => [...prev, { role: 'user', content: aiInput }])
    setAiInput('')
    setAiLoading(true)
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '收到你的消息！这是一个演示回复。' },
      ])
      setAiLoading(false)
    }, 1000)
  }

  const handleDelete = (id: string) => {
    setAllResults((prev) => prev.filter((item) => item.id !== id))
  }

  const handleRegenerate = (prompt: string) => {
    console.log('Regenerate:', prompt)
  }

  const renderLargeItem = (item: ResultItem, index: number) => (
    <div key={item.id} className="relative group rounded-xl overflow-hidden bg-slate-100">
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full h-48 object-cover"
          preload="metadata"
          controls
          poster={item.url.replace('.mp4', '.jpg')}
        />
      ) : (
        <img src={item.url} alt={item.prompt} className="w-full h-48 object-cover" />
      )}
      {/* Top-right: Download + Delete */}
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            const a = document.createElement('a')
            a.href = item.url
            a.download = `generated-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`
            a.target = '_blank'
            a.click()
          }}
          className="p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-all"
          title="下载"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleDelete(item.id)}
          className="p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-red-500/80 transition-all"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Bottom-left: Regenerate */}
      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleRegenerate(item.prompt)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-all text-xs"
          title="再来一次"
        >
          <RotateCcw className="w-3 h-3" />
          再来一次
        </button>
      </div>
    </div>
  )

  const renderThumbnail = (item: ResultItem, index: number) => (
    <div key={item.id} className="relative group flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          preload="metadata"
        />
      ) : (
        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
      )}
      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-1">
          <button
            onClick={() => handleRegenerate(item.prompt)}
            className="p-1 bg-white/90 rounded hover:bg-white transition-all"
            title="再来一次"
          >
            <RotateCcw className="w-3 h-3 text-slate-700" />
          </button>
          <button
            onClick={() => {
              const a = document.createElement('a')
              a.href = item.url
              a.download = `generated-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`
              a.target = '_blank'
              a.click()
            }}
            className="p-1 bg-white/90 rounded hover:bg-white transition-all"
            title="下载"
          >
            <Download className="w-3 h-3 text-slate-700" />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="p-1 bg-white/90 rounded hover:bg-red-50 transition-all"
            title="删除"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  )

  const renderChat = (
    messages: any[],
    input: string,
    setInput: (v: string) => void,
    loading: boolean,
    onSend: () => void,
    endRef: React.RefObject<HTMLDivElement | null>,
    title: string,
    icon: React.ReactNode,
    headerExtra?: React.ReactNode
  ) => (
    <div className="bg-white rounded-2xl border border-slate-100 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-slate-800 text-sm">{title}</h3>
        </div>
        {headerExtra}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {msg.name && <span className="font-medium text-[10px] opacity-70 block mb-0.5">{msg.name}</span>}
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-slate-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="bg-slate-100 px-3 py-2 rounded-xl">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={onSend}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top: Generate Result Area */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-800 text-sm">生成结果</h3>
          <div className="flex items-center gap-1">
            {[
              { key: 'all', label: '全部' },
              { key: 'image', label: '图片', icon: ImageIcon },
              { key: 'video', label: '视频', icon: Video },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setResultTab(tab.key as typeof resultTab)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                  resultTab === tab.key
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.icon && <tab.icon className="w-3 h-3" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {currentTask?.status === 'processing' || currentTask?.status === 'pending' ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <Mountain className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm mb-1">{currentTask.progress}%</p>
            <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${currentTask.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Large items - latest 4 */}
            {largeItems.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {largeItems.map((item, i) => renderLargeItem(item, i))}
              </div>
            )}

            {/* Thumbnail strip - past items, max 20 */}
            {thumbnailItems.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400 mb-2">历史生成 ({thumbnailItems.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {thumbnailItems.map((item, i) => renderThumbnail(item, i))}
                </div>
              </div>
            )}

            {allResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                  <Mountain className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm mb-1">暂无生成结果</p>
                <p className="text-slate-400 text-xs mb-3">快去左侧输入你的创意，生成第一张作品吧！</p>
                <button className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-medium hover:shadow-lg transition-all">
                  去生成
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom: Two Chat Panels - fixed height 240px, always at bottom */}
      <div className="grid grid-cols-2 gap-4 flex-shrink-0" style={{ height: '240px', minHeight: '240px', maxHeight: '240px' }}>
        {/* Left: AI Assistant */}
        {renderChat(
          aiMessages,
          aiInput,
          setAiInput,
          aiLoading,
          handleSendAiMessage,
          aiEndRef,
          'AI 助手',
          <Bot className="w-4 h-4 text-blue-600" />
        )}

        {/* Right: Community Chat with Queue Info */}
        {renderChat(
          communityMessages,
          communityInput,
          setCommunityInput,
          false,
          () => {},
          { current: null } as React.RefObject<HTMLDivElement>,
          '社区聊天',
          <Users className="w-4 h-4 text-green-600" />,
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              排队 {queueInfo.queueCount}
            </span>
            <span>预计 {queueInfo.estimatedTime}</span>
          </div>
        )}
      </div>
    </div>
  )
}
