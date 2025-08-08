import React, { useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Shield, Loader2 } from 'lucide-react';


interface SocialLoginProps {
  orgCode?: string;
  redirectUri?: string;
  title?: string;
  subtitle?: string;
  providers?: string[];
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

const providerConfig = {
  google: {
    icon: '🔍',
    name: 'Google',
    className: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300',
    primary: true
  },
  github: {
    icon: '🐙',
    name: 'GitHub',
    className: 'bg-gray-900 hover:bg-gray-800 text-white'
  },
  microsoft: {
    icon: '🪟',
    name: 'Microsoft',
    className: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  apple: {
    icon: '🍎',
    name: 'Apple',
    className: 'bg-black hover:bg-gray-900 text-white'
  },
  linkedin: {
    icon: '💼',
    name: 'LinkedIn',
    className: 'bg-blue-700 hover:bg-blue-800 text-white'
  }
};

export const SocialLogin: React.FC<SocialLoginProps> = ({
  orgCode,
  redirectUri,
  title = "Sign In",
  subtitle = "Choose your preferred authentication method",
  providers = ['google', 'github', 'microsoft', 'apple', 'linkedin'],
  onSuccess,
  onError
}) => {
  const { login, isLoading, isAuthenticated, user } = useKindeAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Use provided organization code - no auto-detection
  const finalOrgCode = orgCode;

  // Handle successful authentication
  React.useEffect(() => {
    if (isAuthenticated && user && onSuccess) {
      onSuccess(user);
    }
  }, [isAuthenticated, user, onSuccess]);

  const handleLogin = async (provider: string) => {
    try {
      setLoadingProvider(provider);
      
      const loginOptions: any = {
        connection_id: provider
      };

      // Add organization context if available
      if (finalOrgCode) {
        loginOptions.org_code = finalOrgCode;
        console.log('🏢 SocialLogin: Using organization code for login:', finalOrgCode);
      }

      // Check for external redirect parameters
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect_to');
      const app = urlParams.get('app');
      
      if (redirectTo) {
        console.log('🔄 SocialLogin: External redirect detected:', redirectTo);
        loginOptions.app_state = {
          redirectTo,
          app: app || 'external'
        };
      } else if (redirectUri) {
        // Add custom redirect URI if provided
        loginOptions.app_state = {
          redirectTo: redirectUri
        };
      }

      console.log('🚀 SocialLogin: Login options:', loginOptions);
      await login(loginOptions);
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setLoadingProvider(null);
      if (onError) {
        onError(`Failed to authenticate with ${provider}`);
      }
    }
  };

  if (isAuthenticated) {
    return (
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-600">Authentication Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            Welcome, {user?.givenName || user?.email}!
          </p>
          {finalOrgCode && (
            <p className="text-sm text-gray-500">
              Accessing organization: <strong>{finalOrgCode}</strong>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full shadow-xl">
      <CardHeader className="text-center">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-gray-600">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map((providerId) => {
          const config = providerConfig[providerId as keyof typeof providerConfig];
          if (!config) return null;

          const isProviderLoading = loadingProvider === providerId || (isLoading && loadingProvider === providerId);

          return (
            <Button
              key={providerId}
              onClick={() => handleLogin(providerId)}
              disabled={isLoading || isProviderLoading}
              className={`w-full flex items-center justify-center space-x-3 py-3 ${config.className}`}
              variant="outline"
            >
              {isProviderLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-lg">{config.icon}</span>
              )}
              <span>
                {isProviderLoading 
                  ? 'Authenticating...' 
                  : `Continue with ${config.name}`
                }
              </span>
            </Button>
          );
        })}

        {finalOrgCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Signing in to organization: <strong>{finalOrgCode}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-500 mt-6">
          <p>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Your credentials are never stored on our servers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialLogin; 