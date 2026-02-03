/**
 * Usage Cache Service
 * In-memory cache for API usage tracking
 * Redis removed - using in-memory Map for caching
 */
class UsageCache {
  constructor() {
    // In-memory storage (replaces Redis)
    this.apiCalls = new Map(); // tenantId -> { date -> count }
    this.activeUsers = new Map(); // tenantId -> Set of userIds
    this.featureUsage = new Map(); // tenantId -> { feature -> count }
    this.intervalMetrics = new Map(); // tenantId -> { timestamp -> metrics }
    this.appMetrics = new Map(); // tenantId -> { app -> metrics }
    
    // Cleanup expired entries periodically
    setInterval(() => this._cleanupExpired(), 3600000); // Every hour
  }

  /**
   * Clean up expired entries
   */
  _cleanupExpired() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Clean up old interval metrics
    for (const [tenantId, intervals] of this.intervalMetrics.entries()) {
      for (const [timestamp] of intervals.entries()) {
        if (parseInt(timestamp) < oneDayAgo) {
          intervals.delete(timestamp);
        }
      }
      if (intervals.size === 0) {
        this.intervalMetrics.delete(tenantId);
      }
    }
  }

  /**
   * Get cache key for tenant and date
   */
  _getKey(tenantId, date) {
    return `${tenantId}:${date}`;
  }

  /**
   * Increment API call count
   */
  async incrementApiCalls(tenantId, app) {
    const today = new Date().toISOString().split('T')[0];
    const key = this._getKey(tenantId, today);
    
    if (!this.apiCalls.has(tenantId)) {
      this.apiCalls.set(tenantId, new Map());
    }
    
    const tenantCalls = this.apiCalls.get(tenantId);
    const appKey = `${key}:${app}`;
    tenantCalls.set(appKey, (tenantCalls.get(appKey) || 0) + 1);
  }

  /**
   * Get API call count for tenant and date
   */
  async getApiCallCount(tenantId, app, date) {
    const key = this._getKey(tenantId, date);
    const tenantCalls = this.apiCalls.get(tenantId);
    if (!tenantCalls) return 0;
    
    const appKey = `${key}:${app}`;
    return tenantCalls.get(appKey) || 0;
  }

  /**
   * Get total API calls for tenant and date
   */
  async getTotalApiCalls(tenantId, date) {
    const key = this._getKey(tenantId, date);
    const tenantCalls = this.apiCalls.get(tenantId);
    if (!tenantCalls) return 0;
    
    let total = 0;
    for (const [callKey, count] of tenantCalls.entries()) {
      if (callKey.startsWith(key)) {
        total += count;
      }
    }
    return total;
  }

  /**
   * Track active user
   */
  async trackActiveUser(tenantId, userId) {
    if (!this.activeUsers.has(tenantId)) {
      this.activeUsers.set(tenantId, new Set());
    }
    this.activeUsers.get(tenantId).add(userId);
  }

  /**
   * Get active user count
   */
  async getActiveUserCount(tenantId) {
    const users = this.activeUsers.get(tenantId);
    return users ? users.size : 0;
  }

  /**
   * Get active users
   */
  async getActiveUsers(tenantId) {
    const users = this.activeUsers.get(tenantId);
    return users ? Array.from(users) : [];
  }

  /**
   * Get current usage for tenant
   */
  async getCurrentUsage(tenantId) {
    const today = new Date().toISOString().split('T')[0];
    return {
      apiCalls: await this.getTotalApiCalls(tenantId, today),
      activeUsers: await this.getActiveUserCount(tenantId)
    };
  }

  /**
   * Get total API calls (all time)
   */
  async getTotalApiCalls(tenantId) {
    const tenantCalls = this.apiCalls.get(tenantId);
    if (!tenantCalls) return 0;
    
    let total = 0;
    for (const count of tenantCalls.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Increment feature usage
   */
  async incrementFeatureUsage(tenantId, feature, metadata = {}) {
    if (!this.featureUsage.has(tenantId)) {
      this.featureUsage.set(tenantId, new Map());
    }
    
    const tenantFeatures = this.featureUsage.get(tenantId);
    tenantFeatures.set(feature, (tenantFeatures.get(feature) || 0) + 1);
  }

  /**
   * Get tenant API calls summary
   */
  async getTenantApiCallsSummary(tenantId, date) {
    const tenantCalls = this.apiCalls.get(tenantId);
    if (!tenantCalls) return {};
    
    const key = this._getKey(tenantId, date);
    const summary = {};
    
    for (const [callKey, count] of tenantCalls.entries()) {
      if (callKey.startsWith(key)) {
        const app = callKey.split(':')[2];
        summary[app] = (summary[app] || 0) + count;
      }
    }
    
    return summary;
  }

  /**
   * Get all tenants usage
   */
  async getAllTenantsUsage(date) {
    const result = {};
    
    for (const tenantId of this.apiCalls.keys()) {
      result[tenantId] = await this.getTenantApiCallsSummary(tenantId, date);
    }
    
    return result;
  }

  /**
   * Store interval metrics
   */
  async storeIntervalMetrics(tenantId, timestamp, metrics) {
    if (!this.intervalMetrics.has(tenantId)) {
      this.intervalMetrics.set(tenantId, new Map());
    }
    
    this.intervalMetrics.get(tenantId).set(timestamp.toString(), metrics);
  }

  /**
   * Store app metrics
   */
  async storeAppMetrics(tenantId, app, metrics) {
    if (!this.appMetrics.has(tenantId)) {
      this.appMetrics.set(tenantId, new Map());
    }
    
    this.appMetrics.get(tenantId).set(app, metrics);
  }
}

// Export singleton instance
export const usageCache = new UsageCache();
export { UsageCache };
export default usageCache;
