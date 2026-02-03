// Redis disabled - caching will not be available
// To re-enable Redis, uncomment the code below and ensure Redis is running
let redis = null;

// Configure Redis for distributed cache (disabled by default)
// Redis is optional - app will work without it (caching disabled)
/*
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_SSO_DB || 1, // Separate DB for SSO cache
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  keyPrefix: 'sso:',
  lazyConnect: true,
  enableOfflineQueue: false, // Don't queue commands when offline
  enableReadyCheck: false, // Don't wait for ready state
  connectTimeout: 2000, // 2 second timeout
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('⚠️ Redis connection failed after 3 retries - caching disabled');
      return null; // Stop retrying
    }
    return Math.min(times * 200, 2000);
  }
});

// Handle Redis errors gracefully
redis.on('error', (error) => {
  // Only log once to avoid spam
  if (!redis._errorLogged) {
    console.warn('⚠️ Redis connection error - caching will be disabled:', error.message);
    redis._errorLogged = true;
  }
});

redis.on('connect', () => {
  console.log('✅ Redis SSO cache connected');
  redis._errorLogged = false;
});
*/

// Cache key generators for consistent naming across all applications
export const CacheKeys = {
  // User authentication cache
  userAuth: (kindeUserId, orgCode) => `auth:${kindeUserId}:${orgCode}`,
  
  // User permissions cache by application
  userPermissions: (userId, tenantId, appCode) => `perms:${userId}:${tenantId}:${appCode}`,
  
  // User roles cache
  userRoles: (userId, tenantId) => `roles:${userId}:${tenantId}`,
  
  // Tenant subscription cache
  tenantSubscription: (tenantId) => `subscription:${tenantId}`,
  
  // Feature flags cache
  tenantFeatures: (tenantId) => `features:${tenantId}`,
  
  // SSO tokens
  ssoToken: (tokenHash) => `token:${tokenHash}`,
  
  // Application access cache
  userAppAccess: (userId, tenantId) => `access:${userId}:${tenantId}`,
  
  // Session validation cache
  sessionValid: (kindeUserId, orgCode) => `session:${kindeUserId}:${orgCode}`,
  
  // Cache invalidation patterns
  userPattern: (userId) => `*:${userId}:*`,
  tenantPattern: (tenantId) => `*:${tenantId}:*`,
  appPattern: (appCode) => `*:${appCode}*`
};

// TTL (Time To Live) configurations
export const CacheTTL = {
  USER_AUTH: 900,        // 15 minutes
  USER_PERMISSIONS: 600, // 10 minutes
  USER_ROLES: 1800,      // 30 minutes
  SUBSCRIPTION: 3600,    // 1 hour
  FEATURES: 1800,        // 30 minutes
  SSO_TOKEN: 7200,       // 2 hours
  SESSION: 900,          // 15 minutes
  APP_ACCESS: 1800       // 30 minutes
};

/**
 * Distributed SSO Cache Service
 * Shared across all applications for consistent authentication and permissions
 */
export class DistributedSSOCache {
  
