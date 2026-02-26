import React, { useEffect, useState, useRef } from 'react';
import { KindeProvider as OriginalKindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import useSilentAuth from '@/hooks/useSilentAuth';
import { setKindeTokenGetter } from '@/lib/api';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

interface KindeProviderProps {
  children: React.ReactNode;
}

// Component to set up the token getter and silent auth after Kinde is initialized
function TokenSetupComponent() {
  const { getToken, isAuthenticated, user } = useKindeAuth();
  const tokenGetterSetupRef = useRef(false);

  useEffect(() => {
    // Prevent React StrictMode from setting up token getter multiple times
    if (tokenGetterSetupRef.current) {
      return;
    }
    tokenGetterSetupRef.current = true;

    // Token getter strictly from Kinde SDK only
    setKindeTokenGetter(async () => {
      try {
        logger.debug('🔑 TokenGetter: Called - isAuthenticated:', isAuthenticated, 'user:', !!user);

        const token = await getToken();

        if (token) {
          logger.debug('✅ TokenGetter: Successfully retrieved token from Kinde');
          return token;
        } else {
          logger.debug('❌ TokenGetter: No token from Kinde');
          return null;
        }
      } catch (error: any) {
        // Handle invalid_grant errors gracefully
        const isInvalidGrant = error?.message?.includes('invalid_grant') || 
                              error?.message?.includes('refresh token') ||
                              error?.error === 'invalid_grant';
        
        if (isInvalidGrant) {
          logger.debug('⚠️ TokenGetter: invalid_grant error');
          // Clear potentially corrupted refresh tokens
          try {
            const storageKeys = Object.keys(localStorage);
            storageKeys.forEach(key => {
              if (key.includes('refresh') || key.includes('kinde_refresh')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {
            // Ignore errors when clearing
          }
        } else {
          logger.error('❌ TokenGetter: Error getting token', error);
        }
        return null;
      }
    });
  }, [getToken, isAuthenticated, user]);

  return null; // This component doesn't render anything
}

// Component to handle silent authentication initialization
function SilentAuthInitializer() {
  const { isLoading } = useKindeAuth();
  const { checkSilentAuth, isChecking, hasChecked } = useSilentAuth();
  const [initStarted, setInitStarted] = useState(false);

  useEffect(() => {
    // Only start silent auth check once Kinde is loaded and we haven't started yet
    if (!isLoading && !initStarted && !hasChecked && !isChecking) {
      logger.debug('🔄 SilentAuth: Initializing silent authentication...');
      setInitStarted(true);

      // Add a small delay to ensure everything is properly initialized
      const timer = setTimeout(() => {
        checkSilentAuth().then((result) => {
          logger.debug('✅ SilentAuth: Initial silent auth check completed:', result);
        }).catch((error) => {
          logger.debug('ℹ️ SilentAuth: Initial silent auth check failed (expected):', error);
        });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isLoading, checkSilentAuth, initStarted, hasChecked, isChecking]);

  return null; // This component doesn't render anything
}

export const KindeProvider: React.FC<KindeProviderProps> = ({
  children
}) => {
  // Keep the auth subdomain - Kinde handles domain-wide cookies automatically
  const domain = config.KINDE_DOMAIN;
  const clientId = import.meta.env.VITE_KINDE_CLIENT_ID;
  const isDevelopmentEnv =
    import.meta.env.MODE === 'development' ||
    import.meta.env.DEV ||
    import.meta.env.VITE_ENV === 'development';

  // CRITICAL: Set a consistent redirect URI to prevent OAuth 400 errors
  // The redirect URI must match between authorization and token requests
  // Default to the standard callback path if not explicitly configured
  // Normalize the redirect URI (remove trailing slashes, ensure exact match)
  const baseRedirectUri = isDevelopmentEnv
    ? `${window.location.origin}/auth/callback`
    : (import.meta.env.VITE_KINDE_REDIRECT_URI || `${window.location.origin}/auth/callback`);
  const redirectUri = baseRedirectUri.replace(/\/$/, ''); // Remove trailing slash
  const logoutUri = (
    isDevelopmentEnv
      ? window.location.origin
      : (import.meta.env.VITE_KINDE_LOGOUT_URI || window.location.origin)
  ).replace(/\/$/, '');

  if (!domain || !clientId) {
    logger.error('Kinde configuration missing. Please check environment variables.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 max-w-md">
          <div className="mb-4">
            <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-600 font-bold">🔧</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-red-700 mb-4">
            Authentication is not properly configured.
            Please check your environment variables.
          </p>
          <div className="text-sm text-red-600">
            <p>Required environment variables:</p>
            <ul className="list-disc list-inside mt-2">
              <li>VITE_KINDE_DOMAIN</li>
              <li>VITE_KINDE_CLIENT_ID</li>
              <li>VITE_KINDE_GOOGLE_CONNECTION_ID (for custom auth)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Let Kinde handle organization management automatically
  logger.debug('🔄 KindeProvider: Using Kinde built-in organization handling');

  // Validate configuration to prevent OAuth 400 errors
  useEffect(() => {
    const validateConfig = () => {
      logger.debug('🔍 KindeProvider: Validating OAuth configuration...');

      // Check domain format
      if (!domain.startsWith('https://')) {
        logger.error('❌ VITE_KINDE_DOMAIN must start with https://');
      }

      // Check client ID format
      if (!clientId || clientId.trim() === '') {
        logger.error('❌ VITE_KINDE_CLIENT_ID is empty or missing');
      }

      // Check redirect URI format
      if (!redirectUri || !redirectUri.startsWith('http')) {
        logger.error('❌ Redirect URI is invalid:', redirectUri);
      }

      // Log configuration (without sensitive data)
      logger.debug('✅ OAuth Configuration:', {
        domain,
        clientIdLength: clientId?.length,
        redirectUri, // Log full redirect URI for debugging
        logoutUri,
        environment: import.meta.env.MODE
      });
    };

    validateConfig();
  }, [domain, clientId, redirectUri, logoutUri]);


  return (
    <OriginalKindeProvider
      clientId={clientId}
      domain={domain}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
      scope="openid profile email offline"
      useInsecureForRefreshToken={import.meta.env.DEV || import.meta.env.MODE === 'development'}
    >
      <TokenSetupComponent />
      <SilentAuthInitializer />
      {children}
    </OriginalKindeProvider>
  );
};

export default KindeProvider; 