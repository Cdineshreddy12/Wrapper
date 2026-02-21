import { api } from './client'
import type { User } from './types'

export const authAPI = {
  getLoginUrl: (subdomain: string) => api.get(`/auth/login/${subdomain}`),
  handleCallback: (code: string, state?: string) =>
    api.get('/auth/callback', { params: { code, state } }),
  getUserInfo: () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProviders: () => api.get('/auth/providers'),
}
