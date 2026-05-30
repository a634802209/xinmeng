export default function Logo({ className = '' }: { className?: string }) {
  return (
<<<<<<< HEAD
    <div className={`flex items-center ${className}`}>
      <img 
        src="/xinmeng-logo.png" 
        alt="XinMeng AI Logo" 
        className="h-9 w-auto object-contain"
=======
    <div className={`flex items-center gap-2 -mt-2 ${className}`}>
      {/* 使用项目本地 LOGO */}
      <img 
        src="/LOGO.PNG.png" 
        alt="XinMeng AI Logo" 
        className="h-14 w-auto"
>>>>>>> eabb14488c26617ad390a6d359b8ff609064cd21
      />
    </div>
  )
}