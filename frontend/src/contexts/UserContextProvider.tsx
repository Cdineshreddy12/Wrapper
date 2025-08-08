import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import  api  from '../lib/api';
import toast from 'react-hot-toast';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  level: string;
}

export interface UserRole {
  roleId: string;
  roleName: string;
  description: string;
  isSystemRole: boolean;
}

export interface UserContextData {
  userId: string;
  kindeUserId: string;
  email: string;
  name: string;
  tenantId: string;
  isTenantAdmin: boolean;
  isActive: boolean;
  onboardingCompleted: boolean;
  needsOnboarding: boolean;
}

export interface TenantData {
  tenantId: string;
  companyName: string;
  subdomain: string;
  industry: string;
}

interface UserContextType {
  // State
  user: UserContextData | null;
  tenant: TenantData | null;
  permissions: UserPermission[];
  roles: UserRole[];
  loading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  refreshUserContext: () => Promise<void>;
  checkPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  logout: () => void;
  
  // Permission refresh settings
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  lastRefreshTime: Date | null;
}

const UserContext = createContext<UserContextType | null>(null);

interface UserContextProviderProps {
  children: ReactNode;
  refreshInterval?: number; // in milliseconds, default 30 seconds
}

export const UserContextProvider: React.FC<UserContextProviderProps> = ({ 
  children, 
  refreshInterval = 30000 
}) => {
  const [user, setUser] = useState<UserContextData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Fetch user context from API
  const fetchUserContext = useCallback(async (showToast = false) => {
    try {
      console.log('🔄 Refreshing user context...');
      
      const response = await api.get('/admin/auth-status');
      
      if (response.data.success && response.data.user) {
        const { user: userData, tenant: tenantData, permissions: userPermissions, roles: userRoles } = response.data;
        
        setUser(userData);
        setTenant(tenantData);
        setPermissions(userPermissions || []);
        setRoles(userRoles || []);
        setLastRefreshTime(new Date());
        
        console.log('✅ User context refreshed:', {
          userId: userData.userId,
          email: userData.email,
          permissions: userPermissions?.length || 0,
          roles: userRoles?.length || 0
        });
        
        if (showToast) {
          toast.success('Permissions refreshed successfully');
        }
      } else if (!response.data.authStatus?.isAuthenticated) {
        // User is not authenticated
        setUser(null);
        setTenant(null);
        setPermissions([]);
        setRoles([]);
        setLastRefreshTime(null);
        console.log('ℹ️ User not authenticated');
      }
    } catch (error) {
      console.error('❌ Failed to fetch user context:', error);
      
      if (error.response?.status === 401) {
        // Authentication failed - clear state
        setUser(null);
        setTenant(null);
        setPermissions([]);
        setRoles([]);
        setLastRefreshTime(null);
      } else if (showToast) {
        toast.error('Failed to refresh permissions');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual refresh function exposed to components
  const refreshUserContext = useCallback(async () => {
    setLoading(true);
    await fetchUserContext(true);
  }, [fetchUserContext]);

  // Check if user has a specific permission
  const checkPermission = useCallback((permissionName: string): boolean => {
    if (!user) return false;
    if (user.isTenantAdmin) return true;
    return permissions.some(p => p.name === permissionName);
  }, [user, permissions]);

  // Check if user has a specific role
  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    return roles.some(r => r.roleName === roleName);
  }, [user, roles]);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setTenant(null);
    setPermissions([]);
    setRoles([]);
    setLastRefreshTime(null);
    setAutoRefresh(false);
    
    // Clear any stored tokens or session data
    localStorage.removeItem('auth_token');
    
    // Redirect to login or home
    window.location.href = '/login';
  }, []);

  // Initial load
  useEffect(() => {
    fetchUserContext(false);
  }, [fetchUserContext]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing user context...');
      fetchUserContext(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, user, refreshInterval, fetchUserContext]);

  // Listen for storage events (for multi-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user_permissions_changed') {
        console.log('🔄 Permission change detected in another tab, refreshing...');
        fetchUserContext(false);
        // Remove the flag
        localStorage.removeItem('user_permissions_changed');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchUserContext]);

  const value: UserContextType = {
    user,
    tenant,
    permissions,
    roles,
    loading,
    isAuthenticated: !!user,
    refreshUserContext,
    checkPermission,
    hasRole,
    logout,
    autoRefresh,
    setAutoRefresh,
    lastRefreshTime
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserContextProvider');
  }
  return context;
};

// Hook for checking permissions with better TypeScript support
export const usePermissionCheck = () => {
  const { checkPermission, hasRole, user } = useUserContext();
  
  return {
    hasPermission: checkPermission,
    hasRole,
    isAdmin: user?.isTenantAdmin || false,
    isAuthenticated: !!user
  };
};

// Component for conditional rendering based on permissions
interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  role,
  requireAll = false,
  fallback = null,
  children
}) => {
  const { checkPermission, hasRole, user } = useUserContext();
  
  if (!user) return <>{fallback}</>;
  
  if (user.isTenantAdmin) return <>{children}</>;
  
  let hasAccess = false;
  
  if (role) {
    hasAccess = hasRole(role);
  } else if (permission) {
    hasAccess = checkPermission(permission);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every(p => checkPermission(p));
    } else {
      hasAccess = permissions.some(p => checkPermission(p));
    }
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}; 