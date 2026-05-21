import { useState } from 'react'
import {
  Grid3X3,
  Download,
  ZoomIn,
  Pencil,
  Copy,
  Share2,
  Heart,
  Trash2,
  Check,
} from 'lucide-react'

const tools = [
  { icon: Grid3X3, label: '选择' },
  { icon: Download, label: '下载' },
  { icon: ZoomIn, label: '放大' },
  { icon: Pencil, label: '再次编辑' },
  { icon: Copy, label: '复制参数' },
  { icon: Share2, label: '分享' },
  { icon: Heart, label: '收藏' },
  { icon: Trash2, label: '删除' },
]

export default function RightToolbar() {
  const [activeTool, setActiveTool] = useState('选择')

  return (
    <div className="w-14 bg-white border-l border-slate-100 flex flex-col items-center py-4 gap-1">
      {tools.map((tool) => (
        <button
          key={tool.label}
          onClick={() => setActiveTool(tool.label)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-11 ${
            activeTool === tool.label
              ? 'text-blue-600 bg-blue-50'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
          <span className="text-[10px]">{tool.label}</span>
        </button>
      ))}
    </div>
  )
}
