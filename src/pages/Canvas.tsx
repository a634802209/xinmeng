import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Diamond, Wallet, Coins, Bell, Receipt,
  Home, MousePointer2, Hand, StickyNote, Image as ImageIcon, Type, ZoomIn, Settings,
  Play, Trash2, Scissors,
  Lock, Maximize2, Minus, Plus, HelpCircle, Wand2,
  Save, FolderOpen
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUserSync } from '@/hooks/useUserSync'
import { canvasApi } from '@/lib/api'

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
}

interface Connection {
  id: string
  from: string
  to: string
}

function TextNode({ node }: { node: CanvasNode }) {
  const [model, setModel] = useState(node.model || MODELS[0])
  const [content, setContent] = useState(node.content || '')
  const [running, setRunning] = useState(false)

  const handleRun = () => {
    setRunning(true)
    setTimeout(() => setRunning(false), 2000)
  }

  return (
    <div className="w-72">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="输入提示词..."
        className="w-full h-24 p-3 bg-[#0f1117]/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none mb-3"
      />
      <div className="flex items-center gap-2">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="flex-1 p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          {running ? '运行中' : '运行'}
        </button>
      </div>
    </div>
  )
}

function ImageNode({ node }: { node: CanvasNode }) {
  const [model, setModel] = useState(node.model || MODELS[0])
  const [size, setSize] = useState(node.size || SIZES[2])
  const [ratio, setRatio] = useState(node.ratio || RATIOS[0])
  const [running, setRunning] = useState(false)

  const handleRun = () => {
    setRunning(true)
    setTimeout(() => setRunning(false), 2000)
  }

  return (
    <div className="w-72">
      <div className="w-full h-40 bg-[#0f1117]/50 border border-white/10 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
        {node.status === 'done' ? (
          <img
            src="https://images.unsplash.com/photo-1515630278258-407f66498911?w=400&q=80"
            alt="generated"
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-10 h-10 text-slate-600" />
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
          className="p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {RATIOS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleRun}
        disabled={running}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
      >
        <Play className="w-3 h-3" />
        {running ? '生成中...' : '运行'}
      </button>
    </div>
  )
}

function VideoNode({ node }: { node: CanvasNode }) {
  const [model, setModel] = useState(node.model || MODELS[0])
  const [size, setSize] = useState(node.size || SIZES[3])
  const [ratio, setRatio] = useState(node.ratio || RATIOS[2])
  const [running, setRunning] = useState(node.status === 'running')

  const handleRun = () => {
    setRunning(true)
    setTimeout(() => setRunning(false), 3000)
  }

  return (
    <div className="w-72">
      <div className="w-full h-40 bg-[#0f1117]/50 border border-white/10 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
        {node.status === 'done' ? (
          <img
            src="https://images.unsplash.com/photo-1515630278258-407f66498911?w=400&q=80"
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            </div>
            <span className="text-xs text-slate-500 mt-16">生成中 65%</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
          className="p-2 bg-[#0f1117]/50 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          {RATIOS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleRun}
        disabled={running}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
      >
        <Play className="w-3 h-3" />
        {running ? '生成中...' : '运行'}
      </button>
    </div>
  )
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
    { id: 'c1', from: 'text1', to: 'img1' },
  ])

  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 })

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })

  // Connection drag state
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; portIndex: number } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Hovered connection for scissors
  const [hoveredConn, setHoveredConn] = useState<string | null>(null)

  // Sync user info
  useUserSync(30000)

  const getPortCenter = (nodeId: string, side: 'left' | 'right', index: number) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }

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
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    }
  }

  const worldToScreen = (worldX: number, worldY: number) => {
    return {
      x: worldX * scale + offset.x,
      y: worldY * scale + offset.y,
    }
  }

  // Find nearest input port within snap distance
  const findNearestPort = (worldX: number, worldY: number) => {
    const snapDistance = 50 / scale // 50 screen pixels
    let nearest: { nodeId: string; portIndex: number; x: number; y: number } | null = null
    let minDist = snapDistance

    for (const node of nodes) {
      if (connectingFrom && node.id === connectingFrom.nodeId) continue

      const inCount = connections.filter((c) => c.to === node.id).length
      const inputPorts = Math.max(inCount + 1, 1)

      for (let i = 0; i < inputPorts; i++) {
        const pos = getPortCenter(node.id, 'left', i)
        const dist = Math.sqrt((worldX - pos.x) ** 2 + (worldY - pos.y) ** 2)
        if (dist < minDist) {
          minDist = dist
          nearest = { nodeId: node.id, portIndex: i, x: pos.x, y: pos.y }
        }
      }
    }

    return nearest
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)

    if (isDraggingCanvas) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
    if (draggingNode) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNode
            ? { ...n, x: worldPos.x - nodeDragOffset.x, y: worldPos.y - nodeDragOffset.y }
            : n
        )
      )
    }
    if (connectingFrom) {
      const nearest = findNearestPort(worldPos.x, worldPos.y)
      if (nearest) {
        setMousePos({ x: nearest.x, y: nearest.y })
      } else {
        setMousePos(worldPos)
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDraggingCanvas(false)
    setDraggingNode(null)

    if (connectingFrom) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const nearest = findNearestPort(worldPos.x, worldPos.y)

      if (nearest && nearest.nodeId !== connectingFrom.nodeId) {
        const newConn: Connection = {
          id: `c${Date.now()}`,
          from: connectingFrom.nodeId,
          to: nearest.nodeId,
        }
        setConnections((prev) => [...prev, newConn])
      }

      setConnectingFrom(null)
      setMousePos({ x: 0, y: 0 })
    }
  }

  // Port mouse down - start drag connection
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right', portIndex: number) => {
    e.stopPropagation()
    if (side !== 'right') return

    const pos = getPortCenter(nodeId, side, portIndex)
    setConnectingFrom({ nodeId, portIndex })
    setMousePos(pos)
  }

  // Port mouse up - finish drag connection (fallback)
  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right') => {
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
    }
    setConnections((prev) => [...prev, newConn])

    setConnectingFrom(null)
    setMousePos({ x: 0, y: 0 })
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    const worldPos = screenToWorld(e.clientX, e.clientY)
    setNodeDragOffset({ x: worldPos.x - node.x, y: worldPos.y - node.y })
    setDraggingNode(nodeId)
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

  // Count connections per node
  const getConnectionCount = (nodeId: string, asSource: boolean) => {
    return connections.filter((c) => asSource ? c.from === nodeId : c.to === nodeId).length
  }

  // Get port index for a connection
  const getConnectionPortIndex = (connId: string, nodeId: string, asSource: boolean) => {
    const relevant = connections.filter((c) => asSource ? c.from === nodeId : c.to === nodeId)
    const idx = relevant.findIndex((c) => c.id === connId)
    return Math.max(0, idx)
  }

  // Check if point is near bezier curve
  const pointNearBezier = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, threshold: number = 8) => {
    // Simple line segment approximation for hit testing
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const mt = 1 - t
      // Cubic bezier
      const bx = mt * mt * mt * x1 + 3 * mt * mt * t * (x1 + 80) + 3 * mt * t * t * (x2 - 80) + t * t * t * x2
      const by = mt * mt * mt * y1 + 3 * mt * mt * t * (y1) + 3 * mt * t * t * (y2) + t * t * t * y2
      const dist = Math.sqrt((px - bx) ** 2 + (py - by) ** 2)
      if (dist < threshold) return true
    }
    return false
  }

  // Handle mouse move on SVG for connection hover
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (connectingFrom) return
    const rect = e.currentTarget.getBoundingClientRect()
    const worldPos = screenToWorld(e.clientX, e.clientY)

    let found = null
    for (const conn of connections) {
      const fromNode = nodes.find((n) => n.id === conn.from)
      const toNode = nodes.find((n) => n.id === conn.to)
      if (!fromNode || !toNode) continue

      const fromIndex = getConnectionPortIndex(conn.id, conn.from, true)
      const toIndex = getConnectionPortIndex(conn.id, conn.to, false)
      const fromPos = getPortCenter(conn.from, 'right', fromIndex)
      const toPos = getPortCenter(conn.to, 'left', toIndex)

      if (pointNearBezier(worldPos.x, worldPos.y, fromPos.x, fromPos.y, toPos.x, toPos.y)) {
        found = conn.id
        break
      }
    }
    setHoveredConn(found)
  }

  // Handle click on SVG to delete connection
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hoveredConn) {
      deleteConnection(hoveredConn)
      setHoveredConn(null)
    }
  }

  // Render connections
  const renderConnections = () => {
    return connections.map((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.from)
      const toNode = nodes.find((n) => n.id === conn.to)
      if (!fromNode || !toNode) return null

      const fromIndex = getConnectionPortIndex(conn.id, conn.from, true)
      const toIndex = getConnectionPortIndex(conn.id, conn.to, false)

      const fromPos = getPortCenter(conn.from, 'right', fromIndex)
      const toPos = getPortCenter(conn.to, 'left', toIndex)

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
              {/* Scissors icon at midpoint */}
              <circle
                cx={(fromPos.x + toPos.x) / 2}
                cy={(fromPos.y + toPos.y) / 2}
                r={12}
                fill="#1e2230"
                stroke="#ef4444"
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={(fromPos.x + toPos.x) / 2}
                y={(fromPos.y + toPos.y) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ef4444"
                fontSize={10}
                style={{ pointerEvents: 'none' }}
              >
                ✂
              </text>
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
        <path
          d={`M ${pos.x} ${pos.y} C ${pos.x + 80} ${pos.y}, ${mousePos.x - 80} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
          opacity={0.9}
        />
        {/* Target indicator */}
        <circle cx={mousePos.x} cy={mousePos.y} r={4} fill="#60a5fa" opacity={0.6} />
      </g>
    )
  }

  const renderNode = (node: CanvasNode) => {
    switch (node.type) {
      case 'text':
        return <TextNode node={node} />
      case 'image':
        return <ImageNode node={node} />
      case 'video':
        return <VideoNode node={node} />
      default:
        return null
    }
  }

  // Save project
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

  // Force re-render when nodes move
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    forceUpdate((n) => n + 1)
  }, [nodes, scale, offset, connections])

  return (
    <div className="h-screen bg-[#0f1117] flex flex-col overflow-hidden" onClick={() => setContextMenu({ x: 0, y: 0, visible: false })}>
      {/* Top Bar */}
      <header className="h-14 bg-[#1a1d29]/80 backdrop-blur border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <span className="font-bold text-white text-lg">XinMeng.ai</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all">
            <Save className="w-4 h-4 text-green-400" />
            <span className="text-sm">保存</span>
          </button>
          <button onClick={() => navigate('/membership')} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all">
            <Diamond className="w-4 h-4 text-blue-400" />
            <span className="text-sm">会员</span>
          </button>
          <button
            onClick={() => navigate('/recharge')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all"
          >
            <Wallet className="w-4 h-4 text-purple-400" />
            <span className="text-sm">充值</span>
          </button>
          <button
            onClick={() => navigate('/credit-records')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span className="text-sm">余额明细</span>
          </button>
          <button
            onClick={() => navigate('/credit-records')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm">
              余额 ¥{user?.credits !== undefined ? (user.credits / 100).toFixed(2) : '---'}
            </span>
          </button>
          <button className="relative p-2 text-slate-400 hover:bg-white/5 rounded-lg transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">3</span>
          </button>
          <button onClick={() => navigate('/login')} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
            <span className="text-white text-xs font-medium">U</span>
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
                if (tool.action === 'navigate-home') {
                  navigate('/')
                } else {
                  setActiveTool(tool.label)
                }
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-11 ${
                activeTool === tool.label && tool.action !== 'navigate-home'
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
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

        {/* Hover hint */}
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
              backgroundImage: `
                linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${40 * scale}px ${40 * scale}px`,
              transform: `translate(${offset.x % (40 * scale)}px, ${offset.y % (40 * scale)}px)`,
            }}
          />

          {/* Canvas Content */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Connection Lines */}
            <svg
              className="absolute inset-0"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              onMouseMove={handleSvgMouseMove}
              onClick={handleSvgClick}
            >
              {renderConnections()}
              {renderDragLine()}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const inCount = getConnectionCount(node.id, false)
              const outCount = getConnectionCount(node.id, true)
              const inputPorts = Math.max(inCount + 1, 1)
              const outputPorts = Math.max(outCount + 1, 1)
              const isConnectingFromThis = connectingFrom?.nodeId === node.id

              return (
                <div
                  key={node.id}
                  className={`absolute bg-[#1e2230]/90 backdrop-blur border rounded-2xl p-4 shadow-xl select-none ${
                    isConnectingFromThis ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-white/10'
                  } ${draggingNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ left: node.x, top: node.y }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {/* Left ports (inputs) */}
                  <div className="absolute left-0 top-10 bottom-4 w-4 -translate-x-1/2 flex flex-col justify-start gap-6 pointer-events-auto">
                    {Array.from({ length: inputPorts }).map((_, i) => (
                      <div
                        key={`in-${i}`}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'left')}
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
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'right', i)}
                        className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 bg-[#1e2230] transition-all hover:border-green-400 hover:bg-green-500/30 hover:scale-125 cursor-crosshair"
                        style={{ marginTop: i === 0 ? '16px' : '0' }}
                        title="输出端口"
                      />
                    ))}
                  </div>

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
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="删除节点"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {renderNode(node)}
                </div>
              )
            })}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-20 flex items-center gap-2">
            <button className="p-2 bg-[#1e2230]/80 border border-white/10 rounded-lg text-slate-400 hover:text-white">
              <Wand2 className="w-4 h-4" />
            </button>
            <button className="p-2 bg-[#1e2230]/80 border border-white/10 rounded-lg text-slate-400 hover:text-white">
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
            <button onClick={() => setScale((s) => Math.max(s - 0.1, 0.2))} className="p-1 text-slate-400 hover:text-white">
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(s + 0.1, 5))} className="p-1 text-slate-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 text-slate-400 hover:text-white">
              <Lock className="w-4 h-4" />
            </button>
          </div>

          {/* Mini Map */}
          <div className="absolute bottom-4 right-48 w-48 h-32 bg-[#1e2230]/80 border border-white/10 rounded-lg p-2">
            <div className="w-full h-full bg-[#0f1117] rounded border border-white/5 relative overflow-hidden">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute bg-blue-500/40 rounded"
                  style={{
                    left: `${Math.min(90, (node.x / 1400) * 100)}%`,
                    top: `${Math.min(90, (node.y / 700) * 100)}%`,
                    width: '8%',
                    height: '6%',
                  }}
                />
              ))}
              <div
                className="absolute border-2 border-blue-400/60 rounded"
                style={{
                  left: `${Math.max(0, Math.min(80, (-offset.x / 1400) * 100))}%`,
                  top: `${Math.max(0, Math.min(70, (-offset.y / 700) * 100))}%`,
                  width: '20%',
                  height: '20%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="absolute z-50 bg-[#1e2230] border border-white/10 rounded-xl shadow-xl py-2 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 text-xs text-slate-500 font-medium">添加节点</div>
            <button
              onClick={() => addNode('text')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              <Type className="w-4 h-4 text-blue-400" />
              文本节点
            </button>
            <button
              onClick={() => addNode('image')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-green-400" />
              图片节点
            </button>
            <button
              onClick={() => addNode('video')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              <Play className="w-4 h-4 text-purple-400" />
              视频节点
            </button>
            <div className="my-1 border-t border-white/10" />
            <div className="px-3 py-1.5 text-xs text-slate-500">提示：从节点右侧端口拖拽可连线</div>
          </div>
        )}
      </div>
    </div>
  )
}
