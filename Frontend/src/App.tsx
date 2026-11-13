import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRouter from './routes/RoleRouter'
import { env } from './config/env'

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
import HomePage           from './pages/app/HomePage'
import PetsPage           from './pages/app/PetsPage'
import PetFormPage        from './pages/app/PetFormPage'
import PetDetailPage      from './pages/app/PetDetailPage'
import PartnerDetailPage       from './pages/app/PartnerDetailPage'
import MeusAgendamentosPage   from './pages/app/MeusAgendamentosPage'
import CartPage               from './pages/app/CartPage'
import PaymentSuccessPage     from './pages/app/PaymentSuccessPage'
import PaymentPendingPage     from './pages/app/PaymentPendingPage'
import PaymentFailurePage     from './pages/app/PaymentFailurePage'
import ParceirosPage       from './pages/admin/ParceirosPage'
import ParceiroDetailPage from './pages/admin/ParceiroDetailPage'
import ClientesPage        from './pages/admin/ClientesPage'

function AdminColaboradorWrapper() {
  const { partnerId } = useParams<{ partnerId: string }>()
  return <ColaboradorPage adminPartnerId={partnerId ?? ''} />
}

const router = createBrowserRouter([
  // Rotas públicas
  { path: '/',              element: env.internalPilot ? <RoleRouter /> : <LandingPage /> },
  { path: '/login',           element: <LoginPage /> },
  { path: '/login-success',  element: env.internalPilot ? <Navigate to="/login" replace /> : <LoginSuccessPage /> },
  { path: '/seja-parceiro',  element: env.internalPilot ? <Navigate to="/login" replace /> : <SejaParceiroPage /> },
  { path: '/unauthorized',   element: <Navigate to="/" replace /> },

  // Painel do parceiro (PARTNER)
  {
    path: '/partner',
    element: (
      <ProtectedRoute roles={['PARTNER']}>
        <Layout><Outlet /></Layout>
      </ProtectedRoute>
    ),
    children: [
      { index: true,           element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',     element: <DashboardPage /> },
      { path: 'cadastro',      element: <CadastroPage /> },
      { path: 'colaboradores',           element: <ColaboradoresPage /> },
      { path: 'colaboradores/novo',      element: <ColaboradorPage /> },
      { path: 'colaboradores/:staffId',  element: <ColaboradorPage /> },
      { path: 'servicos',      element: <ServicosPage /> },
      { path: 'pacotes',       element: env.internalPilot ? <Navigate to="/partner/dashboard" replace /> : <PacotesPage /> },
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
      { index: true,           element: <Navigate to="parceiros" replace /> },
      { path: 'parceiros',     element: <ParceirosPage /> },
      { path: 'parceiros/:id', element: <ParceiroDetailPage /> },
      { path: 'parceiros/:partnerId/colaboradores/novo',      element: <AdminColaboradorWrapper /> },
      { path: 'parceiros/:partnerId/colaboradores/:staffId',  element: <AdminColaboradorWrapper /> },
      { path: 'clientes',  element: <ClientesPage /> },
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
      { index: true,                          element: <Navigate to="home" replace /> },
      { path: 'home',                         element: <HomePage /> },
      { path: 'parceiros/:id',                element: <PartnerDetailPage /> },
      { path: 'pets',                         element: <PetsPage /> },
      { path: 'pets/novo',                    element: <PetFormPage /> },
      { path: 'pets/:id',                     element: <PetDetailPage /> },
      { path: 'pets/:id/editar',              element: <PetFormPage /> },
      { path: 'agendamentos',                 element: <MeusAgendamentosPage /> },
      { path: 'carrinho',                     element: env.internalPilot ? <Navigate to="/app/pets" replace /> : <CartPage /> },
      { path: 'pagamento/sucesso',            element: env.internalPilot ? <Navigate to="/app/pets" replace /> : <PaymentSuccessPage /> },
      { path: 'pagamento/pendente',           element: env.internalPilot ? <Navigate to="/app/pets" replace /> : <PaymentPendingPage /> },
      { path: 'pagamento/falha',              element: env.internalPilot ? <Navigate to="/app/pets" replace /> : <PaymentFailurePage /> },
    ],
  },

])

export default function App() {
  return <RouterProvider router={router} />
}
