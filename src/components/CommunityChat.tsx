import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  User,
  Loader2,
  MessageCircle,
  Users,
} from 'lucide-react'

interface ChatMessage {
  id: number
  userId: number
  userName: string
  userAvatar: string | null
  content: string
  createdAt: string
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function CommunityChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取消息
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/community/messages?limit=50`)
      const data = await res.json()
      if (data.success) {
        setMessages(data.data.messages)
      }
    } catch (err) {
      console.error('Fetch messages failed:', err)
    }
  }, [])

  // 初始加载 + 轮询（每10秒）
  useEffect(() => {
    fetchMessages()
    intervalRef.current = setInterval(fetchMessages, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchMessages])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return

    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/community/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: input.trim() }),
      })

      const data = await res.json()
      if (data.success) {
        setInput('')
        fetchMessages()
      } else if (res.status === 401) {
        alert('请先登录后再发送消息')
      }
    } catch (err) {
      console.error('Send message failed:', err)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-600" />
          <h3 className="font-medium text-slate-800 text-sm">社区聊天</h3>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Users className="w-3 h-3" />
            {messages.length > 0 ? '在线中' : '暂无消息'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <MessageCircle className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-slate-400 text-xs">暂无消息，快来发起聊天吧！</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                {msg.userAvatar ? (
                  <img src={msg.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-700">{msg.userName}</span>
                  <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-700 break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
