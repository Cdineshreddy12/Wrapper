import { api } from './client'

export const userSyncAPI = {
  getUserClassification: () => 
    api.get('/user-sync/classification'),

  getUsersForApplication: (appCode: string) => 
    api.get(`/user-sync/classification/${appCode}`),

  getUserApplicationAccess: (userId: string) => 
    api.get(`/user-sync/user/${userId}/access`),

  syncAllUsers: (options: { syncType?: 'full' | 'incremental', dryRun?: boolean } = {}) => 
    api.post('/user-sync/sync/all', options),

  syncUsersForApplication: (appCode: string, options: { syncType?: 'full' | 'incremental' } = {}) => 
    api.post(`/user-sync/sync/application/${appCode}`, options),

  syncUser: (userId: string, options: { syncType?: 'full' | 'update' } = {}) => 
    api.post(`/user-sync/sync/user/${userId}`, options),

  refreshUserClassification: (userId: string, options: { 
    autoSync?: boolean, 
    previousApps?: string[] 
  } = {}) => 
    api.post(`/user-sync/refresh/${userId}`, options),

  getSyncStatus: () => 
    api.get('/user-sync/status'),

  testConnectivity: (appCode?: string) => 
    api.post('/user-sync/test-connectivity', { appCode })
}

export const userApplicationAPI = {
  getUsersWithApplicationAccess: (params?: {
    includeInactive?: boolean;
    appCode?: string;
    includePermissionDetails?: boolean;
  }) => api.get('/user-sync/classification', { params }),

  getUserApplicationAccess: (userId: string, params?: {
    appCode?: string;
    includePermissionDetails?: boolean;
  }) => api.get(`/user-sync/user/${userId}/access`, { params }),

  getApplicationAccessSummary: () =>
    api.get('/user-sync/classification'),

  syncUsersToApplication: (appCode: string, options?: {
    dryRun?: boolean;
    userIds?: string[];
    forceSync?: boolean;
  }) => api.post(`/user-sync/sync/application/${appCode}`, options),

  bulkSyncAllUsers: (options?: {
    dryRun?: boolean;
  }) => api.post('/user-sync/sync/all', options),

  syncUserToApplications: (userId: string, options?: {
    dryRun?: boolean;
    appCodes?: string[];
  }) => api.post(`/user-sync/sync/user/${userId}`, options)
}
