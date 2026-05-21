import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Infinity,
  Code,
  Box,
  FolderOpen,
  Settings,
  LayoutGrid,
  Flame,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react'

const mainNavItems = [
  { icon: Home, label: '首页', path: '/' },
  { icon: Infinity, label: '无限画布', path: '/canvas' },
  { icon: Code, label: 'API接口', path: '/api-docs' },
  { icon: Box, label: '模型广场', path: '/models' },
  { icon: FolderOpen, label: '作品管理', path: '/works' },
  { icon: Settings, label: '设置', path: '/settings' },
]

const extraNavItems = [
  { icon: LayoutGrid, label: '模板推荐', badge: 'HOT', path: '/templates' },
  { icon: Flame, label: '热门风格', badge: 'NEW', path: '/trending' },
  { icon: HelpCircle, label: '帮助中心', path: '/help' },
  { icon: MessageSquare, label: '反馈入口', path: '/feedback' },
]

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      className={`h-screen bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">X</span>
        </div>
        {!collapsed && (
          <span className="ml-3 font-bold text-slate-800 text-lg">XinMeng.ai</span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          )
        })}

        {!collapsed && <div className="my-4 border-t border-slate-100" />}
        {collapsed && <div className="my-2" />}

        {extraNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        item.badge === 'HOT'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}

        {!collapsed && <div className="my-4 border-t border-slate-100" />}
        {collapsed && <div className="my-2" />}

        {/* 模型价格 */}
        <button
          onClick={() => navigate('/pricing')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            location.pathname === '/pricing'
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
          title={collapsed ? '模型价格' : undefined}
        >
          <Tag className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">模型价格</span>}
        </button>
      </nav>
    </aside>
  )
}
