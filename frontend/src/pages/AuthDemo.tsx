import React from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthButton from '@/components/auth/AuthButton';
import SocialLogin from '@/components/auth/SocialLogin';
import { User, Shield, Building, Globe } from 'lucide-react';

export function AuthDemo() {
  const { isAuthenticated, user, isLoading } = useKindeAuth();

  const handleAuthSuccess = (user: any) => {
    console.log('Authentication successful:', user);
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Kinde Authentication Demo
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Testing the integrated Kinde React SDK with multi-tenant support
          </p>
          
          {/* Auth Status */}
          <div className="flex justify-center mb-8">
            <Badge variant={isAuthenticated ? "default" : "secondary"} className="text-lg px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Authentication Status */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Authentication Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAuthenticated && user ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">User Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {user.given_name} {user.family_name}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>ID:</strong> {user.id}</p>
                      {user.picture && (
                        <div className="flex items-center space-x-2">
                          <strong>Avatar:</strong>
                          <img 
                            src={user.picture} 
                            alt="Profile" 
                            className="h-8 w-8 rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <AuthButton 
                      showDropdown={true}
                      size="lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Not authenticated</p>
                  <AuthButton 
                    provider="google"
                    showDropdown={false}
                    size="lg"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Login Component Demo */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Social Login Demo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SocialLogin
                title="Demo Authentication"
                subtitle="Test all social providers"
                providers={['google', 'github', 'microsoft', 'apple', 'linkedin']}
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
              />
            </CardContent>
          </Card>

          {/* Organization-Specific Login Demo */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Organization Login Demo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SocialLogin
                orgCode="demo-org"
                title="Organization Login"
                subtitle="Login to demo-org organization"
                providers={['google', 'github']}
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
              />
            </CardContent>
          </Card>

          {/* Component Variations */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Authentication Button Variations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Different Providers:</h4>
                <div className="space-y-2">
                  <AuthButton provider="google" showDropdown={false} />
                  <AuthButton provider="github" showDropdown={false} />
                  <AuthButton provider="microsoft" showDropdown={false} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Different Sizes:</h4>
                <div className="space-y-2">
                  <AuthButton provider="google" size="sm" showDropdown={false} />
                  <AuthButton provider="google" size="md" showDropdown={false} />
                  <AuthButton provider="google" size="lg" showDropdown={false} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Different Variants:</h4>
                <div className="space-y-2">
                  <AuthButton provider="google" variant="default" showDropdown={false} />
                  <AuthButton provider="google" variant="outline" showDropdown={false} />
                  <AuthButton provider="google" variant="ghost" showDropdown={false} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  isAuthenticated,
                  isLoading,
                  user: user ? {
                    id: user.id,
                    email: user.email,
                    given_name: user.given_name,
                    family_name: user.family_name,
                    picture: user.picture
                  } : null
                }, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AuthDemo; 