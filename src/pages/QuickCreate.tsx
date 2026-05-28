import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Image, Video, Wand2, Zap, ArrowLeft,
  Download, Share2, Copy, Loader2,
  Type, Palette, Sliders, Upload, X,
  Home, Infinity, MessageSquare, Scissors, Code, Box,
  Settings, CreditCard, History, Bookmark, Lightbulb,
  RefreshCw, Trash2, Grid3X3, List, Heart, Plus,
  Diamond, Wallet, Coins, Bell, Receipt, Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useHotkeys } from '@/hooks/useHotkeys'

interface QuickTemplate {
  id: string
  name: string
  icon: React.ReactNode
  prompt: string
  type: 'image' | 'video'
}

const iconMap: Record<string, React.ReactNode> = {
  '赛博朋克': <Zap className="w-5 h-5" />,
  '国风山水': <Palette className="w-5 h-5" />,
  '二次元': <Type className="w-5 h-5" />,
  '写实风景': <Image className="w-5 h-5" />,
  '产品展示': <Sliders className="w-5 h-5" />,
  '科技未来': <Sparkles className="w-5 h-5" />,
}

const quickActions = [
  { icon: <Home className="w-4 h-4" />, label: '首页', path: '/' },
  { icon: <MessageSquare className="w-4 h-4" />, label: '文字聊天', path: '/chat' },
  { icon: <Infinity className="w-4 h-4" />, label: '无限画布', path: '/canvas' },
  { icon: <Scissors className="w-4 h-4" />, label: '剪辑', path: '/edit' },
  { icon: <Code className="w-4 h-4" />, label: 'API接口', path: '/api-docs' },
  { icon: <Box className="w-4 h-4" />, label: '模型广场', path: '/models' },
]

const bottomActions = [
  { icon: <History className="w-4 h-4" />, label: '历史记录' },
  { icon: <Bookmark className="w-4 h-4" />, label: '收藏夹' },
  { icon: <CreditCard className="w-4 h-4" />, label: '充值' },
  { icon: <Settings className="w-4 h-4" />, label: '设置' },
]

