import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Membership from '@/pages/Membership'
import Canvas from '@/pages/Canvas'
import Recharge from '@/pages/Recharge'
import CreditRecords from '@/pages/CreditRecords'
import AdminDashboard from '@/pages/AdminDashboard'
import AdminLogin from '@/pages/AdminLogin'
import QuickCreate from '@/pages/QuickCreate'
import HotkeyHelp from '@/components/HotkeyHelp'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'
import { useUserSync } from '@/hooks/useUserSync'
import { useHotkeys } from '@/hooks/useHotkeys'

function UserSync() {
  useUserSync(30000)
  return null
}

function GlobalHotkeys() {
  const navigate = useNavigate()

  useHotkeys([
    { key: '1', ctrl: true, description: '前往首页', handler: () => navigate('/') },
    { key: '2', ctrl: true, description: '前往快捷创作', handler: () => navigate('/quick-create') },
    { key: '3', ctrl: true, description: '前往无限画布', handler: () => navigate('/canvas') },
    { key: 'm', ctrl: true, description: '前往会员中心', handler: () => navigate('/membership') },
    { key: 'r', ctrl: true, description: '前往充值页面', handler: () => navigate('/recharge') },
    { key: 'l', ctrl: true, description: '前往登录页面', handler: () => navigate('/login') },
    { key: 'ArrowLeft', alt: true, description: '返回上一页', handler: () => window.history.back() },
    { key: 'ArrowRight', alt: true, description: '前进下一页', handler: () => window.history.forward() },
  ])

  return null
}

export default function App() {
  return (
    <Router>
      <UserSync />
      <GlobalHotkeys />
      <HotkeyHelp />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        
        {/* P1 修复：需要登录的路由 */}
        <Route path="/membership" element={<ProtectedRoute><Membership /></ProtectedRoute>} />
        <Route path="/canvas" element={<ProtectedRoute><Canvas /></ProtectedRoute>} />
        <Route path="/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
        <Route path="/credit-records" element={<ProtectedRoute><CreditRecords /></ProtectedRoute>} />
        <Route path="/quick-create" element={<ProtectedRoute><QuickCreate /></ProtectedRoute>} />
        
        {/* P1 修复：需要管理员权限的路由 */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        
        {/* 占位页面，后续可实现 */}
        <Route path="/api-docs" element={<Home />} />
        <Route path="/models" element={<Home />} />
        <Route path="/works" element={<Home />} />
        <Route path="/settings" element={<Home />} />
        <Route path="/templates" element={<Home />} />
        <Route path="/trending" element={<Home />} />
        <Route path="/help" element={<Home />} />
        <Route path="/feedback" element={<Home />} />
        <Route path="/pricing" element={<Home />} />
      </Routes>
    </Router>
  )
}
