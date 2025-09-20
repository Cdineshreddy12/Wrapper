import { useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContextProvider';

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

  // Enhanced request function with proper headers
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const baseURL = import.meta.env.VITE_API_URL || '';

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
      ...(userContext?.userId && { 'X-User-ID': userContext.userId }),
      ...(userContext?.internalUserId && { 'X-Internal-User-ID': userContext.internalUserId }),
    };

    // If baseURL is empty (using Vite proxy), add /api prefix
    const fullURL = baseURL ? `${baseURL}${normalizedEndpoint}` : `/api${normalizedEndpoint}`;

    console.log('🔍 Making request:', {
      url: fullURL,
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...options.headers },
      tenantId
    });

    const response = await fetch(fullURL, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      console.error('❌ Request failed:', {
        url: fullURL,
        status: response.status,
        error: errorData
      });
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Request successful:', {
      url: fullURL,
      result
    });

    return result;
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
    hasPermission: (permission: string) => false // TODO: implement permission checking
  };
}

export default useOrganizationAuth;