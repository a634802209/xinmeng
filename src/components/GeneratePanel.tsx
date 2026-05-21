import { useState, useRef, useCallback, useEffect } from 'react'
import { Image, Video, Upload, Sparkles, X, AtSign, Search } from 'lucide-react'
import { generateApi, authApi } from '@/lib/api'
import { useGenerateStore } from '@/store/generateStore'
import { useAuthStore } from '@/store/authStore'

const RATIOS = ['16:9', '9:16', '1:1', '4:3']
const QUALITIES = ['480p', '720p', '1080p', '2K', '4K']
const COUNTS = [1, 2, 4, 8]
const IMAGE_MODELS = ['SDXL 1.0', 'Midjourney V6', 'DALL-E 3', 'Stable Diffusion 3', 'Flux.1']
const VIDEO_MODELS = ['Sora', 'Runway Gen-3', 'Pika 1.5', 'Stable Video', 'Kling']
const MAX_IMAGES = 10
const MAX_FILE_SIZE = 15 * 1024 * 1024

export default function GeneratePanel() {
  const { activeTab, setActiveTab, addTask, setCurrentTask } = useGenerateStore()
  const { updateUser } = useAuthStore()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('')
  const [ratio, setRatio] = useState('16:9')
  const [quality, setQuality] = useState('1080p')
  const [count, setCount] = useState(2)
  const [generating, setGenerating] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string; file: File }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newImages: Array<{ id: string; url: string; file: File }> = []
    Array.from(files).forEach((file) => {
      if (uploadedImages.length + newImages.length >= MAX_IMAGES) return
      if (!file.type.startsWith('image/')) return
      if (file.size > MAX_FILE_SIZE) {
        alert(`图片 ${file.name} 超过 15MB 限制`)
        return
      }
      const url = URL.createObjectURL(file)
      newImages.push({ id: Math.random().toString(36).slice(2), url, file })
    })
    setUploadedImages((prev) => [...prev, ...newImages])
  }, [uploadedImages.length])

  const removeImage = (id: string) => {
    setUploadedImages((prev) => {
      const img = prev.find((p) => p.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const currentModels = activeTab === 'image' ? IMAGE_MODELS : VIDEO_MODELS

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    try {
      const res = await generateApi.image({
        prompt,
        model: model || currentModels[0],
        aspectRatio: ratio,
        quality,
        count,
      })
      if (res.success) {
        const task = {
          taskId: res.taskId,
          status: 'pending' as const,
          progress: 0,
          result: null,
          prompt,
        }
        addTask(task)
        setCurrentTask(task)
        const userData = await authApi.me()
        if (userData?.success && userData.user) {
          updateUser(userData.user)
        }
      }
    } catch (err: any) {
      alert(err.message || '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const insertAtImage = () => {
    setPrompt((prev) => prev + ' @图片')
  }

  const uploadAreaSize = uploadedImages.length === 0 ? 'min-h-[180px]' : uploadedImages.length <= 3 ? 'min-h-[120px]' : 'min-h-[80px]'

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索模型、模板、作品、提示词..."
            className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'image'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Image className="w-4 h-4" />
            图片生成
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'video'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Video className="w-4 h-4" />
            视频生成
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 参考图上传 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-slate-700">参考图区域</span>
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center cursor-help">?</span>
              <span className="text-xs text-slate-400 ml-auto">{uploadedImages.length}/{MAX_IMAGES} 张</span>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer ${uploadAreaSize} ${
                isDragging ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {uploadedImages.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-sm text-slate-500">点击或拖拽上传参考图</p>
                  <p className="text-xs text-slate-400">支持 JPG / PNG / WEBP，最大 15MB</p>
                </>
              ) : (
                <div className="w-full">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                        <img src={img.url} alt="uploaded" className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {uploadedImages.length < MAX_IMAGES && (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-2">点击继续添加，最大 15MB/张</p>
                </div>
              )}
            </div>
          </div>

          {/* 提示词和模型选择 */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-700">提示词</span>
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center cursor-help">?</span>
                <button
                  onClick={insertAtImage}
                  className="ml-auto flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100 transition-all"
                  title="@图片"
                >
                  <AtSign className="w-3 h-3" />
                  图片
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要生成的内容..."
                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400">{prompt.length} / 1000</span>
              </div>
            </div>

            {/* 模型选择 */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">选择模型</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="">默认模型</option>
                {currentModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 参数配置 */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {/* 尺寸 */}
          <div>
            <label className="text-sm text-slate-500 mb-2 block">尺寸比例</label>
            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
            >
              {RATIOS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 清晰度 */}
          <div>
            <label className="text-sm text-slate-500 mb-2 block">清晰度</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* 数量 */}
          <div>
            <label className="text-sm text-slate-500 mb-2 block">生成数量</label>
            <div className="flex gap-1">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    count === c
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 生成按钮 */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {generating ? '生成中...' : '立即生成'}
            <Sparkles className="w-4 h-4" />
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{count}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