  /**
   * Cache user authentication data
   */
  static async cacheUserAuth(kindeUserId, orgCode, authData) {
    if (!redis) {
      // Redis disabled - silently skip caching
      return;
    }
    try {
      const key = CacheKeys.userAuth(kindeUserId, orgCode);
      const data = {
        ...authData,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CacheTTL.USER_AUTH * 1000).toISOString()
      };
      
      await redis.setex(key, CacheTTL.USER_AUTH, JSON.stringify(data));
      console.log(`✅ Cached user auth: ${kindeUserId} for org: ${orgCode}`);
    } catch (error) {
      // Redis unavailable - silently fail (caching is optional)
      console.debug('⚠️ Redis cache unavailable, skipping cache write');
    }
  }

  /**
   * Get cached user authentication data
   */
  static async getUserAuth(kindeUserId, orgCode) {
    if (!redis) {
      // Redis disabled - return null (cache miss)
      return null;
    }
    try {
      const key = CacheKeys.userAuth(kindeUserId, orgCode);
      const cached = await redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        console.log(`🎯 Cache HIT: User auth for ${kindeUserId}`);
        return data;
      }
      
      console.log(`❌ Cache MISS: User auth for ${kindeUserId}`);
      return null;
    } catch (error) {
      // Redis unavailable - return null (cache miss)
      console.debug('⚠️ Redis cache unavailable, treating as cache miss');
      return null;
    }
  }

  /**
   * Cache user permissions for a specific application
   */
  static async cacheUserPermissions(userId, tenantId, appCode, permissions) {
    if (!redis) return;
    const key = CacheKeys.userPermissions(userId, tenantId, appCode);
    const data = {
      permissions,
      appCode,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.USER_PERMISSIONS * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.USER_PERMISSIONS, JSON.stringify(data));
    console.log(`✅ Cached permissions: ${userId} for app: ${appCode}`);
  }

  /**
   * Get cached user permissions for a specific application
   */
  static async getUserPermissions(userId, tenantId, appCode) {
    if (!redis) return null;
    const key = CacheKeys.userPermissions(userId, tenantId, appCode);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: Permissions for ${userId}:${appCode}`);
      return data.permissions;
    }
    
    console.log(`❌ Cache MISS: Permissions for ${userId}:${appCode}`);
    return null;
  }

  /**
   * Cache user roles (shared across all applications)
   */
  static async cacheUserRoles(userId, tenantId, roles) {
    if (!redis) return;
    const key = CacheKeys.userRoles(userId, tenantId);
    const data = {
      roles,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.USER_ROLES * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.USER_ROLES, JSON.stringify(data));
    console.log(`✅ Cached roles: ${userId} - ${roles.map(r => r.name).join(', ')}`);
  }

  /**
   * Get cached user roles
   */
  static async getUserRoles(userId, tenantId) {
    if (!redis) return null;
    const key = CacheKeys.userRoles(userId, tenantId);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: Roles for ${userId}`);
      return data.roles;
    }
    
    console.log(`❌ Cache MISS: Roles for ${userId}`);
    return null;
  }

  /**
   * Cache tenant subscription data
   */
  static async cacheTenantSubscription(tenantId, subscription) {
    if (!redis) return;
    const key = CacheKeys.tenantSubscription(tenantId);
    const data = {
      ...subscription,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.SUBSCRIPTION * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.SUBSCRIPTION, JSON.stringify(data));
    console.log(`✅ Cached subscription: ${tenantId} - ${subscription.plan}`);
  }

  /**
   * Get cached tenant subscription
   */
  static async getTenantSubscription(tenantId) {
    if (!redis) return null;
    const key = CacheKeys.tenantSubscription(tenantId);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: Subscription for ${tenantId}`);
      return data;
    }
    
    console.log(`❌ Cache MISS: Subscription for ${tenantId}`);
    return null;
  }

  /**
   * Cache tenant feature flags
   */
  static async cacheTenantFeatures(tenantId, features) {
    if (!redis) return;
    const key = CacheKeys.tenantFeatures(tenantId);
    const data = {
      features,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.FEATURES * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.FEATURES, JSON.stringify(data));
    console.log(`✅ Cached features: ${tenantId}`);
  }

  /**
   * Get cached tenant feature flags
   */
  static async getTenantFeatures(tenantId) {
    if (!redis) return null;
    const key = CacheKeys.tenantFeatures(tenantId);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: Features for ${tenantId}`);
      return data.features;
    }
    
    console.log(`❌ Cache MISS: Features for ${tenantId}`);
    return null;
  }

  /**
   * Cache SSO token validation result
   */
  static async cacheSSOToken(tokenHash, validationResult) {
    if (!redis) return;
    const key = CacheKeys.ssoToken(tokenHash);
    const data = {
      ...validationResult,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.SSO_TOKEN * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.SSO_TOKEN, JSON.stringify(data));
    console.log(`✅ Cached SSO token: ${tokenHash.substring(0, 8)}...`);
  }

  /**
   * Get cached SSO token validation
   */
  static async getSSOToken(tokenHash) {
    if (!redis) return null;
    const key = CacheKeys.ssoToken(tokenHash);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: SSO token ${tokenHash.substring(0, 8)}...`);
      return data;
    }
    
    console.log(`❌ Cache MISS: SSO token ${tokenHash.substring(0, 8)}...`);
    return null;
  }

  /**
   * Cache user application access summary
   */
  static async cacheUserAppAccess(userId, tenantId, appAccess) {
    if (!redis) return;
    const key = CacheKeys.userAppAccess(userId, tenantId);
    const data = {
      applications: appAccess,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.APP_ACCESS * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.APP_ACCESS, JSON.stringify(data));
    console.log(`✅ Cached app access: ${userId} - ${Object.keys(appAccess).join(', ')}`);
  }

  /**
   * Get cached user application access
   */
  static async getUserAppAccess(userId, tenantId) {
    if (!redis) return null;
    const key = CacheKeys.userAppAccess(userId, tenantId);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: App access for ${userId}`);
      return data.applications;
    }
    
    console.log(`❌ Cache MISS: App access for ${userId}`);
    return null;
  }

  /**
   * Cache session validation result
   */
  static async cacheSessionValidation(kindeUserId, orgCode, isValid, userData = null) {
    if (!redis) return;
    const key = CacheKeys.sessionValid(kindeUserId, orgCode);
    const data = {
      isValid,
      userData,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CacheTTL.SESSION * 1000).toISOString()
    };
    
    await redis.setex(key, CacheTTL.SESSION, JSON.stringify(data));
    console.log(`✅ Cached session: ${kindeUserId} - ${isValid ? 'VALID' : 'INVALID'}`);
  }

  /**
   * Get cached session validation
   */
  static async getSessionValidation(kindeUserId, orgCode) {
    if (!redis) return null;
    const key = CacheKeys.sessionValid(kindeUserId, orgCode);
    const cached = await redis.get(key);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`🎯 Cache HIT: Session for ${kindeUserId}`);
      return data;
    }
    
    console.log(`❌ Cache MISS: Session for ${kindeUserId}`);
    return null;
  }

  /**
   * Invalidate user-related cache entries
   */
  static async invalidateUserCache(userId, tenantId = '*') {
    if (!redis) return;
    const patterns = [
      CacheKeys.userPattern(userId),
      tenantId !== '*' ? CacheKeys.tenantPattern(tenantId) : null
    ].filter(Boolean);

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️ Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
      }
    }
  }

  /**
   * Invalidate tenant-related cache entries
   */
  static async invalidateTenantCache(tenantId) {
    if (!redis) return;
    const pattern = CacheKeys.tenantPattern(tenantId);
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache entries for tenant: ${tenantId}`);
    }
  }

  /**
   * Invalidate application-specific cache entries
   */
  static async invalidateAppCache(appCode) {
    if (!redis) return;
    const pattern = CacheKeys.appPattern(appCode);
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache entries for app: ${appCode}`);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    if (!redis) {
      return {
        status: 'disabled',
        message: 'Redis cache is disabled',
        timestamp: new Date().toISOString()
      };
    }
    const info = await redis.info('memory');
    const keyspace = await redis.info('keyspace');
    
    return {
      memory: info,
      keyspace: keyspace,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Warm up cache for a user (preload commonly accessed data)
   */
  static async warmUpUserCache(kindeUserId, orgCode, tenantId, userId) {
    console.log(`🔥 Warming up cache for user: ${kindeUserId}`);
    
    // This would be called after successful authentication to preload cache
    try {
      // The actual data fetching would be done by the wrapper API
      // This is just the cache warming structure
      console.log(`✅ Cache warmed for user: ${kindeUserId}`);
    } catch (error) {
      console.error(`❌ Cache warm-up failed for user: ${kindeUserId}`, error);
    }
  }

  /**
   * Batch get multiple cache entries
   */
  static async batchGet(keys) {
    if (!redis) {
      // Return null for all keys when Redis is disabled
      const parsed = {};
      keys.forEach((key) => {
        parsed[key] = null;
      });
      return parsed;
    }
    const results = await redis.mget(...keys);
    const parsed = {};
    
    keys.forEach((key, index) => {
      parsed[key] = results[index] ? JSON.parse(results[index]) : null;
    });
    
    return parsed;
  }

  /**
   * Batch set multiple cache entries
   */
  static async batchSet(entries) {
    if (!redis) return;
    const pipeline = redis.pipeline();
    
    Object.entries(entries).forEach(([key, { value, ttl }]) => {
      pipeline.setex(key, ttl, JSON.stringify(value));
    });
    
    await pipeline.exec();
    console.log(`✅ Batch cached ${Object.keys(entries).length} entries`);
  }
}

// Export Redis instance for direct access if needed
export { redis };

export default DistributedSSOCache; 