import Redis from 'redis';

class RedisManager {
  constructor() {
    this.client = null;
    this.subscribers = new Map();
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      console.log('redis url',process.env.REDIS_URL);
      this.client = Redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('Redis max retry attempts exceeded');
            return undefined;
          }
          // Exponential backoff
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (error) => {
        console.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('❌ Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      console.log('🚀 Redis manager initialized');

    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.client = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('🛑 Redis manager disconnected');
    }
  }

  /**
   * Publish message to channel
   */
  async publish(channel, message) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.publish(channel, message);
      console.log(`📡 Published to ${channel}: ${message.length} characters`);
    } catch (error) {
      console.error(`❌ Failed to publish to ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.subscribe(channel);
      console.log(`📡 Subscribed to ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple channels
   */
  async subscribeMultiple(channels) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.subscribe(channels);
      console.log(`📡 Subscribed to ${channels.length} channels: ${channels.join(', ')}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to channels:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel) {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Redis client not connected, skipping unsubscribe');
      return;
    }

    try {
      await this.client.unsubscribe(channel);
      console.log(`📡 Unsubscribed from ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${channel}:`, error);
    }
  }

  /**
   * Set key-value pair
   */
  async set(key, value, ttl = null) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      console.log(`💾 Redis SET: ${key} (${serializedValue.length} bytes)`);
    } catch (error) {
      console.error(`❌ Failed to set Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get(key) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const value = await this.client.get(key);

      if (value) {
        const parsedValue = JSON.parse(value);
        console.log(`💾 Redis GET: ${key} (${value.length} bytes)`);
        return parsedValue;
      }

      console.log(`💾 Redis GET: ${key} (not found)`);
      return null;

    } catch (error) {
      console.error(`❌ Failed to get Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key
   */
  async delete(key) {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Redis client not connected, skipping delete');
      return;
    }

    try {
      const result = await this.client.del(key);
      console.log(`💾 Redis DEL: ${key} (deleted: ${result})`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to delete Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Failed to check Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern = '*') {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const keys = await this.client.keys(pattern);
      console.log(`💾 Redis KEYS: ${pattern} (found: ${keys.length})`);
      return keys;
    } catch (error) {
      console.error(`❌ Failed to get Redis keys ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Set up message handler
   */
  onMessage(callback) {
    if (!this.client) {
      console.warn('⚠️ Redis client not initialized');
      return;
    }

    this.client.on('message', callback);
    console.log('📡 Message handler registered');
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.client) {
      return {
        status: 'disconnected',
        message: 'Redis client not initialized'
      };
    }

    try {
      const ping = await this.client.ping();
      const isConnected = ping === 'PONG';

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
    return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.isConnected;
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Helper functions for backward compatibility
export function getRedis() {
  return redisManager;
}

export function publish(channel, message) {
  return redisManager.publish(channel, message);
}

export function subscribe(channel) {
  return redisManager.subscribe(channel);
}

/**
 * Usage Cache Class for tracking API usage and active users
 */
class UsageCache {
  constructor() {
    this.redis = redisManager;
  }

  /**
   * Increment API calls counter for a tenant and app
   */
  async incrementApiCalls(tenantId, app) {
    if (!this.redis.isConnected()) {
      console.warn('⚠️ Redis not connected, skipping API call tracking');
      return;
    }

    try {
      const key = `api_calls:${tenantId}:${app}:${this.getCurrentHourKey()}`;
      await this.redis.client.incr(key);

      // Set expiry for 24 hours
      await this.redis.client.expire(key, 24 * 60 * 60);

      console.log(`📊 API call tracked: ${tenantId}:${app}`);
    } catch (error) {
      console.error('❌ Failed to increment API calls:', error);
    }
  }

  /**
   * Track active user for a tenant
   */
  async trackActiveUser(tenantId, userId) {
    if (!this.redis.isConnected()) {
      console.warn('⚠️ Redis not connected, skipping active user tracking');
      return;
    }

    try {
      const key = `active_users:${tenantId}`;

      // Add user to active users set
      await this.redis.client.sAdd(key, userId);

      // Set expiry for 1 hour
      await this.redis.client.expire(key, 60 * 60);

      console.log(`👤 Active user tracked: ${tenantId}:${userId}`);
    } catch (error) {
      console.error('❌ Failed to track active user:', error);
    }
  }

  /**
   * Get API calls count for a tenant and app in the current hour
   */
  async getApiCallsCount(tenantId, app) {
    if (!this.redis.isConnected()) {
      return 0;
    }

    try {
      const key = `api_calls:${tenantId}:${app}:${this.getCurrentHourKey()}`;
      const count = await this.redis.client.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      console.error('❌ Failed to get API calls count:', error);
      return 0;
    }
  }

  /**
   * Get active users count for a tenant
   */
  async getActiveUsersCount(tenantId) {
    if (!this.redis.isConnected()) {
      return 0;
    }

    try {
      const key = `active_users:${tenantId}`;
      const count = await this.redis.client.sCard(key);
      return count;
    } catch (error) {
      console.error('❌ Failed to get active users count:', error);
      return 0;
    }
  }

  /**
   * Get current hour key for time-based tracking
   */
  getCurrentHourKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  }

  /**
   * Clean up old tracking data
   */
  async cleanupOldData() {
    if (!this.redis.isConnected()) {
      return;
    }

    try {
      // Get all API call keys older than 24 hours
      const apiKeys = await this.redis.client.keys('api_calls:*:*');

      // Get all active user keys older than 1 hour
      const userKeys = await this.redis.client.keys('active_users:*');

      // Clean up old keys
      for (const key of [...apiKeys, ...userKeys]) {
        const ttl = await this.redis.client.ttl(key);
        if (ttl < 0) {
          await this.redis.client.del(key);
        }
      }

      console.log('🧹 Cleaned up old usage tracking data');
    } catch (error) {
      console.error('❌ Failed to cleanup usage data:', error);
    }
  }
}

// Create singleton instance
const usageCache = new UsageCache();

// Export both the manager and the cache
export { redisManager as redis };
export { usageCache };
export { UsageCache };
export default redisManager;