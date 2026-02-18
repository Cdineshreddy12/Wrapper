import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import useSilentAuth from '@/hooks/useSilentAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { logger } from '@/lib/logger';

interface SilentLoginButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  orgCode?: string;
  connectionId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

/**
 * Enhanced login button that uses silent authentication when possible
 * Falls back to regular login if silent auth fails
 */
export const SilentLoginButton: React.FC<SilentLoginButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'default',
  orgCode,
  connectionId,
  onSuccess,
  onError,
  disabled = false,
}) => {
  const { handleLogin, checkSilentAuth, isChecking } = useSilentAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoggingIn || isChecking) {
      return;
    }

    setIsLoggingIn(true);

    try {
      logger.debug('🔑 SilentLoginButton: Starting login process...', { orgCode, connectionId });

      // First try silent authentication
      const silentAuthResult = await checkSilentAuth();
      
      if (silentAuthResult) {
        logger.debug('✅ SilentLoginButton: Silent authentication successful');
        onSuccess?.();
        return;
      }

      // If silent auth fails, proceed with regular login
      logger.debug('ℹ️ SilentLoginButton: Silent auth failed, proceeding with regular login');
      
      const loginOptions: any = {};
      
      if (orgCode) {
        loginOptions.org_code = orgCode;
      }
      
      if (connectionId) {
        loginOptions.connection_id = connectionId;
      }

      await handleLogin(loginOptions);
      
      logger.debug('✅ SilentLoginButton: Regular login initiated');
      onSuccess?.();

    } catch (error) {
      logger.error('❌ SilentLoginButton: Login failed:', error);
      onError?.(error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isLoading = isLoggingIn || isChecking;

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>
            {isChecking ? 'Checking...' : 'Signing in...'}
          </span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};

export default SilentLoginButton;
