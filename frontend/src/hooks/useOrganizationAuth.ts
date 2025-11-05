import { useMemo } from 'react';
import { useUserContext } from '@/contexts/UserContextProvider';
import { useAuthStatus } from '@/hooks/useSharedQueries';
import axios from 'axios';

export function useOrganizationAuth() {
  const { user, tenant, isAuthenticated, loading: contextLoading } = useUserContext();
  const { data: authData, isLoading: authLoading } = useAuthStatus();

  // Create user context from shared auth data
  const userContext = useMemo(() => {
    if (!user || !authData?.authStatus) return null;

    return {
      userId: user.kindeUserId || user.userId,
      internalUserId: authData.authStatus.userId,
      tenantId: authData.authStatus.tenantId || user.tenantId || tenant?.tenantId || 'c27a0bd8-6f4f-48b1-9fc2-8bb58874c8ad',
      roles: authData.authStatus.userRoles || [],
      permissions: authData.authStatus.userPermissions || authData.authStatus.legacyPermissions || []
    };
  }, [user, authData, tenant]);

  // Get the current tenant ID - use the one from user context first
  const tenantId = userContext?.tenantId || user?.tenantId || tenant?.tenantId || 'c27a0bd8-6f4f-48b1-9fc2-8bb58874c8ad';

  console.log('🔑 useOrganizationAuth tenant ID sources:', {
    userContextTenantId: userContext?.tenantId,
    userTenantId: user?.tenantId,
    tenantTenantId: tenant?.tenantId,
    finalTenantId: tenantId
  });

  // Enhanced request function with proper headers using axios instead of fetch
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

    // Use axios for better CORS handling and consistency
    const response = await axios(fullURL, {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      withCredentials: true,
    });

    console.log('✅ Request successful:', {
      url: fullURL,
      result: response.data
    });

    return response.data;
  };

  // Permission checking function
  const hasPermission = (permission: string): boolean => {
    if (!userContext?.permissions) return false;
    if (user?.isTenantAdmin) return true; // Admin has all permissions
    return userContext.permissions.includes(permission);
  };

  return {
    userContext,
    tenantId,
    isAuthenticated,
    loading: contextLoading || authLoading,
    makeRequest,
    isAdmin: user?.isTenantAdmin || false,
    hasPermission
  };
}

export default useOrganizationAuth;