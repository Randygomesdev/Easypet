import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleRouter() {
  const { user } = useAuth()

  if (user?.role === 'PARTNER') return <Navigate to="/partner/dashboard" replace />
  if (user?.role === 'ADMIN')          return <Navigate to="/admin/dashboard"   replace />
  if (user?.role === 'CUSTOMER')       return <Navigate to="/app/home"          replace />

  // Não logado — landing page
  return <Navigate to="/" replace />
}
