import { lazy, Suspense } from 'react'
import Layout from '../components/layout/Layout'
import { LoadingState } from '../components/ui/FeedbackState'
import { useAuth } from '../contexts/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import { access } from './access'

const DesignSystemPage = lazy(() => import('../pages/design-system/DesignSystemPage'))

export default function DesignSystemRoute() {
  const { session, sessionStatus } = useAuth()
  const gallery = <Suspense fallback={<LoadingState />}><DesignSystemPage /></Suspense>

  if (import.meta.env.DEV && (sessionStatus !== 'ready' || session?.role !== 'ADMIN')) {
    return <main className="p-4 lg:p-8">{gallery}</main>
  }

  return <ProtectedRoute policy={access.admin}><Layout>{gallery}</Layout></ProtectedRoute>
}
