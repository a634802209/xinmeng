import { useEffect, useState, useRef } from 'react'
import {
  Image as ImageIcon,
  Video,
  Download,
  ZoomIn,
  Mountain,
  Send,
  User,
  Bot,
  Loader2,
  Users,
  Clock,
} from 'lucide-react'
import { generateApi } from '@/lib/api'
import { useGenerateStore } from '@/store/generateStore'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ResultPanel() {
  const { currentTask, updateTask } = useGenerateStore()
  const [resultTab, setResultTab] = useState<'all' | 'image' | 'video'>('all')

  // AI Assistant Chat (left side)
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的 AI 助手，可以帮你优化提示词、解答问题或提供创意建议。',
      timestamp: new Date(),
    },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiEndRef = useRef<HTMLDivElement>(null)

  // Community Chat (right side) - users chatting
  const [communityMessages, setCommunityMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '欢迎来到社区聊天室！在这里可以和其他用户交流创作心得。',
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'user',
      content: '有人试过最新的视频生成功能吗？效果怎么样？',
      timestamp: new Date(),
    },
    {
      id: '3',
      role: 'user',
      content: '我刚生成了一个赛博朋克风格的视频，效果很棒！',
      timestamp: new Date(),
    },
  ])
  const [communityInput, setCommunityInput] = useState('')
  const [communityLoading, setCommunityLoading] = useState(false)
  const communityEndRef = useRef<HTMLDivElement>(null)

  // Queue info
  const [queueInfo] = useState({
    queueCount: 2,
    estimatedTime: '00:00:35',
  })

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  useEffect(() => {
    communityEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [communityMessages])

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

  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput,
      timestamp: new Date(),
    }

    setAiMessages((prev) => [...prev, userMsg])
    setAiInput('')
    setAiLoading(true)

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `收到你的消息："${userMsg.content}"\n\n我可以帮你：\n1. 优化生成提示词\n2. 推荐合适的模型和参数\n3. 解答使用问题\n4. 提供创意灵感`,
        timestamp: new Date(),
      }
      setAiMessages((prev) => [...prev, assistantMsg])
      setAiLoading(false)
    }, 1500)
  }

  const handleSendCommunityMessage = async () => {
    if (!communityInput.trim() || communityLoading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: communityInput,
      timestamp: new Date(),
    }

    setCommunityMessages((prev) => [...prev, userMsg])
    setCommunityInput('')
    setCommunityLoading(true)

    setTimeout(() => {
      const responses = [
        '确实，我也觉得新模型效果提升很明显！',
        '请问你用的是什么提示词？可以分享一下吗？',
        '我也在排队中，预计还要等一会儿...',
        '推荐大家试试 16:9 的比例，出图效果更好。',
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      }
      setCommunityMessages((prev) => [...prev, assistantMsg])
      setCommunityLoading(false)
    }, 1500)
  }

  const renderChat = (
    messages: ChatMessage[],
    input: string,
    setInput: (v: string) => void,
    loading: boolean,
    handleSend: () => void,
    endRef: React.RefObject<HTMLDivElement | null>,
    title: string,
    icon: React.ReactNode,
    colorClass: string
  ) => (
    <div className="bg-white rounded-2xl border border-slate-100 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm">
          {icon}
          {title}
        </h3>
        <span className="text-xs text-slate-400">在线</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user'
                ? 'bg-blue-100 text-blue-600'
                : colorClass
            }`}>
              {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
            </div>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-tr-sm'
                : 'bg-slate-100 text-slate-700 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Bot className="w-3 h-3" />
            </div>
            <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-tl-sm">
              <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top: Generate Result - stretches down but leaves some space */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex-shrink-0">
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

        {currentTask?.status === 'completed' && currentTask.result ? (
          <div className="grid grid-cols-2 gap-2">
            {currentTask.result.map((url: string, i: number) => (
              <div key={i} className="relative group rounded-xl overflow-hidden">
                <img src={url} alt="generated" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-all">
                      <Download className="w-3 h-3 text-slate-700" />
                    </button>
                    <button className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-all">
                      <ZoomIn className="w-3 h-3 text-slate-700" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : currentTask?.status === 'processing' || currentTask?.status === 'pending' ? (
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
      </div>

      {/* Middle: Processing Task - stays above chat */}
      {currentTask && currentTask.status !== 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-slate-800">生成中</span>
            <span className="text-xs text-slate-400">1</span>
          </div>
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
              <Mountain className="w-6 h-6 text-slate-300" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800 text-sm mb-1">{currentTask.prompt.slice(0, 20)}...</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{currentTask.progress}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">预计剩余 00:00:18</p>
            </div>
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-all">
              取消
            </button>
          </div>
        </div>
      )}

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
          <Bot className="w-4 h-4 text-blue-500" />,
          'bg-purple-100 text-purple-600'
        )}

        {/* Right: Community Chat with Queue Info */}
        <div className="bg-white rounded-2xl border border-slate-100 flex flex-col h-full">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-green-500" />
              社区聊天
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                排队 {queueInfo.queueCount}
              </span>
              <span className="text-xs text-slate-400">预计 {queueInfo.estimatedTime}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {communityMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {communityLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={communityEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={communityInput}
                onChange={(e) => setCommunityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCommunityMessage()}
                placeholder="和大家聊聊..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                onClick={handleSendCommunityMessage}
                disabled={communityLoading || !communityInput.trim()}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
