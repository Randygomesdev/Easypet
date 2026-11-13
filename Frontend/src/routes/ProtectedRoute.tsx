import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { canAccess, type AccessPolicy } from './access'
import SessionBoundary from './SessionBoundary'

type Props = {
  children?: React.ReactNode
  policy: AccessPolicy
}

export default function ProtectedRoute({ children, policy }: Props) {
  const { session } = useAuth()

  return (
    <SessionBoundary>
      {canAccess(session, policy) ? children ?? <Outlet /> : <Navigate to="/painel" replace />}
    </SessionBoundary>
  )
}
