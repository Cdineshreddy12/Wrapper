import { handleApiError } from "./errorHandler";
import { api } from "./index";

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  subdomain?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  tenant: Organization;
  permissions: Record<string, string[]>;
  restrictions: Record<string, any>;
  subscription?: {
    plan: string;
    status: string;
  };
}

export interface WrapperValidationResponse {
  isValid: boolean;
  user?: {
    kindeUserId: string;
    email: string;
    name: string;
    [key: string]: any;
  };
  organization?: {
    kindeOrgId: string;
    name: string;
    [key: string]: any;
  };
  permissions?: Record<string, string[]>;
  restrictions?: Record<string, any>;
  message?: string;
}

export const authService = {
  // Redirect to wrapper for authentication
  redirectToLogin: (redirectUrl?: string) => {
    const currentUrl = redirectUrl || window.location.href;
    // ✅ FIXED: Use correct backend URL (port 3000)
    const wrapperUrl = import.meta.env.VITE_WRAPPER_URL || 'http://localhost:3000';
    const loginUrl = `${wrapperUrl}/auth?app_code=crm&redirect_url=${encodeURIComponent(currentUrl)}`;
    
    console.log('🔄 Redirecting to wrapper auth:', loginUrl);
    window.location.href = loginUrl;
  },

  // ✅ FIXED: Validate token with wrapper
  validateToken: async (token: string): Promise<WrapperValidationResponse> => {
    try {
      const wrapperUrl = import.meta.env.VITE_WRAPPER_URL || 'http://localhost:3000';
      
      const response = await fetch(`${wrapperUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          app_code: 'crm'
        }),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Token validation error:', error);
      throw error;
    }
  },

  // ✅ FIXED: Handle authentication callback from wrapper
  handleCallback: async (): Promise<AuthResponse | null> => {
    try {
      const { token } = authService.getTokenFromUrl();
      
      if (!token) {
        console.log('No token in URL params');
        return null;
      }

      console.log('🔍 Validating token with wrapper...');
      
      // Validate token with wrapper
      const validation = await authService.validateToken(token);
      
      if (!validation.isValid) {
        throw new Error(validation.message || 'Token validation failed');
      }

      console.log('✅ Token validated successfully');

      // Store token
      localStorage.setItem("token", token);
      
      // Transform wrapper response to CRM format
      const authResponse: AuthResponse = {
        success: true,
        user: {
          id: validation.user?.kindeUserId || '',
          email: validation.user?.email || '',
          name: validation.user?.name || '',
          role: validation.user?.role,
          avatarUrl: validation.user?.avatarUrl
        },
        tenant: {
          id: validation.organization?.kindeOrgId || '',
          name: validation.organization?.name || '',
          subdomain: validation.organization?.subdomain
        },
        permissions: validation.permissions || {},
        restrictions: validation.restrictions || {},
        subscription: validation.user?.subscription
      };

      // Store user data
      localStorage.setItem("user", JSON.stringify(authResponse.user));
      localStorage.setItem("organization", JSON.stringify(authResponse.tenant));

      return authResponse;
    } catch (error) {
      console.error('Callback error:', error);
      throw error;
    }
  },

  // ✅ FIXED: Get token from URL params (wrapper only sends token)
  getTokenFromUrl: (): { token?: string } => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    return { token: token || undefined };
  },

  // Clear URL params after successful authentication
  clearUrlParams: () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('expires_at');
    url.searchParams.delete('app_code');
    window.history.replaceState({}, document.title, url.pathname + url.hash);
  },

  // ✅ FIXED: Logout through wrapper
  logout: async () => {
    try {
      // Clear local storage first
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("organization");
      
      // Redirect to wrapper logout
      const wrapperUrl = import.meta.env.VITE_WRAPPER_URL || 'http://localhost:3000';
      const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
      const logoutUrl = `${wrapperUrl}/logout?app_code=crm&redirect_url=${encodeURIComponent(clientUrl)}`;
      
      console.log('🚪 Redirecting to wrapper logout:', logoutUrl);
      window.location.href = logoutUrl;
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if logout fails, clear local storage and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("organization");
      
      const wrapperUrl = import.meta.env.VITE_WRAPPER_URL || 'http://localhost:3000';
      const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
      window.location.href = `${wrapperUrl}/logout?app_code=crm&redirect_url=${encodeURIComponent(clientUrl)}`;
    }
  },

  // ✅ FIXED: Get current user from stored data + validate token
  getCurrentUser: async (): Promise<AuthResponse | null> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return null;
      }
      
      // Check if we have cached user data
      const cachedUser = localStorage.getItem("user");
      const cachedOrg = localStorage.getItem("organization");
      
      if (cachedUser && cachedOrg) {
        // Validate token is still valid
        try {
          const validation = await authService.validateToken(token);
          if (validation.isValid) {
            return {
              success: true,
              user: JSON.parse(cachedUser),
              tenant: JSON.parse(cachedOrg),
              permissions: validation.permissions || {},
              restrictions: validation.restrictions || {}
            };
          }
        } catch (error) {
          console.log('Token validation failed, clearing cache');
        }
      }
      
      // If no cached data or validation failed, clear everything
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("organization");
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },
  
  // ✅ IMPROVED: Better token validation
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      return false;
    }
    
    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp && payload.exp < now) {
        console.log('Token expired, clearing storage');
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("organization");
        return false;
      }
      
      return true;
    } catch (error) {
      // If token parsing fails, consider it invalid
      console.log('Token parsing failed, clearing storage');
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("organization");
      return false;
    }
  },

  // ✅ FIXED: Initialize authentication on app load
  initializeAuth: async (): Promise<boolean> => {
    try {
      // Check for callback parameters
      const { token } = authService.getTokenFromUrl();
      
      if (token) {
        console.log('🔄 Processing auth callback...');
        try {
          // Handle wrapper callback
          const authResult = await authService.handleCallback();
          authService.clearUrlParams();
          
          if (authResult) {
            console.log('✅ Authentication successful');
            return true;
          } else {
            console.log('❌ Authentication failed');
            return false;
          }
        } catch (error) {
          console.error('Failed to handle auth callback:', error);
          authService.clearUrlParams();
          return false;
        }
      }
      
      // Check existing authentication
      const isAuth = authService.isAuthenticated();
      
      if (isAuth) {
        // Validate with current user call
        const user = await authService.getCurrentUser();
        return !!user;
      }
      
      return false;
    } catch (error) {
      console.error('Auth initialization error:', error);
      return false;
    }
  },

  // ✅ NEW: Force refresh user permissions
  refreshPermissions: async (): Promise<AuthResponse | null> => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const validation = await authService.validateToken(token);
      if (validation.isValid) {
        // Update cached data with fresh permissions
        const authResponse: AuthResponse = {
          success: true,
          user: {
            id: validation.user?.kindeUserId || '',
            email: validation.user?.email || '',
            name: validation.user?.name || '',
            role: validation.user?.role,
            avatarUrl: validation.user?.avatarUrl
          },
          tenant: {
            id: validation.organization?.kindeOrgId || '',
            name: validation.organization?.name || '',
            subdomain: validation.organization?.subdomain
          },
          permissions: validation.permissions || {},
          restrictions: validation.restrictions || {},
          subscription: validation.user?.subscription
        };

        localStorage.setItem("user", JSON.stringify(authResponse.user));
        localStorage.setItem("organization", JSON.stringify(authResponse.tenant));

        return authResponse;
      }
    } catch (error) {
      console.error('Permission refresh failed:', error);
    }

    return null;
  }
};