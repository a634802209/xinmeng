import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Image as ImageIcon,
  Video,
  Heart,
  Clock,
  Loader2,
  Filter,
  TrendingUp,
  Sparkles,
  User,
  Download,
  Plus,
} from 'lucide-react'
import UploadWorkModal from './UploadWorkModal'

interface GalleryWork {
  id: number
  userId: number
  userName: string
  userAvatar: string | null
  type: string
  prompt: string
  resultUrl: string | null
  thumbnailUrl: string | null
  likesCount: number
  category: string | null
  createdAt: string
}

interface GalleryResponse {
  works: GalleryWork[]
  total: number
  hasMore: boolean
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function GalleryPanel() {
  const [works, setWorks] = useState<GalleryWork[]>([])
  const [categories, setCategories] = useState<string[]>(['全部'])
  const [activeType, setActiveType] = useState<'all' | 'image' | 'video'>('all')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [activeSort, setActiveSort] = useState<'latest' | 'popular'>('latest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isFetchingRef = useRef(false)
  const nextPageRef = useRef(1)

  // 获取分类（只执行一次）
  useEffect(() => {
    fetch(`${API_BASE}/api/gallery/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.categories)
        }
      })
      .catch(console.error)
  }, [])

  // 获取作品
  const fetchWorks = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      setLoading(true)

      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller

      const params = new URLSearchParams()
      if (activeType !== 'all') params.set('type', activeType)
      if (activeCategory !== '全部') params.set('category', activeCategory)
      params.set('sort', activeSort)
      params.set('page', String(pageNum))
      params.set('limit', '20')

      try {
        const res = await fetch(`${API_BASE}/api/gallery/works?${params}`, {
          signal: controller.signal,
        })
        const data = await res.json()

        if (data.success) {
          const result: GalleryResponse = data.data
          setWorks((prev) => (append ? [...prev, ...result.works] : result.works))
          setHasMore(result.hasMore)
          nextPageRef.current = pageNum + 1
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Fetch gallery failed:', err)
      } finally {
        isFetchingRef.current = false
        setLoading(false)
      }
    },
    [activeType, activeCategory, activeSort]
  )

  // 筛选变化时重置并加载
  useEffect(() => {
    setPage(1)
    nextPageRef.current = 1
    setWorks([])
    setHasMore(true)
    fetchWorks(1, false)
  }, [activeType, activeCategory, activeSort])

  // 无限滚动 - 使用单一稳定的 IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current && hasMore) {
          const nextPage = nextPageRef.current
          setPage(nextPage)
          fetchWorks(nextPage, true)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const el = loadMoreRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
      observer.disconnect()
    }
  }, [hasMore, fetchWorks])

  const handleLike = async (workId: number) => {
    try {
      await fetch(`${API_BASE}/api/gallery/works/${workId}/like`, { method: 'POST' })
      setWorks((prev) =>
        prev.map((w) => (w.id === workId ? { ...w, likesCount: w.likesCount + 1 } : w))
      )
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="flex flex-col h-full">
      {/* 筛选栏 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* 上传按钮 */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            上传作品
          </button>
          {/* 类型筛选 */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-100">
            {[
              { key: 'all' as const, label: '全部', icon: Sparkles },
              { key: 'image' as const, label: '图片', icon: ImageIcon },
              { key: 'video' as const, label: '视频', icon: Video },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  activeType === tab.key
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-100">
            {[
              { key: 'latest' as const, label: '最新', icon: Clock },
              { key: 'popular' as const, label: '热门', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSort(tab.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  activeSort === tab.key
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {categories && categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 作品网格 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {works.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium mb-1">暂无作品</p>
            <p className="text-slate-400 text-sm">快来创作你的第一个作品吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {works.map((work) => (
              <div
                key={work.id}
                className="group relative bg-white rounded-xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedWork(work)}
              >
                {/* 作品缩略图 - 自适应原始尺寸 */}
                <div className="relative overflow-hidden bg-slate-100">
                  {work.type === 'video' ? (
                    <video
                      src={work.resultUrl || work.thumbnailUrl || ''}
                      className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={work.thumbnailUrl || work.resultUrl || ''}
                      alt={work.prompt}
                      className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  )}

                  {/* 类型标签 */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full">
                    {work.type === 'video' ? (
                      <Video className="w-3 h-3 text-white" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-white" />
                    )}
                    <span className="text-[10px] text-white">{work.type === 'video' ? '视频' : '图片'}</span>
                  </div>

                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLike(work.id)
                        }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-all"
                      >
                        <Heart className="w-4 h-4 text-red-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (work.resultUrl) {
                            const a = document.createElement('a')
                            a.href = work.resultUrl
                            a.download = `work-${work.id}`
                            a.target = '_blank'
                            a.click()
                          }
                        }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-all"
                      >
                        <Download className="w-4 h-4 text-slate-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 作品信息 */}
                <div className="p-3">
                  <p className="text-xs text-slate-700 line-clamp-2 mb-2 leading-relaxed">{work.prompt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                        {work.userAvatar ? (
                          <img src={work.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{work.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" />
                        {work.likesCount}
                      </span>
                      <span>{formatTime(work.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 加载更多 */}
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading && <Loader2 className="w-6 h-6 animate-spin text-blue-500" />}
          {!hasMore && works.length > 0 && (
            <p className="text-xs text-slate-400">没有更多作品了</p>
          )}
        </div>
      </div>

      {/* 上传作品弹窗 */}
      {showUpload && (
        <UploadWorkModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setPage(1)
            nextPageRef.current = 1
            fetchWorks(1, false)
          }}
        />
      )}

      {/* 作品详情弹窗 */}
      {selectedWork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedWork(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 作品展示 - 自适应原始尺寸 */}
            <div className="relative flex-1 min-h-0 bg-slate-900 flex items-center justify-center p-4">
              {selectedWork.type === 'video' ? (
                <video
                  src={selectedWork.resultUrl || ''}
                  className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={selectedWork.resultUrl || ''}
                  alt={selectedWork.prompt}
                  className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                />
              )}
            </div>

            {/* 作品信息 */}
            <div className="p-4 border-t border-slate-100">
              <p className="text-sm text-slate-700 mb-3">{selectedWork.prompt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    {selectedWork.userAvatar ? (
                      <img src={selectedWork.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className="text-sm text-slate-600">{selectedWork.userName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(selectedWork.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-sm hover:bg-red-100 transition-all"
                  >
                    <Heart className="w-4 h-4" />
                    {selectedWork.likesCount}
                  </button>
                  {selectedWork.resultUrl && (
                    <a
                      href={selectedWork.resultUrl}
                      download
                      target="_blank"
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
