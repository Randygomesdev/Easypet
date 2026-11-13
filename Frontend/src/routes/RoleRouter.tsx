import { Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/FeedbackState'
import { useAuth } from '../contexts/AuthContext'
import { panelDestination } from './access'
import SessionBoundary from './SessionBoundary'

export default function RoleRouter() {
  const { session, logout } = useAuth()
  const destination = session && panelDestination(session)

  return (
    <SessionBoundary>
      {destination ? <Navigate to={destination} replace /> : (
        <main className="mx-auto max-w-xl p-4 lg:p-8">
          <ErrorState message="Seu acesso não tem um painel disponível."
            action={<Button variant="secondary" onClick={logout}>Sair</Button>} />
        </main>
      )}
    </SessionBoundary>
  )
}
