export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 -mt-2 ${className}`}>
      {/* 使用项目本地 LOGO */}
      <img 
        src="/LOGO.PNG.png" 
        alt="XinMeng AI Logo" 
        className="h-14 w-auto"
      />
    </div>
  )
}