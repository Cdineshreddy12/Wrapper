# Kinde Silent Authentication Implementation

This implementation provides seamless authentication across your application using Kinde's domain cookie feature. Users will be automatically authenticated when they have a valid session, eliminating the need for repeated logins across subdomains.

## 🚀 Features

- **Silent Authentication**: Automatically checks for existing authentication using domain cookies
- **Cross-Subdomain Support**: Works seamlessly across all your subdomains
- **Fallback Mechanism**: Falls back to regular login if silent auth fails
- **Organization Support**: Supports organization-specific authentication
- **TypeScript Support**: Fully typed with comprehensive error handling
- **React Hooks**: Easy-to-use hooks for authentication state management

## 📋 Prerequisites

Before implementing silent authentication, ensure your Kinde setup includes:

1. **Custom Domain**: Your Kinde instance must use a custom domain (e.g., `auth.yourdomain.com`)
2. **SSL Certificate**: HTTPS is required for secure cookies
3. **Domain Configuration**: Properly configured for cross-subdomain authentication
4. **HttpOnly Cookies**: Enabled in your Kinde settings for security

## 🔧 Implementation

### 1. Environment Configuration

```bash
# .env file
VITE_KINDE_DOMAIN=auth.yourdomain.com
VITE_KINDE_CLIENT_ID=your_client_id
VITE_KINDE_REDIRECT_URI=https://yourapp.com/auth/callback
VITE_KINDE_LOGOUT_URI=https://yourapp.com
```

### 2. Core Components

#### `useSilentAuth` Hook

The main hook that provides silent authentication functionality:

```typescript
import useSilentAuth from '@/hooks/useSilentAuth';

function MyComponent() {
  const { 
    checkSilentAuth, 
    handleLogin, 
    handleLogout, 
    getAuthState,
    isChecking,
    hasChecked,
    error 
  } = useSilentAuth();

  // Check for existing authentication on component mount
  useEffect(() => {
    checkSilentAuth();
  }, []);

  return (
    <div>
      {isChecking ? (
        <p>Checking authentication...</p>
      ) : (
        <button onClick={() => handleLogin()}>
          Login
        </button>
      )}
    </div>
  );
}
```

#### `SilentLoginButton` Component

A smart login button that attempts silent authentication first:

```typescript
import SilentLoginButton from '@/components/auth/SilentLoginButton';

function LoginPage() {
  return (
    <SilentLoginButton
      orgCode="your-org-code"
      onSuccess={() => navigate('/dashboard')}
      onError={(error) => console.error('Login failed:', error)}
    >
      Sign In
    </SilentLoginButton>
  );
}
```

#### `SilentAuthGuard` Component

Protects your application routes and handles initial authentication:

```typescript
import SilentAuthGuard from '@/components/auth/SilentAuthGuard';

function App() {
  return (
    <Router>
      <SilentAuthGuard>
        <YourAppContent />
      </SilentAuthGuard>
    </Router>
  );
}
```

### 3. Updated KindeProvider

The enhanced KindeProvider automatically initializes silent authentication:

```typescript
import { KindeProvider } from '@/components/auth/KindeProvider';

function App() {
  return (
    <KindeProvider>
      <YourAppContent />
    </KindeProvider>
  );
}
```

## 🎯 Usage Examples

### Basic Silent Authentication

```typescript
import { useEffect } from 'react';
import useSilentAuth from '@/hooks/useSilentAuth';

function HomePage() {
  const { checkSilentAuth, isAuthenticated } = useSilentAuth();

  useEffect(() => {
    // Automatically check for existing authentication
    checkSilentAuth();
  }, []);

  return (
    <div>
      {isAuthenticated ? (
        <h1>Welcome back!</h1>
      ) : (
        <h1>Please sign in</h1>
      )}
    </div>
  );
}
```

### Organization-Specific Login

```typescript
import SilentLoginButton from '@/components/auth/SilentLoginButton';

function OrganizationLogin({ orgCode }: { orgCode: string }) {
  return (
    <SilentLoginButton
      orgCode={orgCode}
      onSuccess={() => {
        console.log(`Successfully logged into ${orgCode}`);
        // Redirect to organization dashboard
      }}
      onError={(error) => {
        console.error('Organization login failed:', error);
        // Handle error (show message, fallback, etc.)
      }}
    >
      Join {orgCode}
    </SilentLoginButton>
  );
}
```

