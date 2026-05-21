import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Diamond, Wallet, Coins, Bell, Receipt,
  MousePointer2, Hand, StickyNote, Image as ImageIcon, Type, ZoomIn, Settings,
  Play, Trash2, Scissors,
  Lock, Maximize2, Minus, Plus, HelpCircle, Wand2
} from 'lucide-react'

const leftTools = [
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
  const [dragLine, setDragLine] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null)

  // Port refs for precise positioning
  const portRefs = useRef<Record<string, { inputs: HTMLDivElement[]; outputs: HTMLDivElement[] }>>({})

  const getPortCenter = (nodeId: string, side: 'left' | 'right', index: number) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }
    const refs = portRefs.current[nodeId]
    if (!refs) {
      // fallback to approximate position
      const x = side === 'left' ? node.x : node.x + 288
      const y = node.y + 100
      return { x, y }
    }
    const el = side === 'left' ? refs.inputs[index] : refs.outputs[index]
    if (!el) {
      const x = side === 'left' ? node.x : node.x + 288
      const y = node.y + 100
      return { x, y }
    }
    const rect = el.getBoundingClientRect()
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return { x: 0, y: 0 }
    const x = (rect.left + rect.width / 2 - canvasRect.left - offset.x) / scale
    const y = (rect.top + rect.height / 2 - canvasRect.top - offset.y) / scale
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
    if (draggingNode) {
      const worldX = (e.clientX - offset.x) / scale
      const worldY = (e.clientY - offset.y) / scale
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNode
            ? { ...n, x: worldX - nodeDragOffset.x, y: worldY - nodeDragOffset.y }
            : n
        )
      )
    }
    if (connectingFrom && dragLine) {
      const worldX = (e.clientX - offset.x) / scale
      const worldY = (e.clientY - offset.y) / scale
      setDragLine((prev) => prev ? { ...prev, toX: worldX, toY: worldY } : null)
    }
  }

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
    setDraggingNode(null)
    if (connectingFrom && dragLine) {
      setConnectingFrom(null)
      setDragLine(null)
    }
  }

  // Port mouse down - start drag connection
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right', portIndex: number) => {
    e.stopPropagation()
    if (side !== 'right') return

    const pos = getPortCenter(nodeId, side, portIndex)
    setConnectingFrom({ nodeId, portIndex })
    setDragLine({ fromX: pos.x, fromY: pos.y, toX: pos.x, toY: pos.y })
  }

  // Port mouse up - finish drag connection
  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right') => {
    e.stopPropagation()
    if (!connectingFrom || !dragLine) return
    if (side !== 'left') return
    if (connectingFrom.nodeId === nodeId) {
      setConnectingFrom(null)
      setDragLine(null)
      return
    }

    const newConn: Connection = {
      id: `c${Date.now()}`,
      from: connectingFrom.nodeId,
      to: nodeId,
    }
    setConnections((prev) => [...prev, newConn])

    setConnectingFrom(null)
    setDragLine(null)
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    const worldX = (e.clientX - offset.x) / scale
    const worldY = (e.clientY - offset.y) / scale
    setNodeDragOffset({ x: worldX - node.x, y: worldY - node.y })
    setDraggingNode(nodeId)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true })
  }

  const addNode = (type: 'text' | 'image' | 'video') => {
    const worldX = (contextMenu.x - offset.x) / scale
    const worldY = (contextMenu.y - offset.y) / scale
    const id = `node-${Date.now()}`
    const newNode: CanvasNode = {
      id,
      title: type === 'text' ? '文本生成' : type === 'image' ? '图片生成' : '视频生成',
      x: worldX,
      y: worldY,
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
    delete portRefs.current[nodeId]
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

  // Register port ref
  const registerPort = (nodeId: string, side: 'left' | 'right', index: number, el: HTMLDivElement | null) => {
    if (!el) return
    if (!portRefs.current[nodeId]) {
      portRefs.current[nodeId] = { inputs: [], outputs: [] }
    }
    if (side === 'left') {
      portRefs.current[nodeId].inputs[index] = el
    } else {
      portRefs.current[nodeId].outputs[index] = el
    }
  }

  // Render connections using precise port positions
  const renderConnections = () => {
    return connections.map((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.from)
      const toNode = nodes.find((n) => n.id === conn.to)
      if (!fromNode || !toNode) return null

      const fromIndex = getConnectionPortIndex(conn.id, conn.from, true)
      const toIndex = getConnectionPortIndex(conn.id, conn.to, false)

      const fromPos = getPortCenter(conn.from, 'right', fromIndex)
      const toPos = getPortCenter(conn.to, 'left', toIndex)

      const midX = (fromPos.x + toPos.x) / 2
      const midY = (fromPos.y + toPos.y) / 2

      return (
        <g key={conn.id}>
          <path
            d={`M ${fromPos.x} ${fromPos.y} C ${fromPos.x + 80} ${fromPos.y}, ${toPos.x - 80} ${toPos.y}, ${toPos.x} ${toPos.y}`}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.6"
            className="pointer-events-auto cursor-pointer hover:opacity-100"
            onClick={() => deleteConnection(conn.id)}
          />
          <foreignObject x={midX - 8} y={midY - 8} width="16" height="16">
            <div
              onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id) }}
              className="w-4 h-4 rounded-full bg-[#1e2230] border border-white/30 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
              title="剪断连线"
            >
              <Scissors className="w-2 h-2 text-white" />
            </div>
          </foreignObject>
        </g>
      )
    })
  }

  const renderDragLine = () => {
    if (!dragLine) return null
    return (
      <g>
        <path
          d={`M ${dragLine.fromX} ${dragLine.fromY} C ${dragLine.fromX + 80} ${dragLine.fromY}, ${dragLine.toX - 80} ${dragLine.toY}, ${dragLine.toX} ${dragLine.toY}`}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.8"
        />
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

  // Force re-render when nodes move or scale changes to update line positions
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

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/membership')} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all">
            <Diamond className="w-4 h-4 text-blue-400" />
            <span className="text-sm">会员</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all">
            <Wallet className="w-4 h-4 text-purple-400" />
            <span className="text-sm">充值</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span className="text-sm">余额明细</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg transition-all">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm">余额 12,860</span>
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
              onClick={() => setActiveTool(tool.label)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-11 ${
                activeTool === tool.label
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

        {/* Port hover hint */}
        {!connectingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-500/10 border border-white/5 text-slate-400 px-4 py-1.5 rounded-lg text-xs">
            提示：从节点右侧端口拖拽可连线
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
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
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
                  <div className="absolute left-0 top-0 bottom-0 w-4 -translate-x-1/2 flex flex-col justify-center gap-2 pointer-events-auto">
                    {Array.from({ length: inputPorts }).map((_, i) => (
                      <div
                        key={`in-${i}`}
                        ref={(el) => registerPort(node.id, 'left', i, el)}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'left')}
                        className="w-3 h-3 rounded-full border-2 border-slate-600 bg-slate-700/50 transition-all hover:border-blue-400 hover:bg-blue-500/30 hover:scale-125"
                        title="输入端口"
                      />
                    ))}
                  </div>

                  {/* Right ports (outputs) */}
                  <div className="absolute right-0 top-0 bottom-0 w-4 translate-x-1/2 flex flex-col justify-center gap-2 pointer-events-auto">
                    {Array.from({ length: outputPorts }).map((_, i) => (
                      <div
                        key={`out-${i}`}
                        ref={(el) => registerPort(node.id, 'right', i, el)}
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'right', i)}
                        className="w-3 h-3 rounded-full border-2 border-slate-600 bg-slate-700/50 transition-all hover:border-green-400 hover:bg-green-500/30 hover:scale-125 cursor-crosshair"
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
