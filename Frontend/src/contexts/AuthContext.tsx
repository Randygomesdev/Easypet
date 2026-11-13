import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authService, getAuthErrorStatus } from '../services/auth.service'
import type { AuthPermission, AuthSession, SessionStatus, User } from '../types/auth.types'

type AuthContextType = {
  user: User | null
  session: AuthSession | null
  sessionStatus: SessionStatus
  login: (data: User) => void
  logout: () => void
  refreshSession: () => void
  hasPermission: (permission: AuthPermission) => boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function storedUser(): User | null {
  const token = localStorage.getItem('token')
  const raw = localStorage.getItem('user')
  if (!raw || !token) return null
  try {
    const user: User = JSON.parse(raw)
    return user?.token === token && typeof user.id === 'string' ? user : null
  } catch {
    return null
  }
}

function isValidSession(session: AuthSession, userId: string) {
  if (session?.userId !== userId || !Array.isArray(session.permissions)
    || !session.permissions.every(permission => typeof permission === 'string')) return false
  if (session.role === 'TEAM_MEMBER') {
    return typeof session.partnerId === 'string' && session.partnerId.length > 0
      && typeof session.teamAccessId === 'string' && session.teamAccessId.length > 0
      && ['MANAGER', 'RECEPTION', 'PROFESSIONAL'].some(role => role === session.accessRole)
  }
  return ['ADMIN', 'PARTNER', 'CUSTOMER'].some(role => role === session.role)
    && session.partnerId === null && session.accessRole === null && session.permissions.length === 0
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState(storedUser)
  const [attempt, setAttempt] = useState(0)
  const [verification, setVerification] = useState<{
    account: User
    attempt: number
    session: AuthSession | null
  } | null>(null)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAccount(null)
    setVerification(null)
  }, [])

  const login = useCallback((data: User) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    setVerification(null)
    setAccount(data)
  }, [])

  const refreshSession = useCallback(() => setAttempt(current => current + 1), [])

  useEffect(() => {
    function updateFromStorage() {
      setAccount(storedUser())
      setVerification(null)
    }
    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key === 'token' || event.key === 'user') updateFromStorage()
    }
    window.addEventListener('easypet:auth-invalidated', updateFromStorage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('easypet:auth-invalidated', updateFromStorage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (!account) return
    const request = new AbortController()
    const isCurrent = () => !request.signal.aborted && localStorage.getItem('token') === account.token
    authService.session(account.token, request.signal)
      .then(result => {
        if (!isCurrent()) return
        setVerification({ account, attempt, session: isValidSession(result, account.id) ? result : null })
      })
      .catch(error => {
        if (!isCurrent()) return
        if (getAuthErrorStatus(error) === 401) {
          logout()
          return
        }
        setVerification({ account, attempt, session: null })
      })
    return () => request.abort()
  }, [account, attempt, logout])

  const current = verification?.account === account && verification.attempt === attempt ? verification : null
  const session = current?.session ?? null
  const sessionStatus: SessionStatus = !account ? 'anonymous'
    : session ? 'ready' : current ? 'unavailable' : 'loading'
  const user = account && session ? { ...account, role: session.role, name: session.name || account.name } : account

  return (
    <AuthContext.Provider value={{
      user, session, sessionStatus, login, logout, refreshSession,
      hasPermission: permission => session?.permissions.includes(permission) ?? false,
      isAuthenticated: sessionStatus === 'ready',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// This module owns both the provider and its public consumer hook.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
