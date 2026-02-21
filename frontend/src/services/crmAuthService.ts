import { jwtService } from './jwtService';
import { config, CRM_DOMAIN, CRM_CALLBACK_PATH } from '../lib/config';

// Define user interface for type safety - compatible with Kinde UserProfile
interface User {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  organization?: {
    code?: string;
  };
  tenantId?: string;
  permissions?: string[];
}

// Extended interface for Kinde UserProfile compatibility
interface KindeUserProfile {
  id: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  organization?: {
    code?: string;
  };
  [key: string]: any; // Allow additional properties
}

class CRMAuthService {
  private readonly CRM_DOMAIN: string;
  private readonly CRM_CALLBACK_PATH: string;

  constructor() {
    // Get environment variables from config or use defaults
    this.CRM_DOMAIN = CRM_DOMAIN;
    this.CRM_CALLBACK_PATH = CRM_CALLBACK_PATH || '/callback';
  }

  /**
   * Generate complete CRM callback URL with JWT authentication
   * This replaces the custom code generation that was causing infinite redirects
   */
  generateCRMCallback(user: User | KindeUserProfile, returnTo: string): string {
    try {
      // Generate JWT token for CRM authentication
      const token = jwtService.generateCRMToken(user);
      
      // Build the callback URL with proper parameters
      const callbackUrl = new URL(`${this.CRM_DOMAIN}${this.CRM_CALLBACK_PATH}`);
      
      // Add authentication parameters (NEVER send original returnTo to prevent loops)
      callbackUrl.searchParams.set('code', token);
      callbackUrl.searchParams.set('state', 'authenticated');
      callbackUrl.searchParams.set('user_id', user.id);
      callbackUrl.searchParams.set('timestamp', Date.now().toString());
      
      // ✅ CRITICAL: Send the intended path, not the original returnTo
      const intendedPath = this.extractIntendedPath(returnTo);
      callbackUrl.searchParams.set('returnTo', intendedPath);
      
      // Add source identification
      callbackUrl.searchParams.set('source', 'wrapper');
      callbackUrl.searchParams.set('app', 'crm');
      
      return callbackUrl.toString();
      
    } catch (error) {
      console.error('❌ Error generating CRM callback URL:', error);
      
      // Safe fallback: redirect to CRM root without callback
      return `${this.CRM_DOMAIN}/`;
    }
  }

  /**
   * Extract the intended destination path from returnTo URL
   * This prevents infinite redirects by never sending callback URLs back
   */
  private extractIntendedPath(returnTo: string): string {
    try {
      const returnUrl = new URL(returnTo);
      let intendedPath = returnUrl.pathname;
      
      // If path is empty or just '/', use root
      if (!intendedPath || intendedPath === '/') {
        intendedPath = '/';
      }
      
      // ✅ CRITICAL: Never allow callback paths
      if (intendedPath.includes('/callback')) {
        console.warn('⚠️ Blocked redirect to callback, using fallback');
        intendedPath = '/';
      }
      
      // ✅ CRITICAL: Never allow login paths
      if (intendedPath.includes('/login')) {
        console.warn('⚠️ Blocked redirect to login, using fallback');
        intendedPath = '/';
      }
      
      // ✅ CRITICAL: Never allow wrapper domain paths
      if (returnUrl.hostname.includes('wrapper.zopkit.com')) {
        console.warn('⚠️ Blocked wrapper domain, using fallback');
        intendedPath = '/';
      }
      
      return intendedPath;
      
    } catch (error) {
      console.error('❌ Error extracting intended path:', error);
      return '/'; // Safe fallback
    }
  }

  /**
   * Validate if a returnTo URL is safe for CRM authentication
   */
  validateReturnToUrl(returnTo: string): boolean {
    try {
      const returnUrl = new URL(returnTo);
      
      // Check if we're in development mode
      const isDevelopment = import.meta.env.MODE === 'development' || 
                           import.meta.env.DEV === true ||
                           window.location.hostname === 'localhost';
      
      // Allow localhost URLs in development mode
      if (isDevelopment && returnUrl.hostname === 'localhost') {
        return true;
      }
      
      // Only allow CRM domain in production
      const crmHostname = new URL(CRM_DOMAIN).hostname;
      if (!returnUrl.hostname.includes(crmHostname)) {
        console.warn('⚠️ Invalid CRM domain:', returnUrl.hostname);
        return false;
      }
      
      // Block dangerous paths
      const wrapperHostname = new URL(config.WRAPPER_DOMAIN).hostname;
      if (returnUrl.pathname.includes('/callback') || 
          returnUrl.pathname.includes('/login') ||
          returnUrl.hostname.includes(wrapperHostname)) {
        console.warn('⚠️ Dangerous returnTo URL blocked:', returnUrl.pathname);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Invalid returnTo URL format:', error);
      return false;
    }
  }

  /**
   * Generate a secure fallback URL if authentication fails
   */
  generateFallbackUrl(): string {
    return `${this.CRM_DOMAIN}/?error=auth_failed&source=wrapper`;
  }

  /**
   * Get the base CRM domain for redirects
   */
  getCRMDomain(): string {
    return this.CRM_DOMAIN;
  }
}

// Export singleton instance
export const crmAuthService = new CRMAuthService();

// Also export the class for testing purposes
export { CRMAuthService };
