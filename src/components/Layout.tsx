import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  showTopBar?: boolean
  showSidebar?: boolean
  rightContent?: React.ReactNode
}

export default function Layout({
  children,
  title,
  showBack = false,
  showTopBar = true,
  showSidebar = true,
  rightContent,
}: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {showSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {showTopBar ? (
          <TopBar />
        ) : title ? (
          <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              {showBack && (
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-base font-medium">{title}</span>
                </button>
              )}
              {!showBack && <span className="text-base font-medium">{title}</span>}
            </div>
            {rightContent}
          </header>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
