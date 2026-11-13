import axios from 'axios'
import { env } from '../config/env'

export const api = axios.create({
  baseURL: env.apiUrl,
})

// Injeta o token JWT em todas as requisições automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && !config.headers.has('Authorization')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Trata erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const token = localStorage.getItem('token')
    if (token && axios.isAxiosError(error) && error.response?.status === 401
      && error.config?.headers.get('Authorization') === `Bearer ${token}`) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('easypet:auth-invalidated'))
    }
    return Promise.reject(error)
  }
)
