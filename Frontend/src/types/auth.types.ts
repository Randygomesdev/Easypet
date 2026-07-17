// Valores exatos do enum UserRole.name() no backend
export type UserRole = 'ADMIN' | 'PARTNER' | 'CUSTOMER'

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
