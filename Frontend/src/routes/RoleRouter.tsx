import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { env } from '../config/env'

export default function RoleRouter() {
  const { user } = useAuth()

  if (user?.role === 'PARTNER') return <Navigate to="/partner/dashboard" replace />
  if (user?.role === 'ADMIN')          return <Navigate to="/admin/parceiros"  replace />
  if (user?.role === 'CUSTOMER')       return <Navigate to="/app/home"          replace />

  // Não logado — landing page
  return <Navigate to={env.internalPilot ? '/login' : '/'} replace />
}
