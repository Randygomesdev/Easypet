// Papéis com navegação disponível no frontend.
export type UserRole = 'ADMIN' | 'PARTNER' | 'CUSTOMER' | 'TEAM_MEMBER'

export type User = {
  token:      string
  id:         string
  name:       string
  email:      string
  role:       UserRole
  pictureUrl?: string
}

export type LoginRequest = {
  email:    string
  password: string
}

export type RegisterRequest = {
  name:     string
  email:    string
  password: string
}

export type AuthenticationResult = Omit<User, 'role'> & {
  role: UserRole | 'USER'
}

export type ResetTokenErrorCode = 'RESET_TOKEN_INVALID' | 'RESET_TOKEN_EXPIRED' | 'RESET_TOKEN_USED'

export type AdminCustomer = {
  id: string
  name: string
  email: string
  active: boolean
}

export type AdminCustomerPage = {
  content: AdminCustomer[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type TeamAccessRole = 'MANAGER' | 'RECEPTION' | 'PROFESSIONAL'

export type AuthPermission =
  | 'BOOKINGS_READ'
  | 'BOOKINGS_WRITE'
  | 'BOOKINGS_ASSIGNED_READ'
  | 'BOOKINGS_ASSIGNED_ATTEND'
  | 'DESK_CUSTOMERS_MANAGE'
  | 'CASH_RECEIVE'
  | 'CASH_CLOSE'

export type AuthSession = {
  userId: string
  role: UserRole
  partnerId: string | null
  accessRole: TeamAccessRole | null
  permissions: AuthPermission[]
  teamAccessId: string | null
  name: string
}

export type SessionStatus = 'anonymous' | 'loading' | 'ready' | 'unavailable'

export type TeamAccess = {
  id: string
  partnerId: string
  email: string
  accessRole: TeamAccessRole
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  expiresAt: string
  userId: string | null
}
