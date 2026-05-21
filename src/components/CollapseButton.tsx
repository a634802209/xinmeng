import { ChevronLeft } from 'lucide-react'

interface CollapseButtonProps {
  direction: 'left' | 'right'
  collapsed: boolean
  onToggle: () => void
}

export default function CollapseButton({ direction, collapsed, onToggle }: CollapseButtonProps) {
  const isLeft = direction === 'left'

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 z-50 ${
        isLeft ? '-right-3' : '-left-3'
      }`}
    >
      <button
        onClick={onToggle}
        className={`flex items-center justify-center w-5 h-12 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all ${
          isLeft ? 'rounded-r-lg border-l-0' : 'rounded-l-lg border-r-0'
        }`}
        title={collapsed ? '展开' : '收起'}
      >
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
      </button>
    </div>
  )
}
