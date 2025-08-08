/**
 * Simplified Authentication Hook 
 * Provides basic authentication without complex organization resolution
 */

import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export interface OrganizationAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  organization: any;
  isValidOrganization: boolean;
  needsRedirect: boolean;
  error: string | null;
}

export function useOrganizationAuth(): OrganizationAuthState {
  const kindeAuth = useKindeAuth();

  return {
    isAuthenticated: kindeAuth.isAuthenticated,
    isLoading: kindeAuth.isLoading,
    user: kindeAuth.user,
    organization: kindeAuth.user?.organization,
    isValidOrganization: true, // Simplified - always valid
    needsRedirect: false,     // Simplified - no redirect needed
    error: null
  };
} 