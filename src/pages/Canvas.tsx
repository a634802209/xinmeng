import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Diamond, Wallet, Coins, Bell, Receipt, Shield,
  Home, MousePointer2, Hand, StickyNote, Image as ImageIcon, Type, ZoomIn, Settings,
  Play, Trash2, Loader2,
  Lock, Maximize2, Minus, Plus, HelpCircle, Wand2,
  Save, FolderOpen
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUserSync } from '@/hooks/useUserSync'
import { canvasApi, generateApi } from '@/lib/api'
import { useHotkeys } from '@/hooks/useHotkeys'

const leftTools = [
  { icon: Home, label: '主页', action: 'navigate-home' },
  { icon: MousePointer2, label: '选择', active: true },
  { icon: Hand, label: '拖拽' },
  { icon: StickyNote, label: '便签' },
  { icon: ImageIcon, label: '图片' },
  { icon: Type, label: '文本' },
  { icon: ZoomIn, label: '缩放' },
  { icon: Settings, label: '设置' },
]

const MODELS = ['GPT-4o', 'Claude 3.5', 'Gemini Pro', 'Kimi', '文心一言']
const SIZES = ['256x256', '512x512', '1024x1024', '1920x1080', '3840x2160']
const RATIOS = ['1:1', '4:3', '16:9', '9:16', '3:2']

interface CanvasNode {
  id: string
  title: string
  x: number
  y: number
  type: 'text' | 'image' | 'video'
  content?: string
  model?: string
  size?: string
  ratio?: string
  status?: 'idle' | 'running' | 'done'
  result?: string
  taskId?: string
}

interface Connection {
  id: string
  from: string
  to: string
  fromPort: number
  toPort: number
}

