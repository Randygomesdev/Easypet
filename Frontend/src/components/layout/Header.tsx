import { useRef, useState, useEffect } from 'react'
import { Bell, BellOff, ChevronDown, LogOut, Menu, Moon, Sun, UserPen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import UserAvatar from '../ui/UserAvatar'

type Panel = 'notif' | 'user' | null

type Props = { onMenuClick: () => void }

// Placeholder — substituir por dados reais quando a feature existir
const NOTIFICATIONS: never[] = []
const UNREAD_COUNT = 0

export default function Header({ onMenuClick }: Props) {
  const { user, logout }       = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate               = useNavigate()
  const [panel, setPanel]      = useState<Panel>(null)
  const notifRef               = useRef<HTMLDivElement>(null)
  const userRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panel) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      if (panel === 'notif' && notifRef.current && !notifRef.current.contains(target)) setPanel(null)
      if (panel === 'user'  && userRef.current  && !userRef.current.contains(target))  setPanel(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [panel])

  function toggle(p: Panel) { setPanel(prev => prev === p ? null : p) }

  function handleLogout() {
    setPanel(null)
    logout()
    navigate('/login')
  }

  function handleEditProfile() {
    setPanel(null)
    navigate('/partner/cadastro')
  }

  return (
    <header className="h-16 bg-(--color-surface) flex items-center px-4 sm:px-8 gap-3 shrink-0 border-b border-(--color-border)">

      {/* Hamburguer — só mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 text-(--color-icon-default) hover:text-(--color-icon-active) transition-colors"
      >
        <Menu size={22} />
      </button>

      <div className="flex-1" />

      {/* ── Notificações ── */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => toggle('notif')}
          className="relative p-2 rounded-lg text-(--color-icon-default) hover:text-(--color-icon-active)
                     hover:bg-(--color-bg) transition-colors"
        >
          <Bell size={20} />
          {UNREAD_COUNT > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-(--color-secondary-500) rounded-full" />
          )}
        </button>

        {panel === 'notif' && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-(--color-surface) border border-(--color-border)
                          rounded-xl shadow-lg z-50 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
              <span className="text-sm font-semibold text-(--color-text-heading)">Notificações</span>
              {UNREAD_COUNT > 0 && (
                <button className="text-xs text-(--color-primary-500) hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista / Empty state */}
            {NOTIFICATIONS.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-(--color-bg) flex items-center justify-center">
                  <BellOff size={22} className="text-(--color-text-muted)" />
                </div>
                <div>
                  <p className="text-sm font-medium text-(--color-text-body)">Tudo em dia por aqui!</p>
                  <p className="text-xs text-(--color-text-muted) mt-0.5">
                    Suas notificações aparecerão aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-(--color-border)">
                {/* itens de notificação virão aqui */}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Avatar + Dropdown ── */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => toggle('user')}
          className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1
                     hover:bg-(--color-bg) transition-colors"
        >
          <UserAvatar name={user?.name ?? '?'} pictureUrl={user?.pictureUrl} size={32} />
          <span className="hidden md:block text-sm font-medium text-(--color-text-body)">
            {user?.name ?? ''}
          </span>
          <ChevronDown
            size={16}
            className={`text-(--color-icon-default) transition-transform duration-200
                        ${panel === 'user' ? 'rotate-180' : ''}`}
          />
        </button>

        {panel === 'user' && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-(--color-surface) border border-(--color-border)
                          rounded-xl shadow-lg z-50 overflow-hidden">

            {/* Identidade */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--color-border)">
              <UserAvatar name={user?.name ?? '?'} pictureUrl={user?.pictureUrl} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-(--color-text-heading) truncate">{user?.name}</p>
                <p className="text-xs text-(--color-text-muted) truncate">{user?.email}</p>
              </div>
            </div>

            {/* Ações */}
            <div className="py-1">
              <button
                onClick={handleEditProfile}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                           text-(--color-text-body) hover:bg-(--color-bg) transition-colors text-left"
              >
                <UserPen size={16} className="text-(--color-icon-default) shrink-0" />
                Editar Perfil
              </button>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                           text-(--color-text-body) hover:bg-(--color-bg) transition-colors"
              >
                {theme === 'dark'
                  ? <Sun  size={16} className="text-(--color-icon-default) shrink-0" />
                  : <Moon size={16} className="text-(--color-icon-default) shrink-0" />
                }
                <span className="flex-1 text-left">
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </span>
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5
                                 ${theme === 'dark' ? 'bg-(--color-primary-500)' : 'bg-(--color-border)'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                                   ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-(--color-border) py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                           text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <LogOut size={16} className="shrink-0" />
                Sair
              </button>
            </div>

          </div>
        )}
      </div>
    </header>
  )
}
