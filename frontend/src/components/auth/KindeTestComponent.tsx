import React from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const KindeTestComponent: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    getToken,
    login,
    logout
  } = useKindeAuth();

  const testToken = async () => {
    try {
      const token = await getToken();
      console.log('🔑 Token:', token ? token.substring(0, 50) + '...' : 'No token');
    } catch (error) {
      console.error('❌ Token error:', error);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Kinde Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Is Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Is Loading:</strong> {isLoading ? '⏳ Yes' : '✅ No'}
          </div>
          <div>
            <strong>User Object:</strong> {user ? '✅ Exists' : '❌ Null'}
          </div>
          <div>
            <strong>User Email:</strong> {user?.email || '❌ Not found'}
          </div>
          <div>
            <strong>User ID:</strong> {user?.id || '❌ Not found'}
          </div>
          <div>
            <strong>User Keys:</strong> {user ? Object.keys(user).join(', ') : 'No user'}
          </div>
        </div>

        {user && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Full User Object:</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {!isAuthenticated ? (
            <button
              onClick={login}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Login
            </button>
          ) : (
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          )}

          <button
            onClick={testToken}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Token
          </button>

          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Refresh Page
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
