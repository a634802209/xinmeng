import { useState, useRef, useCallback } from 'react'
import { X, Upload, ImageIcon, Video, Loader2, Check } from 'lucide-react'

interface UploadWorkModalProps {
  onClose: () => void
  onSuccess: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function UploadWorkModal({ onClose, onSuccess }: UploadWorkModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState<'image' | 'video'>('image')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (!allowedTypes.includes(f.type)) {
      setError('仅支持图片（JPG/PNG/GIF/WebP）或视频（MP4/WebM）格式')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB')
      return
    }
    setError('')
    setFile(f)
    setType(f.type.startsWith('video') ? 'video' : 'image')
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('prompt', prompt || file.name)
    formData.append('category', category)
    formData.append('type', type)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/upload/work`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || '上传失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">上传作品</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 拖拽上传区 */}
          {!file ? (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFileChange} />
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">点击或拖拽文件到此处上传</p>
              <p className="text-xs text-slate-400">支持 JPG、PNG、GIF、WebP、MP4、WebM，最大 10MB</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              {/* 预览 - 自适应原始尺寸 */}
              <div className="relative flex items-center justify-center p-2">
                {type === 'video' ? (
                  <video src={preview || ''} className="max-w-full max-h-[50vh] w-auto h-auto object-contain" controls />
                ) : (
                  <img src={preview || ''} alt="preview" className="max-w-full max-h-[50vh] w-auto h-auto object-contain" />
                )}
                {/* 清除按钮 */}
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {/* 类型标签 */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full">
                  {type === 'video' ? (
                    <Video className="w-3 h-3 text-white" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-white" />
                  )}
                  <span className="text-[10px] text-white">{type === 'video' ? '视频' : '图片'}</span>
                </div>
              </div>
              <div className="px-3 py-2 text-xs text-slate-500 truncate">{file.name}</div>
            </div>
          )}

          {/* 作品信息 */}
          {file && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">作品描述</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述一下你的作品..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">分类</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="例如：赛博朋克、国风山水、二次元..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              !file || uploading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                确认上传
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
