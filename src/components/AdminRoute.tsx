import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuthStore } from '@/store/adminAuthStore'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const adminToken = useAdminAuthStore(state => state.adminToken)
  
  if (!adminToken) {
    return <Navigate to="/admin-login" replace />
  }
  
  return <>{children}</>
}
