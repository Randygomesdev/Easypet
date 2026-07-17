import { api } from '../lib/api'
import type { LoginRequest, RegisterRequest, User } from '../types/auth.types'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<User>('/auth/login', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    api.post<User>('/auth/register', data).then(r => r.data),

  exchangeOAuthCode: (code: string) =>
    api.post<{ token: string }>(`/auth/oauth2/exchange?code=${code}`).then(r => r.data),
}
