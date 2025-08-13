# Cookie Persistence Fix for Silent Authentication

## Problem
Cookies were being deleted on page refresh, causing the silent authentication to fail and redirecting users back to the login page even when they were previously authenticated.

## Root Cause
The cookies were not configured with proper domain settings for cross-subdomain persistence. In development, cookies were being set without the correct domain configuration, and in production, they weren't configured for the `.zopkit.com` domain.

## Changes Made

### 1. Backend Cookie Configuration (`backend/src/app.js`)
- Updated Fastify cookie plugin configuration to use proper domain settings
- Added environment variables for cookie configuration
- Set `httpOnly: false` to allow JavaScript access for token management
- Configured proper `sameSite` and `secure` settings

### 2. Authentication Routes (`backend/src/routes/auth.js`)
- Updated all cookie setting operations to use consistent domain configuration
- Fixed cookie clearing operations to use the same domain settings
- Added proper maxAge conversion (seconds to milliseconds)

### 3. Frontend Kinde Provider (`frontend/src/components/auth/KindeProvider.tsx`)
- Added `isDangerouslyUseLocalStorage={false}` to force cookie usage
- Added redirect callback for better debugging

### 4. Environment Variables (`backend/.env`)
Added new cookie configuration variables:
```
COOKIE_DOMAIN=.zopkit.com
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

### 5. Debug Endpoints
Added two new endpoints for testing:
- `/debug-cookies` - Shows current cookie state and configuration
- `/test-cookie` - Sets a test cookie to verify configuration

## Testing the Fix

### 1. Test Cookie Configuration
```bash
# Test cookie setting
curl http://localhost:3000/test-cookie

# Check cookie debugging
curl http://localhost:3000/debug-cookies
```

### 2. Test Authentication Flow
1. Login through the normal flow
2. Check that cookies are set properly in browser dev tools
3. Refresh the page - cookies should persist
4. Silent authentication should work without redirecting to login

### 3. Check Browser Dev Tools
- Open Application/Storage tab
- Check Cookies section
- Verify that `kinde_token` and `kinde_refresh_token` cookies are present
- Verify they have the correct domain, secure, and sameSite settings

## Expected Behavior After Fix
1. User logs in successfully
2. Authentication cookies are set with proper domain configuration
3. On page refresh, cookies persist
4. Silent authentication detects existing cookies
5. User remains authenticated without redirect to login page

## Development vs Production
- **Development**: Cookies work on localhost without domain restrictions
- **Production**: Cookies are set for `.zopkit.com` domain for cross-subdomain access

## Key Configuration Points
- `httpOnly: false` - Allows JavaScript access for token management
- `domain: .zopkit.com` - Enables cross-subdomain cookie sharing
- `sameSite: lax` (dev) / `none` (prod) - Proper cross-site behavior
- `secure: false` (dev) / `true` (prod) - HTTPS requirement in production