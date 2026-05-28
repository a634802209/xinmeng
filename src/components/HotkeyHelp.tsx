import { useState, useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { getAllHotkeys, formatHotkey } from '@/hooks/useHotkeys'

export default function HotkeyHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState<Array<{ scope: string; key: string; description: string }>>([])

  useEffect(() => {
    const all = getAllHotkeys()
    const unique = new Map<string, { scope: string; key: string; description: string }>()
    for (const { scope, config } of all) {
      const id = `${config.key}-${config.ctrl}-${config.shift}-${config.alt}-${config.meta}`
      if (!unique.has(id)) {
        unique.set(id, {
          scope,
          key: formatHotkey(config),
          description: config.description,
        })
      }
    }
    setHotkeys(Array.from(unique.values()))
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  const grouped = hotkeys.reduce((acc, item) => {
    const group = item.scope.startsWith('canvas') ? '无限画布' :
      item.scope.startsWith('quick') ? '快捷创作' :
      item.scope.startsWith('home') ? '首页' :
      item.scope.startsWith('global') ? '全局' : '其他'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, typeof hotkeys>)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800">快捷键帮助</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">{group}</h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.description}</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-600 shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
          按 Ctrl+? 或 Shift+? 打开此面板 · 按 Esc 关闭
        </div>
      </div>
    </div>
  )
}
