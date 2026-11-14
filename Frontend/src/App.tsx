import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRouter from './routes/RoleRouter'
import DesignSystemRoute from './routes/DesignSystemRoute'
import InternalSupportPage from './routes/InternalSupportPage'
import { access, waveBEnabled } from './routes/access'
import { env } from './config/env'

import LandingPage      from './pages/LandingPage'
import LoginPage         from './pages/auth/LoginPage'
import LoginSuccessPage  from './pages/auth/LoginSuccessPage'
import SejaParceiroPage  from './pages/auth/SejaParceiroPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import TeamInvitationPage from './pages/auth/TeamInvitationPage'

import DashboardPage      from './pages/partner/DashboardPage'
import CadastroPage       from './pages/partner/CadastroPage'
import ColaboradoresPage  from './pages/partner/ColaboradoresPage'
import ColaboradorPage    from './pages/partner/ColaboradorPage'
import PartnerClientesPage from './pages/partner/ClientesPage'
import ServicosPage       from './pages/partner/ServicosPage'
import PacotesPage        from './pages/partner/PacotesPage'
import AgendamentosPage   from './pages/partner/AgendamentosPage'
import AtendimentoPage    from './pages/partner/AtendimentoPage'
import CaixaPage          from './pages/partner/CaixaPage'
import EquipePage         from './pages/partner/EquipePage'
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
import MasterDashboardPage from './pages/admin/MasterDashboardPage'
import MasterSystemPage from './pages/admin/MasterSystemPage'
import ParceiroDetailPage from './pages/admin/ParceiroDetailPage'
import ClientesPage        from './pages/admin/ClientesPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import ClaimCustomerPage from './features/claims/ClaimCustomerPage'

const recoveryEnabled = !env.internalPilot || import.meta.env.VITE_AUTH_RECOVERY_ENABLED === 'true'

function AdminColaboradorWrapper() {
  const { partnerId } = useParams<{ partnerId: string }>()
  return <ColaboradorPage adminPartnerId={partnerId ?? ''} />
}

const router = createBrowserRouter([
  // Rotas públicas
  { path: '/',              element: env.internalPilot ? <RoleRouter /> : <LandingPage /> },
  { path: '/login',           element: <LoginPage /> },
  { path: '/painel',          element: <RoleRouter /> },
  { path: '/forgot-password', element: recoveryEnabled ? <ForgotPasswordPage /> : <Navigate to="/login" replace /> },
  { path: '/reset-password', element: recoveryEnabled ? <ResetPasswordPage /> : <Navigate to="/login" replace /> },
  { path: '/team/invitation', element: waveBEnabled ? <TeamInvitationPage /> : <Navigate to="/login" replace /> },
  { path: '/login-success',  element: env.googleAuthEnabled ? <LoginSuccessPage /> : <Navigate to="/login" replace /> },
  { path: '/seja-parceiro',  element: env.internalPilot ? <Navigate to="/login" replace /> : <SejaParceiroPage /> },
  { path: '/unauthorized',   element: <Navigate to="/painel" replace /> },
  { path: '/design-system',  element: <DesignSystemRoute /> },
  { path: '/suporte', element: <InternalSupportPage /> },

  // Painel do estabelecimento
  {
    path: '/partner',
    element: (
      <ProtectedRoute policy={access.operations}>
        <Layout><Outlet /></Layout>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleRouter /> },
      {
        element: <ProtectedRoute policy={access.partner} />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'cadastro', element: <CadastroPage /> },
          { path: 'colaboradores', element: <ColaboradoresPage /> },
          { path: 'colaboradores/novo', element: <ColaboradorPage /> },
          { path: 'colaboradores/:staffId', element: <ColaboradorPage /> },
          { path: 'servicos', element: <ServicosPage /> },
          ...(waveBEnabled ? [{ path: 'equipe', element: <EquipePage /> }] : []),
          { path: 'pacotes', element: env.internalPilot ? <Navigate to="/partner/dashboard" replace /> : <PacotesPage /> },
        ],
      },
      { path: 'clientes', element: <ProtectedRoute policy={access.customers}><PartnerClientesPage /></ProtectedRoute> },
      { path: 'agendamentos', element: <ProtectedRoute policy={access.agenda}><AgendamentosPage /></ProtectedRoute> },
      { path: 'atendimento', element: <ProtectedRoute policy={access.attendance}><AtendimentoPage /></ProtectedRoute> },
      ...(waveBEnabled ? [
        { path: 'caixa', element: <ProtectedRoute policy={access.cashier}><CaixaPage /></ProtectedRoute> },
      ] : []),
    ],
  },

  // Administração da plataforma
  {
    path: '/admin',
    element: (
      <ProtectedRoute policy={access.admin}>
        <Layout><Outlet /></Layout>
      </ProtectedRoute>
    ),
    children: [
      { index: true,           element: <Navigate to="visao-geral" replace /> },
      { path: 'visao-geral', element: <MasterDashboardPage /> },
      { path: 'sistema', element: <MasterSystemPage /> },
      { path: 'parceiros',     element: <ParceirosPage /> },
      { path: 'parceiros/:id', element: <ParceiroDetailPage /> },
      { path: 'parceiros/:partnerId/colaboradores/novo',      element: <AdminColaboradorWrapper /> },
      { path: 'parceiros/:partnerId/colaboradores/:staffId',  element: <AdminColaboradorWrapper /> },
      { path: 'clientes',  element: <ClientesPage /> },
      ...(waveBEnabled ? [{ path: 'notificacoes', element: <NotificationsPage /> }] : []),
    ],
  },

  // App do cliente (a construir)
  {
    path: '/app',
    element: (
      <ProtectedRoute policy={access.customer}>
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
      ...(waveBEnabled ? [{ path: 'reivindicar-cadastro', element: <ClaimCustomerPage /> }] : []),
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
