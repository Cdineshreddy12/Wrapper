// Input sanitization utilities for security

export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

export const validateInputLength = (input: string, maxLength: number = 1000): boolean => {
  return typeof input === 'string' && input.length <= maxLength;
};

export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '') // Only allow valid email characters
    .slice(0, 254); // RFC 5321 limit
};

export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';
  
  return phone
    .replace(/[^\d+\-()\s]/g, '') // Only allow digits, +, -, (, ), and spaces
    .slice(0, 20); // Reasonable phone number length
};

export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';
  
  // Basic URL validation and sanitization
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return empty string
    return '';
  }
};

export const sanitizeTextArea = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 5000); // Limit length for text areas
};

export const sanitizeFormData = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Apply different sanitization based on field type
      if (key.includes('email') || key === 'adminEmail') {
        sanitized[key] = sanitizeEmail(value);
      } else if (key.includes('phone') || key.includes('mobile')) {
        sanitized[key] = sanitizePhone(value);
      } else if (key === 'website' || key.includes('url')) {
        sanitized[key] = sanitizeUrl(value);
      } else if (key.includes('description') || key === 'taxDetails' || key === 'billingAddress') {
        sanitized[key] = sanitizeTextArea(value);
      } else {
        sanitized[key] = sanitizeString(value);
      }
    } else if (Array.isArray(value)) {
      // Handle arrays (like team members)
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeFormData(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested objects
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};
