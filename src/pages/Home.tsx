import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import StatsBar from '@/components/StatsBar'
import GalleryPanel from '@/components/GalleryPanel'
import CommunityChat from '@/components/CommunityChat'
import { useUserSync } from '@/hooks/useUserSync'
import { useHotkeys } from '@/hooks/useHotkeys'

export default function Home() {
  const navigate = useNavigate()
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  // 每 30 秒同步一次用户信息（余额等）
  useUserSync(30000)

  useHotkeys([
    { key: 'b', ctrl: true, description: '收起/展开侧边栏', handler: () => setLeftCollapsed((v) => !v) },
    { key: 'q', ctrl: true, description: '前往快捷创作', handler: () => navigate('/quick-create') },
    { key: 'c', ctrl: true, description: '前往无限画布', handler: () => navigate('/canvas') },
  ])

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Left Sidebar - icon mode when collapsed */}
      <div className={`relative flex transition-all duration-300 ${leftCollapsed ? 'w-16' : 'w-56'}`}>
        <Sidebar collapsed={leftCollapsed} />
        {/* Left collapse button - at the waist */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 group">
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="flex items-center justify-center w-5 h-12 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-r-lg border-l-0 opacity-0 group-hover:opacity-100"
            title={leftCollapsed ? '展开' : '收起'}
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {leftCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden p-6">
          <StatsBar />
          <div className="flex gap-4 h-[calc(100%-60px)] mt-4">
            {/* Gallery Panel - 作品展示区 */}
            <div className="flex-1 h-full bg-white rounded-2xl border border-slate-100 p-4 overflow-hidden">
              <GalleryPanel />
            </div>

            {/* Community Chat - 社区聊天 */}
            <div className="w-80 h-full flex-shrink-0">
              <CommunityChat />
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}
