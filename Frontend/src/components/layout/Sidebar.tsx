import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import {
  LayoutDashboard, ClipboardList, Users, Wrench, Package,
  CalendarDays, Stethoscope, X, LogOut, Server,
  Bell, Building2, LifeBuoy, Link2, Palette, PawPrint, ShieldCheck, Store, Wallet, CodeXml,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import LogoEasypet from '../../assets/LogoEasypet.svg'
import { useAuth } from '../../contexts/AuthContext'
import { env } from '../../config/env'
import { access, canAccess, waveBEnabled, type AccessPolicy } from '../../routes/access'
import './Sidebar.css'

type NavItem = { icon: LucideIcon; label: string; path: string; policy: AccessPolicy }

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/partner/dashboard', policy: access.partner },
  { icon: ClipboardList, label: 'Cadastro', path: '/partner/cadastro', policy: access.partner },
  { icon: Users, label: 'Clientes', path: '/partner/clientes', policy: access.customers },
  { icon: Users, label: 'Colaboradores', path: '/partner/colaboradores', policy: access.partner },
  ...(waveBEnabled ? [
    { icon: ShieldCheck, label: 'Equipe', path: '/partner/equipe', policy: access.partner },
  ] : []),
  { icon: Wrench, label: 'Serviços', path: '/partner/servicos', policy: access.partner },
  ...(!env.internalPilot ? [
    { icon: Package, label: 'Pacotes', path: '/partner/pacotes', policy: access.partner },
  ] : []),
  { icon: CalendarDays, label: 'Agendamentos', path: '/partner/agendamentos', policy: access.agenda },
  { icon: Stethoscope, label: 'Atendimento', path: '/partner/atendimento', policy: access.attendance },
  ...(waveBEnabled ? [
    { icon: Wallet, label: 'Caixa', path: '/partner/caixa', policy: access.cashier },
  ] : []),
  { icon: LayoutDashboard, label: 'Visão geral', path: '/admin/visao-geral', policy: access.admin },
  { icon: Server, label: 'Sistema', path: '/admin/sistema', policy: access.admin },
  { icon: Building2, label: 'Estabelecimentos', path: '/admin/parceiros', policy: access.admin },
  { icon: Users, label: 'Tutores', path: '/admin/clientes', policy: access.admin },
  ...(waveBEnabled ? [
    { icon: Bell, label: 'Notificações', path: '/admin/notificacoes', policy: access.admin },
  ] : []),
  { icon: Palette, label: 'Design system', path: '/design-system', policy: access.admin },
  { icon: Store, label: 'Início', path: '/app/home', policy: access.customer },
  { icon: PawPrint, label: 'Meus Pets', path: '/app/pets', policy: access.customer },
  { icon: CalendarDays, label: 'Agendamentos', path: '/app/agendamentos', policy: access.customer },
  ...(waveBEnabled ? [
    { icon: Link2, label: 'Vincular cadastro', path: '/app/reivindicar-cadastro', policy: access.customer },
  ] : []),
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { pathname }       = useLocation()
  const { logout, session } = useAuth()
  const navigate           = useNavigate()
  const closeButton = useRef<HTMLButtonElement>(null)

  const navItems = NAV_ITEMS.filter(item => canAccess(session, item.policy))

  useEffect(() => { if (open) closeButton.current?.focus() }, [open])

  function handleMenuKey(event: KeyboardEvent<HTMLElement>) {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
    if (event.key !== 'Tab') return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      .filter(item => item.getClientRects().length > 0)
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop expansion reserves its full width in the page layout. */}
      <div className="sidebar-rail">
      <aside
        id="painel-navegacao"
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={open ? 'Menu do painel' : undefined}
        onKeyDown={handleMenuKey}
        className={`
          panel-sidebar fixed z-30 top-0 left-0 h-full bg-surface flex flex-col
          md:visible md:relative md:translate-x-0
          ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}
          w-56
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <img src={LogoEasypet} alt="Easypet" className="w-8 h-8 shrink-0" />
            <span className="sidebar-label text-(--color-text-heading) font-bold text-lg tracking-tight whitespace-nowrap">
              Easypet
            </span>
          </div>

          {/* Botão fechar — só mobile */}
          <button
            type="button"
            ref={closeButton}
            aria-label="Fechar menu"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-lg p-2 text-icon-default hover:text-icon-active
                       focus-visible:outline-2 focus-visible:outline-primary-400 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Navegação principal" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = pathname === path || pathname.startsWith(path + '/')
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                title={label}
                aria-current={isActive ? 'page' : undefined}
                className={`sidebar-item w-full flex min-h-11 items-center gap-3 py-3 text-sm font-medium transition-colors relative
                  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400
                  ${isActive
                    ? 'text-(--color-text-heading) bg-(--color-bg)'
                    : 'text-(--color-text-muted) hover:text-(--color-text-heading) hover:bg-(--color-bg)'
                  }`}
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={`shrink-0 ${isActive ? 'text-(--color-icon-active)' : 'text-(--color-icon-default)'}`}
                />
                <span className="sidebar-label whitespace-nowrap">{label}</span>
                {isActive && (
                  <span className="absolute right-0 top-0 bottom-0 w-1 bg-(--color-secondary-500) rounded-l" />
                )}
              </Link>
            )
          })}
          <Link to="/suporte" onClick={onClose} title="Suporte interno"
            aria-current={pathname === '/suporte' ? 'page' : undefined}
            className="sidebar-item flex min-h-11 items-center gap-3 py-3 text-sm font-medium text-text-body hover:bg-bg
                       focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400">
            <LifeBuoy size={18} aria-hidden="true" className="shrink-0" />
            <span className="sidebar-label whitespace-nowrap">Suporte interno</span>
          </Link>
        </nav>

        {/* Logout */}
        <div className="pb-2 shrink-0 overflow-hidden">
          <button onClick={handleLogout} title="Sair"
                  className="sidebar-item w-full flex min-h-11 items-center gap-3 py-3 text-sm font-medium
                             text-red-400 hover:bg-red-50 hover:text-red-500
                             transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400">
            <LogOut size={18} aria-hidden="true" className="shrink-0" />
            <span className="sidebar-label whitespace-nowrap">Sair</span>
          </button>
        </div>

        {/* Footer */}
        <div className="sidebar-footer text-xs text-(--color-text-muted) shrink-0">
          <a
            href="https://innker.com.br"
            target="_blank"
            rel="noopener noreferrer"
            title="Developed by Innker Tecnologia"
            className="flex min-h-11 items-center gap-3 text-red-500 font-semibold hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400"
          >
            <CodeXml size={18} aria-hidden="true" className="sidebar-credit-icon shrink-0" />
            <span className="sidebar-label whitespace-nowrap">
              <span className="block font-normal text-(--color-text-muted)">Developed by</span>
              Innker Tecnologia
            </span>
          </a>
        </div>
      </aside>
      </div>
    </>
  )
}
