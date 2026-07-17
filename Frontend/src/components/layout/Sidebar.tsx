import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, Wrench, Package, CalendarDays, Stethoscope, X, LogOut } from 'lucide-react'
import LogoEasypet from '../../assets/LogoEasypet.svg'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/partner/dashboard' },
  { icon: ClipboardList,   label: 'Cadastro',      path: '/partner/cadastro' },
  { icon: Users,           label: 'Colaboradores', path: '/partner/colaboradores' },
  { icon: Wrench,          label: 'Serviços',      path: '/partner/servicos' },
  { icon: Package,         label: 'Pacotes',       path: '/partner/pacotes' },
  { icon: CalendarDays,    label: 'Agendamentos',  path: '/partner/agendamentos' },
  { icon: Stethoscope,     label: 'Atendimento',   path: '/partner/atendimento' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { pathname }   = useLocation()
  const { logout }     = useAuth()
  const navigate       = useNavigate()

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

      {/* Sidebar */}
      <aside
        className={`
          fixed z-30 top-0 left-0 h-full bg-(--color-surface) flex flex-col transition-all duration-300
          md:relative md:translate-x-0
          ${open ? 'translate-x-0 w-56' : '-translate-x-full w-56'}
          md:w-56
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src={LogoEasypet} alt="Easypet" className="w-8 h-8 shrink-0" />
            <span className="text-(--color-text-heading) font-bold text-lg tracking-tight whitespace-nowrap">
              Easypet
            </span>
          </div>

          {/* Botão fechar — só mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1 text-(--color-icon-default) hover:text-(--color-icon-active)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = pathname === path
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors relative
                  ${isActive
                    ? 'text-(--color-text-heading) bg-(--color-bg)'
                    : 'text-(--color-text-muted) hover:text-(--color-text-heading) hover:bg-(--color-bg)'
                  }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-(--color-icon-active)' : 'text-(--color-icon-default)'}
                />
                {label}
                {isActive && (
                  <span className="absolute right-0 top-0 bottom-0 w-1 bg-(--color-secondary-500) rounded-l" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 pb-2 shrink-0">
          <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg
                             text-red-400 hover:bg-red-50 hover:text-red-500
                             transition-colors cursor-pointer">
            <LogOut size={18} />
            Sair
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 text-xs text-(--color-text-muted) text-center shrink-0">
          Developed by{' '}
          <span className="text-red-500 font-semibold">Innker Code</span>
        </div>
      </aside>
    </>
  )
}
