import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// Debug environment variables
console.log('🔍 Environment variables check:', {
  REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT SET',
  REDIS_HOST: process.env.REDIS_HOST ? 'SET' : 'NOT SET', 
  REDIS_PORT: process.env.REDIS_PORT ? 'SET' : 'NOT SET',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET',
  REDIS_DB: process.env.REDIS_DB ? 'SET' : 'NOT SET'
});

// Redis configuration with the provided URL
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST ;
const redisPort = process.env.REDIS_PORT

let redisConfig;
let redis;

// Fallback mock data when Redis is unavailable
const mockCache = new Map();
let isRedisAvailable = false;

if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
  // Use URL format
  console.log('🔗 Using Redis URL format');
  redisConfig = redisUrl;
} else if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
  // Handle URL without protocol - assume redis:// and add password if provided
  const password = '7PBMVK2WaoWNN6cfVqlyJTb979Q4Cv5d';
  if (password) {
    redisConfig = `redis://:${password}@${redisUrl}`;
  } else {
    redisConfig = `redis://${redisUrl}`;
  }
  console.log('🔗 Constructed Redis URL from host:port format');
} else {
  // Use host/port configuration as fallback
  console.log('🔧 Using Redis host/port configuration');
  redisConfig = {
    host: redisHost,
    port: redisPort,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    family: 4, // 4 (IPv4) or 6 (IPv6)
    connectTimeout: 10000,
    lazyConnect: true,
  };
}

console.log('redisConfig', redisConfig);

try {
  redis = new Redis(redisConfig, {
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 2, // Reduced retries for faster fallback
    keepAlive: 30000,
    commandTimeout: 3000, // Shorter timeout
    connectTimeout: 5000,
    lazyConnect: true,
  });
} catch (error) {
  console.error('❌ Failed to create Redis instance:', error);
  redis = null;
}

if (redis) {
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully to:', redisHost);
    isRedisAvailable = true;
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    isRedisAvailable = false;
  });

  redis.on('ready', () => {
    console.log('🚀 Redis is ready to accept commands');
    isRedisAvailable = true;
  });

  redis.on('close', () => {
    console.log('⚠️ Redis connection closed');
    isRedisAvailable = false;
  });
}

// Cache key generators
export const cacheKeys = {
  userPermissions: (userId) => `permissions:user:${userId}`,
  tenantUsers: (tenantId) => `tenant:${tenantId}:users`,
  subscription: (tenantId) => `subscription:${tenantId}`,
  usageDaily: (tenantId, app, date) => `usage:${tenantId}:${app}:${date}`,
  apiCalls: (tenantId, app, date) => `usage:${tenantId}:${app}:api_calls:${date}`,
  activeUsers: (tenantId) => `active_users:${tenantId}`,
  rateLimit: (tenantId, endpoint, window) => `rate_limit:${tenantId}:${endpoint}:${window}`,
  session: (sessionToken) => `session:${sessionToken}`,
};

// Usage tracking helpers
export class UsageCache {
  // Increment API call counter
  static async incrementApiCalls(tenantId, app, date = null) {
    try {
      if (redis && isRedisAvailable) {
        const today = date || new Date().toISOString().split('T')[0];
        const key = cacheKeys.apiCalls(tenantId, app, today);
        return await redis.incr(key);
      } else {
        // Fallback to mock counter
        const today = date || new Date().toISOString().split('T')[0];
        const key = `usage:${tenantId}:${app}:api_calls:${today}`;
        const current = mockCache.get(key)?.value || 0;
        const newValue = current + 1;
        mockCache.set(key, { value: newValue, expires: Date.now() + (24 * 60 * 60 * 1000) });
        console.log(`📊 Mock API Counter: ${key} = ${newValue} (Redis unavailable)`);
        return newValue;
      }
    } catch (error) {
      console.error('❌ UsageCache incrementApiCalls error:', error.message);
      return 1; // Return 1 as fallback
    }
  }

