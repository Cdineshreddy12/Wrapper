import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import useSilentAuth from '@/hooks/useSilentAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/lib/api';
import { logger } from '@/lib/logger';

interface SilentAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Component that handles silent authentication on app initialization
 * This checks for domain cookies and attempts silent login before rendering the app
 */
export const SilentAuthGuard: React.FC<SilentAuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useKindeAuth();
  const { 
    checkSilentAuth, 
    isChecking, 
    hasChecked, 
    getAuthState 
  } = useSilentAuth();

  const [initializationComplete, setInitializationComplete] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  // Stable primitive for effect deps - avoid 'user' object to prevent re-render loop
  const userId = user?.id ?? user?.sub ?? null;
  const initStartedRef = useRef(false);

  // Paths that don't require authentication
  const publicPaths = [
    '/',
    '/landing',
    '/login',
    '/auth/callback',
    '/onboarding',
    '/organization-setup',
    '/simple-onboarding',
    '/invite-accept',
  ];

  const isPublicPath = publicPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path)
  );

  // Reset init guard when user logs out so next login runs again
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      initStartedRef.current = false;
    }
  }, [isAuthenticated, isLoading]);

  // Initialize silent authentication (run once when deps settle; avoid 'user' object in deps to prevent loop)
  useEffect(() => {
    if (isLoading) return;
    if (initStartedRef.current) return;

    const initializeSilentAuth = async () => {
      if (authCheckComplete) return;
      initStartedRef.current = true;

      logger.debug('🔄 SilentAuthGuard: Starting initialization...', {
        isLoading,
        isAuthenticated,
        hasChecked,
        isChecking,
        pathname: location.pathname,
        isPublicPath
      });

      try {
        // If user is already authenticated, no need for silent auth
        if (isAuthenticated && userId) {
          logger.debug('✅ SilentAuthGuard: User already authenticated');
          setAuthCheckComplete(true);
          setInitializationComplete(true);
          return;
        }

        // If on a public path and not authenticated, no need for silent auth
        if (isPublicPath && !isAuthenticated) {
          logger.debug('ℹ️ SilentAuthGuard: On public path, skipping silent auth');
          setAuthCheckComplete(true);
          setInitializationComplete(true);
          return;
        }

        // Attempt silent authentication
        logger.debug('🔍 SilentAuthGuard: Attempting silent authentication...');
        const silentAuthResult = await checkSilentAuth();

        logger.debug('✅ SilentAuthGuard: Silent auth completed:', silentAuthResult);

        // Get the final auth state
        const authState = await getAuthState();
        logger.debug('📊 SilentAuthGuard: Final auth state:', authState);

        setAuthCheckComplete(true);

        // Handle post-authentication routing
        if (authState.isAuthenticated && authState.user) {
          await handleAuthenticatedUser(authState);
        } else {
          await handleUnauthenticatedUser();
        }

      } catch (error) {
        logger.error('❌ SilentAuthGuard: Error during initialization:', error);
        setAuthCheckComplete(true);
        setInitializationComplete(true);
      }
    };

    initializeSilentAuth();
  }, [
    isLoading,
    isAuthenticated,
    userId,
    location.pathname,
    isPublicPath,
    authCheckComplete,
    hasChecked,
    isChecking,
    checkSilentAuth,
    getAuthState
  ]);

  // Handle authenticated user routing
  const handleAuthenticatedUser = async (authState: any) => {
    try {
      logger.debug('🔄 SilentAuthGuard: Handling authenticated user...');

      // If already on a protected route, stay there
      if (!isPublicPath) {
        logger.debug('ℹ️ SilentAuthGuard: Already on protected route, staying');
        setInitializationComplete(true);
        return;
      }

      // Check if user needs onboarding using enhanced api.ts
      const response = await api('/api/admin/auth-status', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const status = response.data;
        
        if (status.hasUser && status.hasTenant && status.isOnboarded) {
          // User is fully set up, redirect to dashboard
          logger.debug('✅ SilentAuthGuard: User fully onboarded, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else if (status.authStatus?.onboardingCompleted === true || 
                   status.authStatus?.userType === 'INVITED_USER' ||
                   status.authStatus?.isInvitedUser === true) {
          // INVITED USERS: Always go to dashboard (they skip onboarding)
          logger.debug('✅ SilentAuthGuard: Invited user detected, redirecting to dashboard (skipping onboarding)');
          navigate('/dashboard', { replace: true });
        } else {
          // User needs onboarding
          logger.debug('ℹ️ SilentAuthGuard: User needs onboarding');
          if (location.pathname === '/') {
            navigate('/landing', { replace: true });
          }
        }
      } else {
        logger.debug('ℹ️ SilentAuthGuard: Could not check auth status, staying on current page');
      }

    } catch (error) {
      logger.error('❌ SilentAuthGuard: Error handling authenticated user:', error);
    } finally {
      setInitializationComplete(true);
    }
  };

  // Handle unauthenticated user routing
  const handleUnauthenticatedUser = async () => {
    logger.debug('ℹ️ SilentAuthGuard: Handling unauthenticated user...');

    // If on a protected route, redirect to landing
    if (!isPublicPath) {
      logger.debug('🔄 SilentAuthGuard: On protected route, redirecting to landing');
      navigate('/landing', { replace: true });
    }

    setInitializationComplete(true);
  };

  // Show loading spinner while initializing
  if (isLoading || isChecking || !authCheckComplete || !initializationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            {isLoading ? 'Initializing authentication...' : 
             isChecking ? 'Checking for existing session...' : 
             'Loading application...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SilentAuthGuard;
