import { api } from './client'
import type { User } from './types'

export const userAPI = {
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) => api.put('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/users/password', data),
  getActivityLogs: () => api.get('/users/activity'),
  completeOnboarding: (data: Record<string, any>) => 
    api.post('/users/onboarding', data),
}
