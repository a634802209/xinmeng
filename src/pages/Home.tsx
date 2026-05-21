import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import StatsBar from '@/components/StatsBar'
import GeneratePanel from '@/components/GeneratePanel'
import ResultPanel from '@/components/ResultPanel'
import RightToolbar from '@/components/RightToolbar'
import { useUserSync } from '@/hooks/useUserSync'

export default function Home() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  // 每 30 秒同步一次用户信息（余额等）
  useUserSync(30000)

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
          <div className="flex gap-4 h-[calc(100%-60px)] items-end">
            {/* Middle Generate Panel - narrow, scrollable, bottom aligned with chat */}
            <div className={`transition-all duration-300 overflow-y-auto ${rightCollapsed ? 'flex-1' : 'w-[20%] min-w-[280px]'}`}>
              <GeneratePanel />
            </div>
            {/* Right Result Panel with collapse - maximized, flex layout, bottom aligned */}
            <div className={`relative flex transition-all duration-300 h-full ${rightCollapsed ? 'w-0 overflow-hidden' : 'flex-1'}`}>
              <div className={`flex-1 h-full flex flex-col ${rightCollapsed ? 'hidden' : 'block'}`}>
                <ResultPanel />
              </div>
              {/* Right collapse button - at the waist */}
              <div className="absolute top-1/2 -translate-y-1/2 -left-3 z-50 group">
                <button
                  onClick={() => setRightCollapsed(!rightCollapsed)}
                  className="flex items-center justify-center w-5 h-12 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-l-lg border-r-0 opacity-0 group-hover:opacity-100"
                  title={rightCollapsed ? '展开' : '收起'}
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {rightCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Far Right Toolbar */}
      <RightToolbar />
    </div>
  )
}