  // Set expiry for daily counters (expire at end of day)
  static async setDailyExpiry(key) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const secondsUntilMidnight = Math.floor((tomorrow - new Date()) / 1000);
    await redis.expire(key, secondsUntilMidnight);
  }

  // Track active user (expires in 30 minutes)
  static async trackActiveUser(tenantId, userId) {
    const key = `active_user:${tenantId}:${userId}`;
    await redis.setex(key, 1800, '1'); // 30 minutes
  }

  // Get active user count
  static async getActiveUserCount(tenantId) {
    const pattern = `active_user:${tenantId}:*`;
    const keys = await redis.keys(pattern);
    return keys.length;
  }

  // Get active users (alias for compatibility)
  static async getActiveUsers(tenantId) {
    return await this.getActiveUserCount(tenantId);
  }

  // Get current API call count
  static async getApiCallCount(tenantId, app, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    const key = cacheKeys.apiCalls(tenantId, app, today);
    const count = await redis.get(key);
    return parseInt(count || '0');
  }

  // Get API calls (alias with period support)
  static async getApiCalls(tenantId, period = 'today') {
    if (period === 'today') {
      return await this.getTotalApiCalls(tenantId);
    }
    // For other periods, return total across apps
    return await this.getTotalApiCalls(tenantId);
  }

  // Get current usage summary
  static async getCurrentUsage(tenantId) {
    const apps = ['crm', 'hr', 'affiliate', 'accounting', 'inventory', 'wrapper'];
    const usage = {};
    
    for (const app of apps) {
      usage[app] = await this.getApiCallCount(tenantId, app);
    }
    
    return usage;
  }

  // Get total usage across all apps
  static async getTotalApiCalls(tenantId, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    const apps = ['crm', 'hr', 'affiliate', 'accounting', 'inventory', 'wrapper'];
    
    let total = 0;
    for (const app of apps) {
      const count = await this.getApiCallCount(tenantId, app, today);
      total += count;
    }
    return total;
  }

  // Get tenant-wise API calls summary
  static async getTenantApiCallsSummary(tenantId, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    const apps = ['crm', 'hr', 'affiliate', 'accounting', 'inventory', 'wrapper'];
    
    const summary = {
      tenantId,
      date: today,
      totalCalls: 0,
      appBreakdown: {},
      timestamp: new Date().toISOString()
    };

    for (const app of apps) {
      const count = await this.getApiCallCount(tenantId, app, today);
      summary.appBreakdown[app] = count;
      summary.totalCalls += count;
    }

    return summary;
  }

  // Get all tenants with their API usage
  static async getAllTenantsUsage(date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    // Get all tenant keys from Redis
    const pattern = `usage:*:*:api_calls:${today}`;
    const keys = await redis.keys(pattern);
    
    const tenantUsage = {};
    
    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 4) {
        const tenantId = parts[1];
        const app = parts[2];
        const count = parseInt(await redis.get(key) || '0');
        
        if (!tenantUsage[tenantId]) {
          tenantUsage[tenantId] = {
            tenantId,
            totalCalls: 0,
            appBreakdown: {},
            timestamp: new Date().toISOString()
          };
        }
        
        tenantUsage[tenantId].appBreakdown[app] = count;
        tenantUsage[tenantId].totalCalls += count;
      }
    }
    
    return Object.values(tenantUsage);
  }

  // Store performance metrics for intervals
  static async storeIntervalMetrics(tenantId, timestamp, metrics) {
    const key = `interval-metrics:${tenantId}:${timestamp}`;
    await CacheService.set(key, metrics, 3600); // 1 hour TTL
  }

  // Store app-specific metrics
  static async storeAppMetrics(tenantId, app, metrics) {
    const key = `app-metrics:${tenantId}:${app}`;
    await CacheService.set(key, metrics, 1800); // 30 minutes TTL
  }
}

// Rate limiting helpers
export class RateLimitCache {
  // Check rate limit
  static async checkRateLimit(tenantId, endpoint, limit, windowSeconds) {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = cacheKeys.rateLimit(tenantId, endpoint, window);
    
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetTime: (window + 1) * windowSeconds * 1000,
      blocked: current > limit
    };
  }

  // Reset rate limit
  static async resetRateLimit(tenantId, endpoint, windowSeconds) {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = cacheKeys.rateLimit(tenantId, endpoint, window);
    await redis.del(key);
  }
}

