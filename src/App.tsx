import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Membership from '@/pages/Membership'
import Canvas from '@/pages/Canvas'
import Recharge from '@/pages/Recharge'
import CreditRecords from '@/pages/CreditRecords'
import AdminDashboard from '@/pages/AdminDashboard'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="/recharge" element={<Recharge />} />
        <Route path="/credit-records" element={<CreditRecords />} />
        <Route path="/admin" element={<AdminDashboard />} />
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
