import { api } from './client'
import type { UsageMetrics } from './types'

export const usageAPI = {
  getCurrent: () => api.get<UsageMetrics>('/api/usage/current'),
  getMetrics: (period?: string) =>
    api.get('/api/usage/metrics', { params: { period } }),
  getBreakdown: () => api.get('/api/usage/breakdown'),
  getAlerts: () => api.get('/api/usage/alerts'),
  getLogs: (page = 1, limit = 50) =>
    api.get('/api/usage/logs', { params: { page, limit } }),
}
