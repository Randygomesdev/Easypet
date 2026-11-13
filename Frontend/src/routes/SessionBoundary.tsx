import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/FeedbackState'
import { useAuth } from '../contexts/AuthContext'

export default function SessionBoundary({ children }: { children: ReactNode }) {
  const { session, sessionStatus, refreshSession, logout } = useAuth()

  if (sessionStatus === 'anonymous') return <Navigate to="/login" replace />
  if (sessionStatus === 'ready' && session) return children

  return (
    <main className="mx-auto max-w-xl p-4 lg:p-8">
      {sessionStatus === 'loading' ? <LoadingState label="Verificando sua sessão…" /> : (
        <ErrorState message="Não foi possível verificar sua sessão."
          action={<div className="space-y-3">
            <p className="text-sm text-text-body">Aguarde alguns instantes e tente novamente. Sua sessão continua guardada neste navegador.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={refreshSession}>Tentar novamente</Button>
              <Button variant="secondary" onClick={logout}>Sair</Button>
            </div>
            <Link to="/suporte" className="inline-flex min-h-11 items-center rounded px-2 text-sm font-semibold
              text-text-heading underline focus-visible:outline-2 focus-visible:outline-primary-400">Suporte interno</Link>
          </div>} />
      )}
    </main>
  )
}