export default function QuickCreate() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [prompt, setPrompt] = useState('')
  const [selectedType, setSelectedType] = useState<'image' | 'video'>('image')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [count, setCount] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<Array<{url: string, id: string, liked: boolean}>>([])
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [templates, setTemplates] = useState<QuickTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/templates')
        const data = await res.json()
        if (data?.success && data.data?.templates) {
          const apiTemplates = data.data.templates.map((t: { id: number; name: string; prompt: string; type: string }) => ({
            id: String(t.id),
            name: t.name,
            icon: iconMap[t.name] || <Sparkles className="w-5 h-5" />,
            prompt: t.prompt,
            type: t.type as 'image' | 'video',
          }))
          setTemplates(apiTemplates)
        }
      } catch (err) {
        console.error('加载模板失败:', err)
      } finally {
        setTemplatesLoading(false)
      }
    }
    loadTemplates()
  }, [])

  const handleTemplateClick = (template: QuickTemplate) => {
    setSelectedTemplate(template.id)
    setPrompt(template.prompt)
    setSelectedType(template.type)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)

    setTimeout(() => {
      const newResults = Array.from({ length: count }, (_, i) => ({
        url: `https://picsum.photos/seed/${Date.now() + i}/800/${selectedType === 'video' ? 450 : 600}`,
        id: `result-${Date.now()}-${i}`,
        liked: false
      }))
      setResults(prev => [...newResults, ...prev])
      setIsGenerating(false)
    }, 2000)
  }

  useHotkeys([
    { key: 'Enter', ctrl: true, description: '开始生成', handler: () => handleGenerate() },
    { key: 'i', ctrl: true, description: '切换图片模式', handler: () => setSelectedType('image') },
    { key: 'v', ctrl: true, description: '切换视频模式', handler: () => setSelectedType('video') },
    { key: 'u', ctrl: true, description: '上传参考图', handler: () => fileInputRef.current?.click() },
    { key: 't', ctrl: true, description: '切换视图模式', handler: () => setViewMode((v) => v === 'grid' ? 'list' : 'grid') },
    { key: 'Escape', description: '取消生成/清空选择', handler: () => { setIsGenerating(false); setSelectedTemplate(null) } },
  ], [prompt, selectedType, count, isGenerating])

  useEffect(() => {
    if (resultsEndRef.current) {
      resultsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [results])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const toggleLike = (id: string) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, liked: !r.liked } : r))
  }

  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id))
  }

  const regenerate = (index: number) => {
    setIsGenerating(true)
    setTimeout(() => {
      setResults(prev => prev.map((r, i) => 
        i === index 
          ? { ...r, url: `https://picsum.photos/seed/${Date.now()}/800/600` }
          : r
      ))
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 text-slate-800 overflow-hidden">
      {/* Left Floating Toolbar */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-2 flex flex-col gap-1 shadow-lg">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all group relative"
              title={action.label}
            >
              {action.icon}
              <span className="absolute left-full ml-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-2 flex flex-col gap-1 shadow-lg">
          {bottomActions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all group relative"
              title={action.label}
            >
              {action.icon}
              <span className="absolute left-full ml-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Same as Home */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">返回</span>
          </button>
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

            <button
              onClick={() => navigate('/credit-records')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <Receipt className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">余额明细</span>
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                余额 ¥{user?.credits !== undefined ? (user.credits / 100).toFixed(2) : '---'}
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

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth pb-40">
          <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

            {/* Templates */}
            <div className="pl-16">
              <h2 className="text-sm font-medium text-slate-500 mb-3">快速模板</h2>
              {templatesLoading ? (
                <div className="text-sm text-slate-400 py-4">加载模板中...</div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-slate-400 py-4">暂无模板</div>
              ) : (
                <div className="grid grid-cols-6 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {template.icon}
                      <span className="text-xs font-medium">{template.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results Section */}
            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-500">
                    生成结果 <span className="text-slate-400">({results.length})</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                    >
                      {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setResults([])}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      清空全部
                    </button>
                  </div>
                </div>

                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? count === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-2'
                    : 'grid-cols-1 max-w-2xl mx-auto'
                }`}>
                  {results.map((result, index) => (
                    <div key={result.id} className="relative group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <img
                        src={result.url}
                        alt={`Result ${index + 1}`}
                        className="w-full h-auto object-contain"
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-2">
                          <button className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors">
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => regenerate(index)}
                            className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => toggleLike(result.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            result.liked ? 'text-red-400' : 'text-white/60 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${result.liked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => deleteResult(result.id)}
                          className="p-1.5 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Index Badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-xs text-white/80">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={resultsEndRef} />
              </div>
            )}

            {/* Empty State */}
            {results.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Lightbulb className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">输入提示词，开始你的创作之旅</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Bottom Creation Bar - Centered */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-6">
        <div className="bg-gradient-to-br from-white/[0.9] to-purple-50/[0.8] backdrop-blur-2xl border border-white/40 rounded-[28px] px-5 py-4 shadow-2xl shadow-purple-200/20">
          {/* Reference Images Preview - Above input */}
          {uploadedImages.length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200/50 overflow-x-auto">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeUploadedImage(index)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Big Input Container */}
          <div className="flex items-stretch gap-3">
            {/* Type Toggle - Left */}
            <div className="flex flex-col gap-1.5 shrink-0 self-center">
              <button
                onClick={() => setSelectedType('image')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                  selectedType === 'image'
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-transparent border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                图片
              </button>
              <button
                onClick={() => setSelectedType('video')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                  selectedType === 'video'
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-transparent border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                视频
              </button>
            </div>

            {/* Big Input Box with everything inside */}
            <div className="flex-1 bg-gradient-to-b from-purple-50/80 to-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Top row: Upload + Text Input */}
              <div className="flex items-center gap-3 p-3 pb-0">
                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all"
                  title="上传参考图"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[9px]">图片</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Text Input */}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要创作的内容..."
                  rows={2}
                  className="flex-1 h-[48px] px-3 py-2 bg-transparent border-0 text-slate-800 text-sm placeholder-slate-400 focus:outline-none resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleGenerate()
                    }
                  }}
                />
              </div>

              {/* Bottom row: Settings + Generate */}
              <div className="flex items-center justify-between px-3 pb-3 pt-1">
                {/* Settings */}
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>全能视频X-官方版</span>
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>自由创作</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>16:9 / 720p / 6秒</span>
                  </button>
                </div>

                {/* Price + Generate Button */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    ¥{(count * 10).toFixed(2)}
                  </span>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="w-10 h-10 rounded-full font-medium text-white transition-all flex items-center justify-center bg-gradient-to-br from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 shadow-lg shadow-lime-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
