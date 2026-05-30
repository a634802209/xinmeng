export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* 无限符号 + 球体 SVG */}
      <svg viewBox="0 0 200 80" className="h-9 w-auto">
        <defs>
          {/* 左环渐变 */}
          <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          {/* 右环渐变 */}
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          {/* 球体渐变 */}
          <radialGradient id="sg" cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#C7D2FE" />
            <stop offset="60%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </radialGradient>
        </defs>

        {/* 左环 */}
        <path
          d="M 90 40 C 80 52, 65 60, 50 60 C 30 60, 18 50, 18 38 C 18 26, 32 18, 48 18 C 63 18, 75 26, 83 36 C 87 42, 89 46, 90 40"
          fill="none"
          stroke="url(#lg)"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* 右环 */}
        <path
          d="M 90 40 C 100 52, 115 60, 130 60 C 150 60, 162 50, 162 38 C 162 26, 148 18, 132 18 C 117 18, 105 26, 97 36 C 93 42, 91 46, 90 40"
          fill="none"
          stroke="url(#rg)"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* 粒子 */}
        <circle cx="132" cy="24" r="2.5" fill="#DDD6FE" />
        <circle cx="126" cy="29" r="2.2" fill="#E9D5FF" />
        <circle cx="120" cy="34" r="2" fill="#F3E8FF" />
        <circle cx="114" cy="38" r="1.8" fill="#FAE8FF" />
        <circle cx="109" cy="42" r="1.5" fill="#FDF4FF" />

        {/* 球体 */}
        <circle cx="148" cy="14" r="12" fill="url(#sg)" />
        <ellipse cx="142" cy="8" rx="4" ry="3" fill="white" opacity="0.9" />
      </svg>

      {/* 文字 */}
      <span className="text-base font-medium text-slate-800 tracking-tight">新梦</span>
      <span className="text-base font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
        AI
      </span>
    </div>
  )
}
