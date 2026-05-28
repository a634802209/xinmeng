import { useEffect, useCallback, useRef } from 'react'

export interface HotkeyConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  scope?: string
  handler: (e: KeyboardEvent) => void
  preventDefault?: boolean
  stopPropagation?: boolean
}

const hotkeyRegistry = new Map<string, HotkeyConfig[]>()

function normalizeKey(key: string): string {
  const map: Record<string, string> = {
    'esc': 'escape',
    'del': 'delete',
    'ins': 'insert',
    'pgup': 'pageup',
    'pgdn': 'pagedown',
    'cmd': 'meta',
    'command': 'meta',
    'opt': 'alt',
    'option': 'alt',
    'return': 'enter',
  }
  return map[key.toLowerCase()] || key.toLowerCase()
}

function getHotkeyId(config: Omit<HotkeyConfig, 'description' | 'handler'>): string {
  const parts: string[] = []
  if (config.ctrl) parts.push('ctrl')
  if (config.shift) parts.push('shift')
  if (config.alt) parts.push('alt')
  if (config.meta) parts.push('meta')
  parts.push(normalizeKey(config.key))
  return parts.join('+')
}

function matchesHotkey(e: KeyboardEvent, config: Omit<HotkeyConfig, 'description' | 'handler'>): boolean {
  if (normalizeKey(e.key) !== normalizeKey(config.key)) return false
  if (!!config.ctrl !== e.ctrlKey) return false
  if (!!config.shift !== e.shiftKey) return false
  if (!!config.alt !== e.altKey) return false
  if (!!config.meta !== e.metaKey) return false
  return true
}

let globalListenerAttached = false

function attachGlobalListener() {
  if (globalListenerAttached) return
  globalListenerAttached = true

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    for (const [, configs] of hotkeyRegistry) {
      for (const config of configs) {
        if (matchesHotkey(e, config)) {
          if (isInput && !config.ctrl && !config.meta && !config.alt) {
            continue
          }
          if (config.preventDefault !== false) {
            e.preventDefault()
          }
          if (config.stopPropagation) {
            e.stopPropagation()
          }
          config.handler(e)
          return
        }
      }
    }
  })
}

export function useHotkeys(configs: HotkeyConfig[], deps: React.DependencyList = []) {
  const scopeRef = useRef<string>(Math.random().toString(36).slice(2))

  const register = useCallback(() => {
    const scope = scopeRef.current
    hotkeyRegistry.set(scope, configs)
    attachGlobalListener()
  }, [configs])

  const unregister = useCallback(() => {
    hotkeyRegistry.delete(scopeRef.current)
  }, [])

  useEffect(() => {
    register()
    return unregister
  }, [register, unregister, ...deps])
}

export function getAllHotkeys(): Array<{ scope: string; config: HotkeyConfig }> {
  const result: Array<{ scope: string; config: HotkeyConfig }> = []
  for (const [scope, configs] of hotkeyRegistry) {
    for (const config of configs) {
      result.push({ scope, config })
    }
  }
  return result
}

export function formatHotkey(config: Omit<HotkeyConfig, 'description' | 'handler'>): string {
  const parts: string[] = []
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  if (config.meta) parts.push(isMac ? '⌘' : 'Win')
  if (config.ctrl) parts.push(isMac ? '⌃' : 'Ctrl')
  if (config.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (config.shift) parts.push(isMac ? '⇧' : 'Shift')

  const keyMap: Record<string, string> = {
    'escape': 'Esc',
    'enter': '↵',
    'delete': 'Del',
    'backspace': '⌫',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'tab': '⇥',
    'space': 'Space',
    'pageup': 'PgUp',
    'pagedown': 'PgDn',
    'home': 'Home',
    'end': 'End',
  }

  const key = keyMap[normalizeKey(config.key)] || config.key.toUpperCase()
  parts.push(key)

  return parts.join(isMac ? '' : '+')
}
