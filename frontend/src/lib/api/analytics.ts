import { api } from './client'

export const analyticsAPI = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getMetrics: (period?: string) =>
    api.get('/api/analytics/metrics', { params: { period } }),
  getPerformance: () => api.get('/api/analytics/performance'),
  getReports: () => api.get('/api/analytics/reports'),
  exportData: (type: string) => api.get(`/api/analytics/export/${type}`),
}