// Cache helpers
export class CacheService {
  // Set cache with TTL
  static async set(key, value, ttlSeconds = 3600) {
    try {
      if (redis && isRedisAvailable) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await redis.setex(key, ttlSeconds, serialized);
        console.log(`📝 Redis SET: ${key}`);
      } else {
        // Fallback to in-memory cache
        mockCache.set(key, { value, expires: Date.now() + (ttlSeconds * 1000) });
        console.log(`📝 Mock SET: ${key} (Redis unavailable)`);
      }
    } catch (error) {
      console.error('❌ Cache SET error:', error.message);
      // Fallback to in-memory cache
      mockCache.set(key, { value, expires: Date.now() + (ttlSeconds * 1000) });
    }
  }

  // Get from cache
  static async get(key) {
    try {
      if (redis && isRedisAvailable) {
        const value = await redis.get(key);
        if (!value) return null;
        
        try {
          console.log(`📖 Redis GET: ${key} - Found`);
          return JSON.parse(value);
        } catch {
          return value;
        }
      } else {
        // Fallback to in-memory cache
        const cached = mockCache.get(key);
        if (cached && cached.expires > Date.now()) {
          console.log(`📖 Mock GET: ${key} - Found (Redis unavailable)`);
          return cached.value;
        }
        console.log(`📖 Mock GET: ${key} - Not found or expired (Redis unavailable)`);
        return null;
      }
    } catch (error) {
      console.error('❌ Cache GET error:', error.message);
      // Fallback to in-memory cache
      const cached = mockCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
      return null;
    }
  }

  // Delete from cache
  static async del(key) {
    try {
      if (redis && isRedisAvailable) {
        await redis.del(key);
      } else {
        mockCache.delete(key);
      }
    } catch (error) {
      console.error('❌ Cache DEL error:', error.message);
      mockCache.delete(key);
    }
  }

  // Clear pattern
  static async clearPattern(pattern) {
    try {
      if (redis && isRedisAvailable) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        // For mock cache, clear all keys that match pattern (simple implementation)
        const keysToDelete = [];
        for (const key of mockCache.keys()) {
          if (key.includes(pattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => mockCache.delete(key));
      }
    } catch (error) {
      console.error('❌ Cache clearPattern error:', error.message);
    }
  }

  // Check if key exists
  static async exists(key) {
    try {
      if (redis && isRedisAvailable) {
        return await redis.exists(key) === 1;
      } else {
        const cached = mockCache.get(key);
        return cached && cached.expires > Date.now();
      }
    } catch (error) {
      console.error('❌ Cache exists error:', error.message);
      return false;
    }
  }
}

// Initialize some demo cache data for testing
export const initializeDemoCache = async () => {
  try {
    console.log('🚀 Initializing demo cache data...');
    
    if (redis && isRedisAvailable) {
      console.log('📡 Using Redis for demo cache');
    } else {
      console.log('💾 Using in-memory fallback for demo cache (Redis unavailable)');
    }
    
    // Set some sample usage data
    await UsageCache.incrementApiCalls('demo-tenant', 'crm');
    await UsageCache.incrementApiCalls('demo-tenant', 'hr');
    await UsageCache.incrementApiCalls('demo-tenant', 'affiliate');
    await UsageCache.trackActiveUser('demo-tenant', 'user-1');
    await UsageCache.trackActiveUser('demo-tenant', 'user-2');
    
    // Set some sample important feature metrics
    await CacheService.set('important-feature:user-permissions', {
      totalCalls: 1247,
      cacheHits: 1199,
      avgResponseTime: 38,
      lastUpdated: new Date().toISOString()
    }, 3600);
    
    await CacheService.set('important-feature:subscription-status', {
      totalCalls: 892,
      cacheHits: 845,
      avgResponseTime: 41,
      lastUpdated: new Date().toISOString()
    }, 3600);
    
    console.log('✅ Demo cache data initialized successfully');
    
    // Log current Redis status
    const info = await redis.info('memory');
    console.log('📊 Redis Memory Info:', info.split('\r\n').filter(line => 
      line.includes('used_memory_human') || line.includes('used_memory_peak_human')
    ));
    
  } catch (error) {
    console.error('❌ Failed to initialize demo cache data:', error);
  }
};

export default redis; 