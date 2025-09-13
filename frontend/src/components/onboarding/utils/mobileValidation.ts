// Mobile-specific validation utilities

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const validateMobileInput = (input: string, fieldType: string): { isValid: boolean; message?: string } => {
  if (!isMobileDevice()) {
    return { isValid: true };
  }

  switch (fieldType) {
    case 'email':
      // Mobile email validation - more lenient
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        return { isValid: false, message: 'Please enter a valid email address' };
      }
      break;
    
    case 'phone':
      // Mobile phone validation - allow various formats
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = input.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return { isValid: false, message: 'Please enter a valid phone number' };
      }
      break;
    
    case 'url':
      // Mobile URL validation - more lenient
      try {
        new URL(input);
        return { isValid: true };
      } catch {
        return { isValid: false, message: 'Please enter a valid URL' };
      }
    
    default:
      // General mobile validation - shorter max lengths
      if (input.length > 500) {
        return { isValid: false, message: 'Input is too long for mobile' };
      }
  }

  return { isValid: true };
};

export const getMobileInputProps = (fieldType: string) => {
  const baseProps = {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false
  };

  switch (fieldType) {
    case 'email':
      return {
        ...baseProps,
        inputMode: 'email' as const,
        autoComplete: 'email'
      };
    
    case 'phone':
      return {
        ...baseProps,
        inputMode: 'tel' as const,
        autoComplete: 'tel'
      };
    
    case 'url':
      return {
        ...baseProps,
        inputMode: 'url' as const,
        autoComplete: 'url'
      };
    
    case 'number':
      return {
        ...baseProps,
        inputMode: 'numeric' as const
      };
    
    default:
      return baseProps;
  }
};