export default function Canvas() {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [activeTool, setActiveTool] = useState('选择')
  const [unreadCount, setUnreadCount] = useState(0)

  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: 'text1',
      title: '文本生成',
      x: 200, y: 150,
      type: 'text',
      content: '未来城市的夜晚，霓虹灯闪烁...',
      model: 'GPT-4o',
      status: 'done',
    },
    {
      id: 'img1',
      title: '图片生成',
      x: 600, y: 100,
      type: 'image',
      model: 'DALL-E 3',
      size: '1024x1024',
      ratio: '1:1',
      status: 'done',
    },
  ])

  const [connections, setConnections] = useState<Connection[]>([
    { id: 'c1', from: 'text1', to: 'img1', fromPort: 0, toPort: 0 },
  ])

  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 })

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [centerInputValue, setCenterInputValue] = useState('')

  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; portIndex: number } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const [hoveredConn, setHoveredConn] = useState<string | null>(null)

  useUserSync(30000)

  useHotkeys([
    { key: 's', ctrl: true, description: '保存画布', handler: () => handleSave() },
    { key: 'Enter', ctrl: true, description: '运行选中节点', handler: () => { if (selectedNodeId) runNode(selectedNodeId) } },
    { key: 'Delete', description: '删除选中节点', handler: () => { if (selectedNodeId) deleteNode(selectedNodeId) } },
    { key: '=', ctrl: true, description: '放大画布', handler: () => setScale((s) => Math.min(s + 0.1, 5)) },
    { key: '-', ctrl: true, description: '缩小画布', handler: () => setScale((s) => Math.max(s - 0.1, 0.2)) },
    { key: '0', ctrl: true, description: '重置缩放', handler: () => setScale(1) },
    { key: 'v', description: '切换选择工具', handler: () => setActiveTool('选择') },
    { key: 'h', description: '切换拖拽工具', handler: () => setActiveTool('拖拽') },
    { key: 'f', description: '适应画布', handler: () => { setScale(1); setOffset({ x: 0, y: 0 }) } },
    { key: 'z', ctrl: true, description: '撤销（预留）', handler: () => { /* TODO: undo */ } },
    { key: 'y', ctrl: true, description: '重做（预留）', handler: () => { /* TODO: redo */ } },
  ], [selectedNodeId])

  useEffect(() => {
    const loadNotifications = async () => {
      if (!token) return
      try {
        const res = await fetch('/api/notifications?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data?.success) {
          setUnreadCount(data.data.unreadCount || 0)
        }
      } catch (err) {
        console.error('加载通知失败:', err)
      }
    }
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [token])

  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const portRefs = useRef<Map<string, HTMLElement>>(new Map())

  const getPortKey = (nodeId: string, side: 'left' | 'right', index: number) => `${nodeId}-${side}-${index}`

  const getPortCenter = (nodeId: string, side: 'left' | 'right', index: number) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }

    const portKey = getPortKey(nodeId, side, index)
    const portEl = portRefs.current.get(portKey)
    if (portEl && canvasRef.current) {
      const portRect = portEl.getBoundingClientRect()
      const canvasRect = canvasRef.current.getBoundingClientRect()
      return {
        x: (portRect.left + portRect.width / 2 - canvasRect.left - offset.x) / scale,
        y: (portRect.top + portRect.height / 2 - canvasRect.top - offset.y) / scale,
      }
    }

    const nodeWidth = 288
    const headerHeight = 40
    const portSpacing = 24
    const startY = headerHeight + 20
    const x = side === 'left' ? node.x : node.x + nodeWidth
    const y = node.y + startY + index * portSpacing
    return { x, y }
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale((prev) => Math.min(Math.max(prev * delta, 0.2), 5))
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && activeTool === '拖拽')) {
      setIsDraggingCanvas(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const screenToWorld = (screenX: number, screenY: number) => {
    return { x: (screenX - offset.x) / scale, y: (screenY - offset.y) / scale }
  }

  const findNearestPort = (screenX: number, screenY: number) => {
    const snapDistance = 60
    let nearest: { nodeId: string; portIndex: number; x: number; y: number } | null = null
    let minDist = snapDistance

    for (const node of nodes) {
      if (connectingFrom && node.id === connectingFrom.nodeId) continue
      const inCount = connections.filter((c) => c.to === node.id).length
      const inputPorts = Math.max(inCount + 1, 1)
      for (let i = 0; i < inputPorts; i++) {
        const portKey = getPortKey(node.id, 'left', i)
        const portEl = portRefs.current.get(portKey)
        if (portEl && canvasRef.current) {
          const portRect = portEl.getBoundingClientRect()
          const canvasRect = canvasRef.current.getBoundingClientRect()
          const portScreenX = portRect.left + portRect.width / 2 - canvasRect.left
          const portScreenY = portRect.top + portRect.height / 2 - canvasRect.top
          const dist = Math.sqrt((screenX - portScreenX) ** 2 + (screenY - portScreenY) ** 2)
          if (dist < minDist) {
            minDist = dist
            const worldPos = getPortCenter(node.id, 'left', i)
            nearest = { nodeId: node.id, portIndex: i, x: worldPos.x, y: worldPos.y }
          }
        }
      }
    }
    return nearest
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    const mouseScreenX = canvasRect ? e.clientX - canvasRect.left : e.clientX
    const mouseScreenY = canvasRect ? e.clientY - canvasRect.top : e.clientY
    const worldPos = screenToWorld(mouseScreenX, mouseScreenY)

    if (isDraggingCanvas) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
    if (draggingNode) {
      setNodes((prev) => prev.map((n) => n.id === draggingNode ? { ...n, x: worldPos.x - nodeDragOffset.x, y: worldPos.y - nodeDragOffset.y } : n))
    }
    if (connectingFrom) {
      const nearest = findNearestPort(mouseScreenX, mouseScreenY)
      if (nearest) setMousePos({ x: nearest.x, y: nearest.y })
      else setMousePos(worldPos)
    }

    if (!connectingFrom) {
      let found = null
      for (const conn of connections) {
        const fromPos = getPortCenter(conn.from, 'right', conn.fromPort)
        const toPos = getPortCenter(conn.to, 'left', conn.toPort)
        const sx1 = fromPos.x * scale + offset.x
        const sy1 = fromPos.y * scale + offset.y
        const sx2 = toPos.x * scale + offset.x
        const sy2 = toPos.y * scale + offset.y
        if (pointNearBezier(mouseScreenX, mouseScreenY, sx1, sy1, sx2, sy2, 12)) {
          found = conn.id
          break
        }
      }
      setHoveredConn(found)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDraggingCanvas(false)
    setDraggingNode(null)

    if (connectingFrom) {
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const mouseScreenX = canvasRect ? e.clientX - canvasRect.left : e.clientX
      const mouseScreenY = canvasRect ? e.clientY - canvasRect.top : e.clientY
      const nearest = findNearestPort(mouseScreenX, mouseScreenY)

      if (nearest && nearest.nodeId !== connectingFrom.nodeId) {
        const newConn: Connection = {
          id: `c${Date.now()}`,
          from: connectingFrom.nodeId,
          to: nearest.nodeId,
          fromPort: connectingFrom.portIndex,
          toPort: nearest.portIndex,
        }
        setConnections((prev) => [...prev, newConn])
      }

      setConnectingFrom(null)
      setMousePos({ x: 0, y: 0 })
    }
  }

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right', portIndex: number) => {
    e.stopPropagation()
    if (side !== 'right') return
    const pos = getPortCenter(nodeId, side, portIndex)
    setConnectingFrom({ nodeId, portIndex })
    setMousePos(pos)
  }

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right', portIndex: number) => {
    e.stopPropagation()
    if (!connectingFrom) return
    if (side !== 'left') return
    if (connectingFrom.nodeId === nodeId) {
      setConnectingFrom(null)
      setMousePos({ x: 0, y: 0 })
      return
    }
    const newConn: Connection = {
      id: `c${Date.now()}`,
      from: connectingFrom.nodeId,
      to: nodeId,
      fromPort: connectingFrom.portIndex,
      toPort: portIndex,
    }
    setConnections((prev) => [...prev, newConn])
    setConnectingFrom(null)
    setMousePos({ x: 0, y: 0 })
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    const mouseScreenX = canvasRect ? e.clientX - canvasRect.left : e.clientX
    const mouseScreenY = canvasRect ? e.clientY - canvasRect.top : e.clientY
    const worldPos = screenToWorld(mouseScreenX, mouseScreenY)
    setNodeDragOffset({ x: worldPos.x - node.x, y: worldPos.y - node.y })
    setDraggingNode(nodeId)
  }

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setSelectedNodeId(nodeId)
    setCenterInputValue(node.content || node.title || '')
  }

  const handleCenterInputChange = (value: string) => {
    setCenterInputValue(value)
    if (selectedNodeId) {
      setNodes((prev) => prev.map((n) => n.id === selectedNodeId ? { ...n, content: value } : n))
    }
  }

  const handleNodeModelChange = (model: string) => {
    if (selectedNodeId) setNodes((prev) => prev.map((n) => n.id === selectedNodeId ? { ...n, model } : n))
  }
  const handleNodeSizeChange = (size: string) => {
    if (selectedNodeId) setNodes((prev) => prev.map((n) => n.id === selectedNodeId ? { ...n, size } : n))
  }
  const handleNodeRatioChange = (ratio: string) => {
    if (selectedNodeId) setNodes((prev) => prev.map((n) => n.id === selectedNodeId ? { ...n, ratio } : n))
  }

  const handleCanvasClick = () => {
    setSelectedNodeId(null)
    setCenterInputValue('')
    setContextMenu({ x: 0, y: 0, visible: false })
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true })
  }

  const addNode = (type: 'text' | 'image' | 'video') => {
    const worldPos = screenToWorld(contextMenu.x, contextMenu.y)
    const id = `node-${Date.now()}`
    const newNode: CanvasNode = {
      id,
      title: type === 'text' ? '文本生成' : type === 'image' ? '图片生成' : '视频生成',
      x: worldPos.x,
      y: worldPos.y,
      type,
      model: MODELS[0],
      size: SIZES[2],
      ratio: RATIOS[0],
      status: 'idle',
    }
    setNodes((prev) => [...prev, newNode])
    setContextMenu({ x: 0, y: 0, visible: false })
  }

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setConnections((prev) => prev.filter((c) => c.from !== nodeId && c.to !== nodeId))
  }

  const deleteConnection = (connId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId))
  }

  const pointNearBezier = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, threshold: number = 8) => {
    const steps = 30
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const mt = 1 - t
      const bx = mt * mt * mt * x1 + 3 * mt * mt * t * (x1 + 80) + 3 * mt * t * t * (x2 - 80) + t * t * t * x2
      const by = mt * mt * mt * y1 + 3 * mt * mt * t * (y1) + 3 * mt * t * t * (y2) + t * t * t * y2
      const dist = Math.sqrt((px - bx) ** 2 + (py - by) ** 2)
      if (dist < threshold) return true
    }
    return false
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hoveredConn) {
      deleteConnection(hoveredConn)
      setHoveredConn(null)
    }
  }

  // ========== AI GENERATION LOGIC ==========

  // Get upstream prompt: collect content from all connected input nodes
  const getUpstreamPrompt = (nodeId: string): string => {
    const incoming = connections.filter((c) => c.to === nodeId)
    const prompts: string[] = []
    for (const conn of incoming) {
      const source = nodes.find((n) => n.id === conn.from)
      if (source?.content) prompts.push(source.content)
      if (source?.result) prompts.push(source.result)
    }
    const node = nodes.find((n) => n.id === nodeId)
    if (node?.content) prompts.push(node.content)
    return prompts.join('\n')
  }

  const runNode = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, status: 'running' } : n))

    try {
      if (node.type === 'text') {
        // Simulate text generation
        await new Promise((r) => setTimeout(r, 2000))
        const result = `【${node.model}生成结果】\n\n基于提示词「${node.content}」\n\n生成的文本内容...`
        setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, status: 'done', result } : n))
      } else if (node.type === 'image') {
        const prompt = getUpstreamPrompt(nodeId)
        const res = await generateApi.image({
          prompt,
          aspectRatio: node.ratio || '1:1',
          quality: '标准',
          count: 1,
        })
        if (res?.data?.taskId) {
          setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, taskId: res.data.taskId } : n))
          pollTaskStatus(nodeId, res.data.taskId)
        }
      } else if (node.type === 'video') {
        const prompt = getUpstreamPrompt(nodeId)
        const res = await generateApi.video({
          prompt,
          style: node.model,
        })
        if (res?.data?.taskId) {
          setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, taskId: res.data.taskId } : n))
          pollTaskStatus(nodeId, res.data.taskId)
        }
      }
    } catch (err) {
      console.error('生成失败:', err)
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, status: 'idle' } : n))
      alert('生成失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const pollTaskStatus = async (nodeId: string, taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await generateApi.status(taskId)
        const task = res?.data?.task
        if (!task) return

        if (task.status === 'completed') {
          clearInterval(interval)
          const result = task.result?.[0] || ''
          setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, status: 'done', result } : n))
        } else if (task.status === 'failed') {
          clearInterval(interval)
          setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, status: 'idle' } : n))
        }
      } catch {
        clearInterval(interval)
        setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, status: 'idle' } : n))
      }
    }, 2000)

    setTimeout(() => clearInterval(interval), 120000)
  }

  // Run entire workflow: execute nodes in topological order
  const runWorkflow = async () => {
    const visited = new Set<string>()
    const results = new Map<string, string>()

    const canRun = (nodeId: string): boolean => {
      const deps = connections.filter((c) => c.to === nodeId).map((c) => c.from)
      return deps.every((d) => visited.has(d))
    }

    const runNext = async () => {
      const ready = nodes.filter((n) => !visited.has(n.id) && canRun(n.id))
      if (ready.length === 0) return

      await Promise.all(ready.map(async (node) => {
        await runNode(node.id)
        visited.add(node.id)
      }))

      await runNext()
    }

    await runNext()
  }

  const handleSave = async () => {
    try {
      await canvasApi.create({
        name: `画布项目 ${new Date().toLocaleString()}`,
        nodes,
        connections,
      })
      alert('保存成功')
    } catch {
      alert('保存失败')
    }
  }

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    forceUpdate((n) => n + 1)
  }, [nodes, scale, offset, connections])

  const renderConnections = () => {
    return connections.map((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.from)
      const toNode = nodes.find((n) => n.id === conn.to)
      if (!fromNode || !toNode) return null
      const fromPos = getPortCenter(conn.from, 'right', conn.fromPort)
      const toPos = getPortCenter(conn.to, 'left', conn.toPort)
      const isHovered = hoveredConn === conn.id
      return (
        <g key={conn.id}>
          <path
            d={`M ${fromPos.x} ${fromPos.y} C ${fromPos.x + 80} ${fromPos.y}, ${toPos.x - 80} ${toPos.y}, ${toPos.x} ${toPos.y}`}
            fill="none"
            stroke={isHovered ? '#ef4444' : 'white'}
            strokeWidth={isHovered ? 3 : 1.5}
            opacity={isHovered ? 1 : 0.6}
            style={{ pointerEvents: 'none' }}
          />
          {isHovered && (
            <g>
              <circle cx={(fromPos.x + toPos.x) / 2} cy={(fromPos.y + toPos.y) / 2} r={12} fill="#1e2230" stroke="#ef4444" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
              <text x={(fromPos.x + toPos.x) / 2} y={(fromPos.y + toPos.y) / 2} textAnchor="middle" dominantBaseline="central" fill="#ef4444" fontSize={10} style={{ pointerEvents: 'none' }}>✂</text>
            </g>
          )}
        </g>
      )
    })
  }

  const renderDragLine = () => {
    if (!connectingFrom) return null
    const pos = getPortCenter(connectingFrom.nodeId, 'right', connectingFrom.portIndex)
    return (
      <g>
        <path d={`M ${pos.x} ${pos.y} C ${pos.x + 80} ${pos.y}, ${mousePos.x - 80} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`} fill="none" stroke="#60a5fa" strokeWidth={2} opacity={0.9} />
        <circle cx={mousePos.x} cy={mousePos.y} r={4} fill="#60a5fa" opacity={0.6} />
      </g>
    )
  }

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  return (
    <div className="h-screen bg-[#0f1117] flex flex-col overflow-hidden" onClick={handleCanvasClick}>
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <span className="font-bold text-slate-800 text-lg">XinMeng.ai</span>
        </div>

        <div className="flex items-center gap-4">
          {user?.isAdmin && (
            <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">管理后台</span>
            </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Save className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">保存</span>
          </button>
          <button onClick={runWorkflow} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Play className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">运行全部</span>
          </button>
          <button onClick={() => navigate('/membership')} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Diamond className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">会员</span>
          </button>
          <button onClick={() => navigate('/recharge')} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Wallet className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">充值</span>
          </button>
          <button onClick={() => navigate('/credit-records')} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">余额明细</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">余额 ¥{user?.credits !== undefined ? (user.credits / 100).toFixed(2) : '---'}</span>
          </button>
          <button onClick={() => navigate('/notifications')} className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/login')} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-medium">{user?.nickname?.[0] || 'U'}</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Floating Left Toolbar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 bg-[#1a1d29]/90 backdrop-blur border border-white/10 rounded-2xl p-2 shadow-xl">
          {leftTools.map((tool) => (
            <button
              key={tool.label}
              onClick={() => {
                if (tool.action === 'navigate-home') navigate('/')
                else setActiveTool(tool.label)
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-11 ${activeTool === tool.label && tool.action !== 'navigate-home' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
              <span className="text-[10px]">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Connection mode indicator */}
        {connectingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-500/20 border border-blue-500/50 text-blue-300 px-4 py-2 rounded-lg text-sm">
            拖拽连线中... 松开鼠标连接到目标输入端口
          </div>
        )}

        {!connectingFrom && hoveredConn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">
            点击左键剪断连线
          </div>
        )}

        {!connectingFrom && !hoveredConn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-500/10 border border-white/5 text-slate-400 px-4 py-1.5 rounded-lg text-xs">
            提示：从节点右侧端口拖拽可连线，鼠标放到线上点击左键可剪断
          </div>
        )}

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {/* Grid Background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
              backgroundSize: `${40 * scale}px ${40 * scale}px`,
              transform: `translate(${offset.x % (40 * scale)}px, ${offset.y % (40 * scale)}px)`,
            }}
          />

          {/* Canvas Content */}
          <div className="absolute inset-0" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
            {/* Connection Lines */}
            <svg className="absolute inset-0" style={{ width: '100%', height: '100%', overflow: 'visible' }} onClick={handleSvgClick}>
              {renderConnections()}
              {renderDragLine()}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const inConns = connections.filter((c) => c.to === node.id)
              const outConns = connections.filter((c) => c.from === node.id)
              const maxInPort = inConns.length > 0 ? Math.max(...inConns.map((c) => c.toPort)) : -1
              const maxOutPort = outConns.length > 0 ? Math.max(...outConns.map((c) => c.fromPort)) : -1
              const inputPorts = Math.max(maxInPort + 2, 1)
              const outputPorts = Math.max(maxOutPort + 2, 1)
              const isConnectingFromThis = connectingFrom?.nodeId === node.id

              return (
                <div
                  key={node.id}
                  ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id) }}
                  className={`absolute bg-[#1e2230]/90 backdrop-blur border rounded-2xl p-4 shadow-xl select-none ${isConnectingFromThis ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-white/10'} ${draggingNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ left: node.x, top: node.y, width: '18rem' }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {/* Left ports (inputs) */}
                  <div className="absolute left-0 top-10 bottom-4 w-4 -translate-x-1/2 flex flex-col justify-start gap-6 pointer-events-auto">
                    {Array.from({ length: inputPorts }).map((_, i) => (
                      <div
                        key={`in-${i}`}
                        ref={(el) => { const key = getPortKey(node.id, 'left', i); if (el) portRefs.current.set(key, el); else portRefs.current.delete(key) }}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'left', i)}
                        className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 bg-[#1e2230] transition-all hover:border-blue-400 hover:bg-blue-500/30 hover:scale-125"
                        style={{ marginTop: i === 0 ? '16px' : '0' }}
                        title="输入端口"
                      />
                    ))}
                  </div>

                  {/* Right ports (outputs) */}
                  <div className="absolute right-0 top-10 bottom-4 w-4 translate-x-1/2 flex flex-col justify-start gap-6 pointer-events-auto">
                    {Array.from({ length: outputPorts }).map((_, i) => (
                      <div
                        key={`out-${i}`}
                        ref={(el) => { const key = getPortKey(node.id, 'right', i); if (el) portRefs.current.set(key, el); else portRefs.current.delete(key) }}
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'right', i)}
                        className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 bg-[#1e2230] transition-all hover:border-green-400 hover:bg-green-500/30 hover:scale-125 cursor-crosshair"
                        style={{ marginTop: i === 0 ? '16px' : '0' }}
                        title="输出端口"
                      />
                    ))}
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white">{node.title}</h3>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        node.status === 'done' ? 'bg-green-500/20 text-green-400' :
                        node.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {node.status === 'done' ? '已完成' : node.status === 'running' ? '运行中' : '待运行'}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="删除节点">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Node Content */}
                  <div className="w-full">
                    {/* Preview area */}
                    {node.type === 'text' && node.result && (
                      <div className="w-full p-2 bg-[#0f1117]/50 border border-white/10 rounded-xl mb-2 max-h-32 overflow-y-auto">
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{node.result}</p>
                      </div>
                    )}
                    {(node.type === 'image' || node.type === 'video') && (
                      <div className="w-full bg-[#0f1117]/50 border border-white/10 rounded-xl mb-2 flex items-center justify-center overflow-hidden">
                        {node.result ? (
                          <img src={node.result} alt="generated" className="w-full h-auto object-contain" />
                        ) : node.status === 'running' ? (
                          <div className="flex flex-col items-center gap-2 py-8">
                            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                            <span className="text-xs text-slate-500">生成中...</span>
                          </div>
                        ) : (
                          <div className="py-8 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Config row */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <select
                        value={node.model || MODELS[0]}
                        onChange={(e) => setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, model: e.target.value } : n))}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 p-1.5 bg-[#0f1117]/50 border border-white/10 rounded-lg text-[10px] text-slate-300 focus:outline-none"
                      >
                        {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      {node.type !== 'text' && (
                        <>
                          <select
                            value={node.size || SIZES[2]}
                            onChange={(e) => setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, size: e.target.value } : n))}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 p-1.5 bg-[#0f1117]/50 border border-white/10 rounded-lg text-[10px] text-slate-300 focus:outline-none"
                          >
                            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select
                            value={node.ratio || RATIOS[0]}
                            onChange={(e) => setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, ratio: e.target.value } : n))}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 p-1.5 bg-[#0f1117]/50 border border-white/10 rounded-lg text-[10px] text-slate-300 focus:outline-none"
                          >
                            {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </>
                      )}
                    </div>

                    {/* Prompt display */}
                    <div className="text-[10px] text-slate-500 truncate mb-2" title={node.content}>
                      {node.content || '无提示词'}
                    </div>

                    {/* Run button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); runNode(node.id) }}
                      disabled={node.status === 'running'}
                      className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {node.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {node.status === 'running' ? '运行中...' : '运行'}
                    </button>
                  </div>

                  {/* Click overlay */}
                  <div className="absolute inset-0 cursor-pointer" onClick={(e) => handleNodeClick(e, node.id)} style={{ zIndex: 1 }} />
                </div>
              )
            })}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-20 flex items-center gap-2">
            <button className="p-2 bg-[#1e2230]/80 border border-white/10 rounded-lg text-slate-400 hover:text-white">
              <Wand2 className="w-4 h-4" />
            </button>
            <button onClick={runWorkflow} className="p-2 bg-[#1e2230]/80 border border-white/10 rounded-lg text-slate-400 hover:text-white">
              <Play className="w-4 h-4" />
            </button>
            <button className="p-2 bg-[#1e2230]/80 border border-white/10 rounded-lg text-slate-400 hover:text-white">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button className="p-2 bg-[#1e2230]/80 border border-white/10 rounded-lg text-slate-400 hover:text-white">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-[#1e2230]/80 border border-white/10 rounded-lg px-2 py-1">
            <button onClick={() => setScale((s) => Math.max(s - 0.1, 0.2))} className="p-1 text-slate-400 hover:text-white"><Minus className="w-4 h-4" /></button>
            <span className="text-sm text-slate-300 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(s + 0.1, 5))} className="p-1 text-slate-400 hover:text-white"><Plus className="w-4 h-4" /></button>
            <button className="p-1 text-slate-400 hover:text-white"><Lock className="w-4 h-4" /></button>
          </div>

          {/* Mini Map */}
          <div className="absolute bottom-4 right-48 w-48 h-32 bg-[#1e2230]/80 border border-white/10 rounded-lg p-2">
            <div className="w-full h-full bg-[#0f1117] rounded border border-white/5 relative overflow-hidden">
              {nodes.map((node) => (
                <div key={node.id} className="absolute bg-blue-500/40 rounded" style={{ left: `${Math.min(90, (node.x / 1400) * 100)}%`, top: `${Math.min(90, (node.y / 700) * 100)}%`, width: '8%', height: '6%' }} />
              ))}
              <div className="absolute border-2 border-blue-400/60 rounded" style={{ left: `${Math.max(0, Math.min(80, (-offset.x / 1400) * 100))}%`, top: `${Math.max(0, Math.min(70, (-offset.y / 700) * 100))}%`, width: '20%', height: '20%' }} />
            </div>
          </div>
        </div>

        {/* Center Input Box */}
        {selectedNode && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#1e2230]/95 backdrop-blur border border-white/20 rounded-2xl p-4 shadow-2xl w-[36rem] animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-400">编辑节点：{selectedNode.title}</div>
                <button onClick={() => { setSelectedNodeId(null); setCenterInputValue('') }} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <span className="text-xs">✕</span>
                </button>
              </div>
              <textarea
                value={centerInputValue}
                onChange={(e) => handleCenterInputChange(e.target.value)}
                className="w-full h-16 p-3 bg-[#0f1117]/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none mb-3"
                placeholder="输入内容..."
                autoFocus
              />
              <div className="flex items-center gap-2">
                <select value={selectedNode.model || MODELS[0]} onChange={(e) => handleNodeModelChange(e.target.value)} className="flex-1 p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50">
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {selectedNode.type !== 'text' && (
                  <>
                    <select value={selectedNode.size || SIZES[2]} onChange={(e) => handleNodeSizeChange(e.target.value)} className="flex-1 p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50">
                      {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={selectedNode.ratio || RATIOS[0]} onChange={(e) => handleNodeRatioChange(e.target.value)} className="flex-1 p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50">
                      {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu.visible && (
          <div className="absolute z-50 bg-[#1e2230] border border-white/10 rounded-xl shadow-xl py-2 min-w-[160px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="px-3 py-1.5 text-xs text-slate-500 font-medium">添加节点</div>
            <button onClick={() => addNode('text')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
              <Type className="w-4 h-4 text-blue-400" /> 文本节点
            </button>
            <button onClick={() => addNode('image')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
              <ImageIcon className="w-4 h-4 text-green-400" /> 图片节点
            </button>
            <button onClick={() => addNode('video')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
              <Play className="w-4 h-4 text-purple-400" /> 视频节点
            </button>
            <div className="my-1 border-t border-white/10" />
            <div className="px-3 py-1.5 text-xs text-slate-500">提示：从节点右侧端口拖拽可连线</div>
          </div>
        )}
      </div>
    </div>
  )
}
