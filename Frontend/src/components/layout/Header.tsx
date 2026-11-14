import { env } from '../../config/env'
import { useRef, useState, useEffect, type Ref } from 'react'
import { ChevronDown, LogOut, Menu, Moon, ShoppingCart, Sun, UserPen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useCart } from '../../contexts/CartContext'
import AdminInboxBell from '../../features/support/AdminInboxBell'
import UserAvatar from '../ui/UserAvatar'

type Props = { onMenuClick: () => void; menuOpen: boolean; menuButtonRef: Ref<HTMLButtonElement> }

export default function Header({ onMenuClick, menuOpen, menuButtonRef }: Props) {
  const { user, session, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { itemCount }          = useCart()
  const navigate               = useNavigate()
  const [userOpen, setUserOpen] = useState(false)
  const userRef                = useRef<HTMLDivElement>(null)
  const userTrigger            = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!userOpen) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      if (!userRef.current?.contains(target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [userOpen])

  function handleLogout() {
    setUserOpen(false)
    logout()
    navigate('/login')
  }

  function handleEditProfile() {
    setUserOpen(false)
    navigate('/partner/cadastro')
  }

  return (
    <header className="h-16 bg-(--color-surface) flex items-center px-4 sm:px-8 gap-3 shrink-0 border-b border-(--color-border)">

      {/* Hamburguer — só mobile */}
      <button
        type="button"
        ref={menuButtonRef}
        aria-label="Abrir menu"
        aria-expanded={menuOpen}
        aria-controls="painel-navegacao"
        onClick={onMenuClick}
        className="min-h-11 min-w-11 rounded-lg p-2 text-icon-default transition-colors hover:text-icon-active
                   focus-visible:outline-2 focus-visible:outline-primary-400 md:hidden"
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      <div className="flex-1" />

      {/* ── Carrinho (só CUSTOMER) ── */}
      {!env.internalPilot && session?.role === 'CUSTOMER' && (
        <button
          onClick={() => navigate('/app/carrinho')}
          className="relative p-2 rounded-lg text-(--color-icon-default) hover:text-(--color-icon-active)
                     hover:bg-(--color-bg) transition-colors"
          title="Meu carrinho"
        >
          <ShoppingCart size={20} />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center
                             justify-center text-[10px] font-bold bg-(--color-secondary-500) text-white
                             rounded-full px-1 leading-none">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </button>
      )}

      {session?.role === 'ADMIN' && <AdminInboxBell key={session.userId} />}

      {/* ── Avatar + Dropdown ── */}
      <div className="relative" ref={userRef} onKeyDown={event => {
        if (event.key === 'Escape' && userOpen) {
          event.preventDefault()
          setUserOpen(false)
          userTrigger.current?.focus()
        }
      }}>
        <button
          ref={userTrigger}
          type="button"
          aria-label="Opções da conta"
          aria-expanded={userOpen}
          aria-controls={userOpen ? 'opcoes-da-conta' : undefined}
          onClick={() => setUserOpen(open => !open)}
          className="flex min-h-11 items-center gap-2 cursor-pointer rounded-lg px-2 py-1
                     hover:bg-bg transition-colors focus-visible:outline-2 focus-visible:outline-primary-400"
        >
          <UserAvatar name={user?.name ?? '?'} pictureUrl={user?.pictureUrl} size={32} />
          <span className="hidden md:block text-sm font-medium text-(--color-text-body)">
            {user?.name ?? ''}
          </span>
          <ChevronDown
            size={16}
            className={`text-(--color-icon-default) transition-transform duration-200
                        ${userOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {userOpen && (
          <div id="opcoes-da-conta" className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-(--color-surface) border border-(--color-border)
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
              {session?.role === 'PARTNER' && (
                <button
                  onClick={handleEditProfile}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                             text-(--color-text-body) hover:bg-(--color-bg) transition-colors text-left"
                >
                  <UserPen size={16} className="text-(--color-icon-default) shrink-0" />
                  Editar Perfil
                </button>
              )}

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