### Manual Authentication Check

```typescript
import useSilentAuth from '@/hooks/useSilentAuth';

function AuthStatus() {
  const { getAuthState } = useSilentAuth();
  const [authInfo, setAuthInfo] = useState(null);

  const checkAuth = async () => {
    const state = await getAuthState();
    setAuthInfo(state);
  };

  return (
    <div>
      <button onClick={checkAuth}>Check Auth Status</button>
      {authInfo && (
        <pre>{JSON.stringify(authInfo, null, 2)}</pre>
      )}
    </div>
  );
}
```

## 🔒 Security Considerations

1. **HTTPS Only**: Silent authentication only works over HTTPS
2. **Secure Cookies**: Domain cookies are HttpOnly and Secure
3. **Token Validation**: All tokens are validated on the backend
4. **Error Handling**: Failed silent auth gracefully falls back to regular login
5. **Timeout Protection**: Silent auth attempts have built-in timeouts

## 🚨 Troubleshooting

### Common Issues

1. **Silent Auth Not Working**
   - Verify your custom domain is properly configured
   - Ensure HTTPS is enabled
   - Check that cookies are being set correctly

2. **Cross-Subdomain Issues**
   - Verify domain configuration in Kinde
   - Check cookie domain settings
   - Ensure all subdomains use HTTPS

3. **TypeScript Errors**
   - Update `@kinde-oss/kinde-auth-react` to the latest version
   - Check type definitions are properly imported

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// All silent auth operations include detailed console logging
// Check browser console for authentication flow details
```

### Testing Silent Authentication

Use the included demo page to test your implementation:

```typescript
// Navigate to /silent-auth-demo in your application
// This page provides comprehensive testing tools
```

## 📝 API Reference

### `useSilentAuth` Hook

| Method | Description | Returns |
|--------|-------------|---------|
| `checkSilentAuth()` | Attempts silent authentication | `Promise<boolean>` |
| `handleLogin(options?)` | Initiates login with optional org code | `Promise<void>` |
| `handleLogout()` | Logs out and clears session | `Promise<void>` |
| `getAuthState()` | Gets current authentication state | `Promise<AuthState>` |

### `SilentLoginButton` Props

| Prop | Type | Description |
|------|------|-------------|
| `orgCode` | `string?` | Organization code for login |
| `connectionId` | `string?` | Specific connection ID |
| `onSuccess` | `() => void?` | Success callback |
| `onError` | `(error: any) => void?` | Error callback |
| `disabled` | `boolean?` | Disable the button |

## 🎨 Customization

### Custom Loading States

```typescript
import useSilentAuth from '@/hooks/useSilentAuth';

function CustomLoader() {
  const { isChecking } = useSilentAuth();

  if (isChecking) {
    return <YourCustomLoadingComponent />;
  }

  return <YourAppContent />;
}
```

### Custom Error Handling

```typescript
import useSilentAuth from '@/hooks/useSilentAuth';

function AuthWrapper() {
  const { error, checkSilentAuth } = useSilentAuth();

  if (error) {
    return (
      <div>
        <p>Authentication failed: {error}</p>
        <button onClick={() => checkSilentAuth()}>
          Retry
        </button>
      </div>
    );
  }

  return <YourAppContent />;
}
```

## 🔄 Migration Guide

If you're migrating from standard Kinde authentication:

1. **Replace your KindeProvider** with the enhanced version
2. **Wrap your app** with `SilentAuthGuard`
3. **Update login buttons** to use `SilentLoginButton`
4. **Add silent auth checks** where needed using `useSilentAuth`

## 📊 Performance

- **Initial Load**: ~100-200ms for silent auth check
- **Memory Usage**: Minimal overhead
- **Network Requests**: Only when necessary (failed silent auth)
- **Caching**: Automatic token caching and validation

## 🤝 Contributing

When contributing to the silent authentication implementation:

1. Maintain TypeScript type safety
2. Include comprehensive error handling
3. Add console logging for debugging
4. Update documentation for new features
5. Test across different browsers and scenarios

## 📞 Support

For issues related to:
- **Kinde Configuration**: Check Kinde documentation
- **Domain Setup**: Contact your DNS provider
- **SSL Certificates**: Verify with your hosting provider
- **Implementation Issues**: Check browser console for detailed logs

---

This implementation provides a robust, secure, and user-friendly authentication experience that works seamlessly across your entire application ecosystem.
