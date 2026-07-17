import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRouter from './routes/RoleRouter'

import LandingPage      from './pages/LandingPage'
import LoginPage         from './pages/auth/LoginPage'
import LoginSuccessPage  from './pages/auth/LoginSuccessPage'
import SejaParceiroPage  from './pages/auth/SejaParceiroPage'

import DashboardPage      from './pages/partner/DashboardPage'
import CadastroPage       from './pages/partner/CadastroPage'
import ColaboradoresPage  from './pages/partner/ColaboradoresPage'
import ColaboradorPage    from './pages/partner/ColaboradorPage'
import ServicosPage       from './pages/partner/ServicosPage'
import PacotesPage        from './pages/partner/PacotesPage'
import AgendamentosPage   from './pages/partner/AgendamentosPage'
import AtendimentoPage    from './pages/partner/AtendimentoPage'
import PlaceholderPage    from './pages/partner/PlaceholderPage'

const router = createBrowserRouter([
  // Rotas públicas
  { path: '/',              element: <LandingPage /> },
  { path: '/login',           element: <LoginPage /> },
  { path: '/login-success',  element: <LoginSuccessPage /> },
  { path: '/seja-parceiro',  element: <SejaParceiroPage /> },

  // Painel do parceiro (PARTNER)
  {
    path: '/partner',
    element: (
      <ProtectedRoute roles={['PARTNER']}>
        <Layout><Outlet /></Layout>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard',     element: <DashboardPage /> },
      { path: 'cadastro',      element: <CadastroPage /> },
      { path: 'colaboradores',           element: <ColaboradoresPage /> },
      { path: 'colaboradores/novo',      element: <ColaboradorPage /> },
      { path: 'colaboradores/:staffId',  element: <ColaboradorPage /> },
      { path: 'servicos',      element: <ServicosPage /> },
      { path: 'pacotes',       element: <PacotesPage /> },
      { path: 'agendamentos',  element: <AgendamentosPage /> },
      { path: 'atendimento',   element: <AtendimentoPage /> },
    ],
  },

  // Painel admin (a construir)
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <Layout><Outlet /></Layout>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <PlaceholderPage title="Admin Dashboard" /> },
    ],
  },

  // App do cliente (a construir)
  {
    path: '/app',
    element: (
      <ProtectedRoute roles={['CUSTOMER']}>
        <Layout><Outlet /></Layout>
      </ProtectedRoute>
    ),
    children: [
      { path: 'home', element: <PlaceholderPage title="Home" /> },
    ],
  },

])

export default function App() {
  return <RouterProvider router={router} />
}
