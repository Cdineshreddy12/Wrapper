/**
 * Notification Rate Limiter Middleware
 * Implements sliding window rate limiting using in-memory storage
 * Redis removed - using in-memory Map for rate limiting
 */
class NotificationRateLimiter {
  constructor() {
    // In-memory rate limit storage (replaces Redis)
    this.rateLimits = new Map();
    this.defaultLimits = {
      single: 100,      // 100 notifications per minute per app
      bulk: 10,         // 10 bulk sends per minute per app
      tenant: 20        // 20 notifications per minute per tenant
    };
  }

  /**
   * Create rate limiter middleware
   */
  createLimiter(options = {}) {
    const {
      limit = this.defaultLimits.single,
      window = 60, // 1 minute in seconds
      keyGenerator = null,
      skipOnError = true
    } = options;

    return async (request, reply) => {
      try {
        // Generate rate limit key
        const key = keyGenerator 
          ? keyGenerator(request)
          : this._defaultKeyGenerator(request, limit, window);

        // Check current count (in-memory)
        const current = this._getCurrentCount(key);
        
        if (current >= limit) {
          const ttl = this._getTTL(key);
          return reply.code(429).send({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${limit} per ${window} seconds`,
            retryAfter: ttl
          });
        }

        // Increment counter (in-memory)
        this._increment(key, window);

        // Add rate limit headers
        reply.header('X-RateLimit-Limit', limit);
        reply.header('X-RateLimit-Remaining', Math.max(0, limit - current - 1));
        reply.header('X-RateLimit-Reset', Date.now() + (window * 1000));

      } catch (error) {
        console.error('Rate limiter error:', error);
        if (!skipOnError) {
          return reply.code(500).send({
            error: 'Rate limiter error',
            message: error.message
          });
        }
      }
    };
  }

  /**
   * Default key generator
   */
  _defaultKeyGenerator(request, limit, window) {
    const appId = request.headers['x-api-key'] || request.userContext?.userId || 'anonymous';
    const endpoint = request.url.split('?')[0];
    const windowKey = Math.floor(Date.now() / (window * 1000));
    
    return `rate_limit:notifications:${appId}:${endpoint}:${windowKey}`;
  }

  /**
   * Get current count for key (in-memory)
   */
  _getCurrentCount(key) {
    const entry = this.rateLimits.get(key);
    if (!entry) return 0;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.rateLimits.delete(key);
      return 0;
    }
    
    return entry.count || 0;
  }

  /**
   * Increment counter (in-memory)
   */
  _increment(key, window) {
    const entry = this.rateLimits.get(key);
    const expiresAt = Date.now() + (window * 1000);
    
    if (entry) {
      entry.count = (entry.count || 0) + 1;
      entry.expiresAt = expiresAt;
    } else {
      this.rateLimits.set(key, { count: 1, expiresAt });
    }
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      this._cleanupExpired();
    }
    
    return this.rateLimits.get(key).count;
  }

  /**
   * Get TTL for key (in-memory)
   */
  _getTTL(key) {
    const entry = this.rateLimits.get(key);
    if (!entry) return 60;
    
    const remaining = Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
    return remaining || 60;
  }

  /**
   * Clean up expired entries
   */
  _cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.expiresAt) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Per-application rate limiter
   */
  perApplication(limit = this.defaultLimits.single) {
    return this.createLimiter({
      limit,
      keyGenerator: (request) => {
        const appId = request.headers['x-api-key'] || 'anonymous';
        const windowKey = Math.floor(Date.now() / 60000); // 1 minute windows
        return `rate_limit:app:${appId}:${windowKey}`;
      }
    });
  }

  /**
   * Per-tenant rate limiter
   */
  perTenant(limit = this.defaultLimits.tenant) {
    return this.createLimiter({
      limit,
      keyGenerator: (request) => {
        const tenantId = request.body?.tenantId || request.params?.tenantId || 'unknown';
        const windowKey = Math.floor(Date.now() / 60000);
        return `rate_limit:tenant:${tenantId}:${windowKey}`;
      }
    });
  }

  /**
   * Bulk send rate limiter
   */
  bulkSend(limit = this.defaultLimits.bulk) {
    return this.createLimiter({
      limit,
      window: 60,
      keyGenerator: (request) => {
        const appId = request.headers['x-api-key'] || request.userContext?.userId || 'anonymous';
        const windowKey = Math.floor(Date.now() / 60000);
        return `rate_limit:bulk:${appId}:${windowKey}`;
      }
    });
  }

  /**
   * Check rate limit (for programmatic use)
   */
  checkLimit(key, limit, window) {
    try {
      const fullKey = `rate_limit:${key}`;
      const current = this._getCurrentCount(fullKey);
      
      if (current >= limit) {
        const ttl = this._getTTL(fullKey);
        return {
          allowed: false,
          remaining: 0,
          retryAfter: ttl
        };
      }

      this._increment(fullKey, window);
      
      return {
        allowed: true,
        remaining: limit - current - 1
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true, remaining: limit }; // Fail open
    }
  }
}

export const notificationRateLimiter = new NotificationRateLimiter();
export default notificationRateLimiter;

