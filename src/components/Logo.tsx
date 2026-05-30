export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/xinmeng-logo.png" 
        alt="XinMeng AI Logo" 
        className="h-9 w-auto object-contain"
      />
    </div>
  )
}
