import React, { useEffect } from 'react';
import { KindeProvider as OriginalKindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { setKindeTokenGetter } from '@/lib/api';

interface KindeProviderProps {
  children: React.ReactNode;
}

// Component to set up the token getter after Kinde is initialized
function TokenSetupComponent() {
  const { getToken, isAuthenticated, user } = useKindeAuth();

  useEffect(() => {
    // Set the token getter function for API calls
    setKindeTokenGetter(async () => {
      try {
        if (!isAuthenticated) {
          console.log('🔑 TokenGetter: User not authenticated, returning null');
          return null;
        }
        
        console.log('🔑 TokenGetter: Getting token for user:', user?.email);
        const token = await getToken();
        
        if (token) {
          console.log('✅ TokenGetter: Successfully retrieved token');
          return token;
        } else {
          console.log('❌ TokenGetter: No token returned from getToken()');
          return null;
        }
      } catch (error) {
        console.error('❌ TokenGetter: Error getting token:', error);
        return null;
      }
    });
  }, [getToken, isAuthenticated, user]);

  return null; // This component doesn't render anything
}

export const KindeProvider: React.FC<KindeProviderProps> = ({ 
  children
}) => {
  const domain = import.meta.env.VITE_KINDE_DOMAIN;
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

  // Custom redirect callback to handle CRM authentication flow
  const handleRedirectCallback = async (user: any, appState: any) => {
    console.log('🔍 KindeProvider: onRedirectCallback triggered');
    console.log('🔍 KindeProvider: User:', user);
    console.log('🔍 KindeProvider: AppState:', appState);
    
    // Check URL for state parameter (CRM authentication)
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('state');
    
    console.log('🔍 KindeProvider: Current URL:', window.location.href);
    console.log('🔍 KindeProvider: State param:', stateParam);
    
    if (stateParam) {
      try {
        const stateData = JSON.parse(stateParam);
        console.log('🔍 KindeProvider: Parsed state data:', stateData);
        
        // Check if this is a CRM authentication flow
        if (stateData.app_code && stateData.redirect_url) {
          console.log('🔄 KindeProvider: Detected CRM authentication flow');
          
          // Redirect to our custom AuthCallback page with the state
          // The AuthCallback component will handle the token processing
          const callbackUrl = `/auth/callback${window.location.search}`;
          console.log('🚀 KindeProvider: Redirecting to custom callback:', callbackUrl);
          
          // Use window.location to ensure we get to our AuthCallback component
          window.location.href = callbackUrl;
          return;
        }
      } catch (parseError) {
        console.error('❌ KindeProvider: Failed to parse state:', parseError);
      }
    }
    
    // Default behavior for non-CRM flows
    console.log('🔄 KindeProvider: Default callback flow, redirecting to dashboard');
    window.location.href = '/dashboard';
  };

  return (
    <OriginalKindeProvider
      clientId={clientId}
      domain={domain}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
      onRedirectCallback={handleRedirectCallback}
    >
      <TokenSetupComponent />
      {children}
    </OriginalKindeProvider>
  );
};

export default KindeProvider; 