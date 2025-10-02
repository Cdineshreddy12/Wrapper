import { useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContextProvider';
import api from '@/lib/api';

interface UserContext {
  userId: string;
  internalUserId?: string;
  tenantId: string;
  roles?: string[];
  permissions?: string[];
}

export function useOrganizationAuth() {
  const { user, tenant, isAuthenticated, loading: contextLoading } = useUserContext();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the current tenant ID - use the one from user context first
  const tenantId = userContext?.tenantId || user?.tenantId || tenant?.tenantId || 'c27a0bd8-6f4f-48b1-9fc2-8bb58874c8ad';

  console.log('🔑 useOrganizationAuth tenant ID sources:', {
    userContextTenantId: userContext?.tenantId,
    userTenantId: user?.tenantId,
    tenantTenantId: tenant?.tenantId,
    finalTenantId: tenantId
  });

  // Enhanced request function with proper headers using the api object
  const makeRequest = async (endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) => {
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const defaultHeaders = {
      'X-Tenant-ID': tenantId,
      ...(userContext?.userId && { 'X-User-ID': userContext.userId }),
      ...(userContext?.internalUserId && { 'X-Internal-User-ID': userContext.internalUserId }),
    };

    // Combine default headers with any additional headers
    const allHeaders = { ...defaultHeaders, ...options.headers };

    console.log('🔍 Making request:', {
      endpoint: normalizedEndpoint,
      method: options.method || 'GET',
      headers: allHeaders,
      tenantId
    });

    try {
      const config = {
        method: options.method || 'GET',
        headers: allHeaders,
        ...(options.body && { data: options.body }),
      };

      const response = await api.request({
        url: normalizedEndpoint,
        ...config,
      });

      console.log('✅ Request successful:', {
        endpoint: normalizedEndpoint,
        result: response.data
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Request failed:', {
        endpoint: normalizedEndpoint,
        status: error.response?.status,
        error: error.response?.data || error.message
      });

      // Throw a more descriptive error
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed';
      throw new Error(errorMessage);
    }
  };

  // Load user context
  useEffect(() => {
    const loadUserContext = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Loading user context for:', user.kindeUserId || user.email);

        // Try to get user context from API using existing auth-status endpoint
        const contextResponse = await makeRequest('/admin/auth-status', {
          headers: { 'X-Application': 'crm' }
        });

        console.log('✅ User context loaded:', contextResponse);

        setUserContext({
          userId: user.kindeUserId || user.userId,
          internalUserId: contextResponse.authStatus?.userId,
          tenantId: contextResponse.authStatus?.tenantId || user.tenantId || tenant?.tenantId,
          roles: contextResponse.authStatus?.roles || [],
          permissions: contextResponse.authStatus?.permissions || []
        });
      } catch (error) {
        console.warn('Could not load user context from API, using fallback:', error);

        // Fallback to basic context with available tenant info
        const fallbackTenantId = user.tenantId || tenant?.tenantId || 'c27a0bd8-6f4f-48b1-9fc2-8bb58874c8ad';

        console.log('🔄 Using fallback tenant ID:', fallbackTenantId);

        setUserContext({
          userId: user.kindeUserId || user.userId,
          tenantId: fallbackTenantId,
          roles: [],
          permissions: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserContext();
  }, [isAuthenticated, user, tenant]);

  return {
    userContext,
    tenantId,
    isAuthenticated,
    loading: contextLoading || loading,
    makeRequest,
    isAdmin: user?.isTenantAdmin || false,
    hasPermission: (_permission: string) => false // TODO: implement permission checking
  };
}

export default useOrganizationAuth;