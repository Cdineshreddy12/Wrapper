# Auth Refresh Redirect Fix

This note documents the issue where users were redirected to `/login` after refreshing protected routes such as `/dashboard`.

## Problem

- After a successful login, refreshing the page redirected users to `/login`.
- Console logs showed auth initialization followed by `ProtectedRoute` treating the user as unauthenticated.

## Root Cause

In `src/main.tsx`, startup logic was aggressively clearing and blocking token storage:

- Removed token-related keys from `localStorage` and `sessionStorage` on boot.
- Patched `Storage.setItem` to block future token writes.

This prevented Kinde session/token persistence, so auth state was lost on refresh.

## Fix Applied

The destructive startup behavior is no longer enabled by default.

- Token clearing is now behind an explicit opt-in flag:
  - `VITE_RESET_AUTH_STORAGE_ON_BOOT=true`
- In normal development/production runs, token storage remains intact.

## File Changed

- `src/main.tsx`

## How to Verify

1. Log in normally.
2. Navigate to a protected route (for example, `/dashboard/applications`).
3. Refresh the browser.
4. Confirm the app stays authenticated and does not redirect to `/login`.

## Important Note

Only enable `VITE_RESET_AUTH_STORAGE_ON_BOOT=true` for specific debugging scenarios where you intentionally want a clean auth state on every app boot.
