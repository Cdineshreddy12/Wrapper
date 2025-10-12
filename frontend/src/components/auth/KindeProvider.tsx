import React, { useEffect, useState } from 'react';
import { KindeProvider as OriginalKindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import useSilentAuth from '@/hooks/useSilentAuth';
import { setKindeTokenGetter } from '@/lib/api';

interface KindeProviderProps {
  children: React.ReactNode;
}

// Component to set up the token getter and silent auth after Kinde is initialized
function TokenSetupComponent() {
  const { getToken, isAuthenticated, user } = useKindeAuth();

  useEffect(() => {
    // Enhanced token getter with backup storage
    setKindeTokenGetter(async () => {
      try {
        console.log('🔑 TokenGetter: Called - isAuthenticated:', isAuthenticated, 'user:', !!user);
        
        const token = await getToken();
        
        if (token) {
          console.log('✅ TokenGetter: Successfully retrieved token from Kinde');
          // Always store as backup when we get a valid token
          localStorage.setItem('kinde_backup_token', token);
          return token;
        } else {
          console.log('❌ TokenGetter: No token from Kinde, trying backup...');
          const backupToken = localStorage.getItem('kinde_backup_token');
          if (backupToken) {
            console.log('🔄 TokenGetter: Using backup token');
            return backupToken;
          }
          return null;
        }
      } catch (error) {
        console.error('❌ TokenGetter: Error getting token, trying backup...', error);
        const backupToken = localStorage.getItem('kinde_backup_token');
        if (backupToken) {
          console.log('🔄 TokenGetter: Using backup token after error');
          return backupToken;
        }
        return null;
      }
    });
  }, [getToken, isAuthenticated, user]);

  // Store backup token when user becomes authenticated
  useEffect(() => {
    const storeBackupToken = async () => {
      if (isAuthenticated && user) {
        try {
          const token = await getToken();
          if (token) {
            localStorage.setItem('kinde_backup_token', token);
            console.log('💾 Stored backup token for user:', user.email);
          }
        } catch (error) {
          console.log('❌ Failed to store backup token:', error);
        }
      }
    };

    storeBackupToken();
  }, [isAuthenticated, user, getToken]);

  // Clear backup token when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      const hadBackupToken = localStorage.getItem('kinde_backup_token');
      if (hadBackupToken) {
        localStorage.removeItem('kinde_backup_token');
        console.log('🗑️ Cleared backup token on logout');
      }
    }
  }, [isAuthenticated]);

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
      console.log('🔄 SilentAuth: Initializing silent authentication...');
      setInitStarted(true);
      
      // Add a small delay to ensure everything is properly initialized
      const timer = setTimeout(() => {
        checkSilentAuth().then((result) => {
          console.log('✅ SilentAuth: Initial silent auth check completed:', result);
        }).catch((error) => {
          console.log('ℹ️ SilentAuth: Initial silent auth check failed (expected):', error);
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
  const domain = import.meta.env.VITE_KINDE_DOMAIN || 'https://auth.zopkit.com';
  const clientId = import.meta.env.VITE_KINDE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_KINDE_REDIRECT_URI || window.location.origin;
  const logoutUri = import.meta.env.VITE_KINDE_LOGOUT_URI || window.location.origin;

  if (!domain || !clientId) {
    console.error('Kinde configuration missing. Please check environment variables.');
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
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Let Kinde handle organization management automatically
  console.log('🔄 KindeProvider: Using Kinde built-in organization handling');



  return (
    <OriginalKindeProvider
      clientId={clientId}
      domain={domain}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
      scope="openid profile email offline"
      useInsecureForRefreshToken={process.env.NODE_ENV === 'development'}
    >
      <TokenSetupComponent />
      <SilentAuthInitializer />
      {children}
    </OriginalKindeProvider>
  );
};

export default KindeProvider; 