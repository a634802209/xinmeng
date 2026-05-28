import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Infinity,
  Code,
  Box,
  Scissors,
  Settings,
  LayoutGrid,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Tag,
  Wand2,
} from 'lucide-react'
import Logo from './Logo'

const mainNavItems = [
  { icon: Home, label: '首页', path: '/' },
  { icon: Wand2, label: '快捷创作', path: '/quick-create' },
  { icon: MessageSquare, label: '文字聊天', path: '/chat' },
  { icon: Infinity, label: '无限画布', path: '/canvas' },
  { icon: Code, label: 'API接口', path: '/api-docs' },
  { icon: Box, label: '模型广场', path: '/models' },
]

const extraNavItems = [
  { icon: LayoutGrid, label: '模板推荐', badge: 'HOT', path: '/templates' },
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
      <div className="px-4 mb-4 pl-10">
        <img src="/LOGO.PNG.png" alt="XinMeng AI" className="h-20 w-auto" />
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

      {/* Bottom: Settings */}
      <div className="p-2 border-t border-slate-100">
        <button
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            location.pathname === '/settings'
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
          title={collapsed ? '设置' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">设置</span>}
        </button>
      </div>
    </aside>
  )
}
