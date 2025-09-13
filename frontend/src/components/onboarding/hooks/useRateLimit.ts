import { useRef, useCallback } from 'react';

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

export const useRateLimit = (options: RateLimitOptions = { maxAttempts: 5, windowMs: 60000 }) => {
  const attemptsRef = useRef<number[]>([]);
  const { maxAttempts, windowMs } = options;

  const isRateLimited = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove attempts outside the window
    attemptsRef.current = attemptsRef.current.filter(timestamp => timestamp > windowStart);
    
    // Check if we've exceeded the limit
    return attemptsRef.current.length >= maxAttempts;
  }, [maxAttempts, windowMs]);

  const recordAttempt = useCallback((): void => {
    attemptsRef.current.push(Date.now());
  }, []);

  const reset = useCallback((): void => {
    attemptsRef.current = [];
  }, []);

  const getRemainingAttempts = useCallback((): number => {
    const now = Date.now();
    const windowStart = now - windowMs;
    attemptsRef.current = attemptsRef.current.filter(timestamp => timestamp > windowStart);
    return Math.max(0, maxAttempts - attemptsRef.current.length);
  }, [maxAttempts, windowMs]);

  const getTimeUntilReset = useCallback((): number => {
    if (attemptsRef.current.length === 0) return 0;
    const oldestAttempt = Math.min(...attemptsRef.current);
    return Math.max(0, (oldestAttempt + windowMs) - Date.now());
  }, [windowMs]);

  return {
    isRateLimited,
    recordAttempt,
    reset,
    getRemainingAttempts,
    getTimeUntilReset
  };
};
