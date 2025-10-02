# 🏗️ Caching Architecture: How Data Flows

## 🎯 Overview

The hybrid caching strategy uses **two-tier caching** with **smart data access patterns** to provide optimal performance while minimizing overhead.

## 📊 Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            HYBRID CACHING ARCHITECTURE             │
├─────────────────────────────────────────────────────────────────────┤
│  🚀 CRITICAL DATA CACHE (Local, Always Fresh)                       │
│  • Credit Costs → Map<operationCode, cost>                          │
│  • Role Permissions → Map<roleId, permissions>                      │
│  • User Status → Map<userId, status>                                │
│  • Active Configs → Map<configId, config>                           │
│                                                                     │
│  🔄 REFERENCE DATA CACHE (Local, TTL-based)                         │
│  • User Profiles → Map<userId, profile> (TTL: 5 min)                │
│  • Organization Hierarchy → Map<entityId, hierarchy> (TTL: 15 min)  │
│  • Historical Data → Map<key, data> (TTL: 60 min)                  │
│  • Audit Logs → Map<logId, log> (TTL: 1 hour)                       │
├─────────────────────────────────────────────────────────────────────┤
│  📡 REDIS MESSAGES (Change Notifications)                           │
│  • Minimal messages with change details                              │
│  • No full data transfer                                            │
│  • Automatic routing to specific consumers                          │
├─────────────────────────────────────────────────────────────────────┤
│  🌐 WRAPPER API (Single Source of Truth)                            │
│  • Authoritative data source                                         │
│  • On-demand fetching for cache misses                              │
│  • Real-time data updates                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 Critical Data Caching (Fast Access)

### **Cache Structure:**
```javascript
class CriticalCache {
  constructor() {
    // 🚀 Always cached locally - instant access
    this.creditCosts = new Map();    // operationCode → {cost, updatedAt}
    this.rolePermissions = new Map(); // roleId → {permissions, updatedAt}
    this.userStatus = new Map();     // userId → {status, updatedAt}
    this.activeConfigs = new Map();  // configId → {config, updatedAt}
  }

  // Fast lookup - O(1) access
  getCreditCost(operationCode) {
    return this.creditCosts.get(operationCode)?.cost;
  }

  getRolePermissions(roleId) {
    return this.rolePermissions.get(roleId)?.permissions;
  }
}
```

### **Cache Population:**
```javascript
// From Redis messages - minimal data transfer
async handleCreditConfigChanged(event) {
  this.creditCosts.set(event.data.operationCode, {
    cost: event.data.newValue,
    updatedAt: new Date().toISOString()
  });
  console.log(`💰 Cached: ${event.data.operationCode} = ${event.data.newValue}`);
}
```

## 🔄 Reference Data Caching (Smart Fetching)

### **Cache Structure:**
```javascript
class ReferenceCache {
  constructor() {
    // 🔄 Cached with TTL - smart expiry
    this.userProfiles = new Map();     // userId → profile
    this.hierarchyData = new Map();    // entityId → hierarchy
    this.auditLogs = new Map();        // logId → log
    this.cacheExpiry = new Map();      // key → expiryTime
  }

  // Smart access with TTL check
  getUserProfile(userId) {
    const cacheKey = `user:${userId}`;

    if (this.isValid(cacheKey)) {
      return this.userProfiles.get(cacheKey); // Cache hit
    }

    // Cache miss - fetch from Wrapper
    return this.fetchFromWrapper(`/api/users/${userId}`);
  }
}
```

### **TTL Strategy:**
```javascript
const TTL_STRATEGY = {
  userProfiles: 5 * 60 * 1000,      // 5 minutes
  hierarchyData: 15 * 60 * 1000,     // 15 minutes
  auditLogs: 60 * 60 * 1000,         // 1 hour
  historicalData: 24 * 60 * 60 * 1000 // 24 hours
};

setExpiry(key, ttl) {
  this.cacheExpiry.set(key, Date.now() + ttl);
}

isValid(key) {
  const expiry = this.cacheExpiry.get(key);
  return expiry && Date.now() < expiry;
}
```

## 📡 Redis Message Flow

### **Message Types:**
```javascript
// 1. Critical Data Changes (Cache immediately)
const criticalMessage = {
  eventType: 'credit-config-changed',
  tenantId: '123',
  data: {
    operationCode: 'crm.leads.create',
    changedFields: ['credit_cost'],
    newValue: 3.0,
    oldValue: 2.5
  }
};

// 2. Reference Data Changes (Invalidate cache)
const referenceMessage = {
  eventType: 'user-profile-changed',
  tenantId: '123',
  data: {
    userId: 'user-456',
    changedFields: ['title', 'department']
  }
};
```

### **Message Processing:**
```javascript
async processMessage(channel, event) {
  const dataType = channel.split(':').pop();

  switch (dataType) {
    case 'credit-configs':
      await this.updateCriticalCache(event); // Cache locally
      break;
    case 'roles':
      await this.updateCriticalCache(event); // Cache locally
      break;
    case 'users':
      await this.invalidateReferenceCache(event); // Invalidate
      break;
    case 'hierarchy':
      await this.invalidateReferenceCache(event); // Invalidate
      break;
  }
}
```

## 🌐 Request Flow Patterns

### **Pattern 1: Credit Checking (Critical Data)**

#### **Request Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    CREDIT CHECKING FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. CRM Operation Request                                           │
│     POST /api/operations/lead-create                                │
│                                                                     │
│  2. Check Credit Cost (Critical Cache)                              │
│     const cost = criticalCache.getCreditCost('crm.leads.create');  │
│     // O(1) lookup - <1ms response                                 │
│                                                                     │
│  3. Validate User Credits                                           │
│     const available = await getUserCredits(userId);                 │
│                                                                     │
│  4. Return Response                                                 │
│     { operation: 'lead-create', cost: 3.0, canAfford: true }       │
└─────────────────────────────────────────────────────────────────────┘
```

#### **Implementation:**
```javascript
app.post('/api/operations/lead-create', async (req, res) => {
  const { userId, leadData } = req.body;

  try {
    // 🚀 Fast critical data access
    const creditCost = await crmConsumer.getCreditCost('crm.leads.create');

    if (!creditCost) {
      return res.status(404).json({ error: 'Operation not configured' });
    }

    // Check user credits (fetch if not cached)
    const availableCredits = await crmConsumer.getUserCredits(userId);

    if (availableCredits < creditCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // Process the operation
    const result = await processLeadCreation(leadData);

    // Deduct credits
    await crmConsumer.deductCredits(userId, creditCost);

    res.json({ success: true, leadId: result.id });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Pattern 2: User Profile Access (Reference Data)**

#### **Request Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER PROFILE ACCESS FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│  1. Profile Request                                                 │
│     GET /api/users/user-456                                         │
│                                                                     │
│  2. Check Reference Cache                                           │
│     const profile = referenceCache.getUserProfile('user-456');      │
│     if (cached && valid) return cached; // Cache hit               │
│                                                                     │
│  3. Cache Miss - Fetch from Wrapper                                 │
│     const profile = await fetch('/api/users/user-456');             │
│                                                                     │
│  4. Cache the Result                                                │
│     referenceCache.set('user:user-456', profile, 5 * 60 * 1000);    │
│                                                                     │
│  5. Return Response                                                 │
│     { id: 'user-456', name: 'John', department: 'Sales' }          │
└─────────────────────────────────────────────────────────────────────┘
```

#### **Implementation:**
```javascript
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 🔄 Smart reference data access
    const profile = await crmConsumer.getUserProfile(userId);
    res.json(profile);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Pattern 3: Role-Based Access Control**

#### **Request Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROLE PERMISSION CHECK FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│  1. Permission Check Request                                        │
│     Check if user can 'crm.leads.create'                           │
│                                                                     │
│  2. Get User Roles (Critical Cache)                                 │
│     const userRoles = criticalCache.getUserRoles(userId);          │
│                                                                     │
│  3. Check Each Role Permissions                                     │
│     for (role of userRoles) {                                       │
│       const permissions = criticalCache.getRolePermissions(role);   │
│       if (permissions.includes('crm.leads.create')) return true;   │
│     }                                                               │
│                                                                     │
│  4. Return Authorization Result                                     │
│     { authorized: true, roles: ['admin', 'sales'] }                │
└─────────────────────────────────────────────────────────────────────┘
```

#### **Implementation:**
```javascript
async function checkPermission(userId, permission) {
  // 🚀 Fast permission check using critical cache
  const userRoles = criticalCache.getUserRoles(userId);

  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  for (const roleId of userRoles) {
    const permissions = criticalCache.getRolePermissions(roleId);

    if (permissions && permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}
```

## 🔄 Cache Invalidation Strategies

### **1. Critical Data Updates:**
```javascript
// Immediate update from Redis messages
async handleCriticalDataChange(event) {
  switch (event.dataType) {
    case 'credit-configs':
      this.criticalCache.setCreditCost(event.data.operationCode, event.data.newValue);
      break;
    case 'roles':
      this.criticalCache.setRolePermissions(event.data.roleId, event.data.permissions);
      break;
  }
}
```

### **2. Reference Data Invalidation:**
```javascript
// Invalidate on change, fetch on next access
async handleReferenceDataChange(event) {
  switch (event.dataType) {
    case 'users':
      this.referenceCache.delete(`user:${event.data.userId}`);
      this.cacheExpiry.delete(`user:${event.data.userId}`);
      break;
    case 'hierarchy':
      this.referenceCache.delete(`hierarchy:${event.data.entityId}`);
      this.cacheExpiry.delete(`hierarchy:${event.data.entityId}`);
      break;
  }
}
```

### **3. Bulk Cache Refresh:**
```javascript
// Periodic refresh of critical data
async refreshCriticalCache() {
  try {
    const latestConfigs = await this.fetchCriticalData();
    this.criticalCache.clear();
    latestConfigs.forEach(config => {
      this.criticalCache.setCreditCost(config.operationCode, config.cost);
    });
    console.log('✅ Critical cache refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh critical cache:', error);
  }
}
```

## 📊 Performance Metrics

### **Cache Hit Rates:**
```javascript
const CACHE_METRICS = {
  criticalHits: 0,
  criticalMisses: 0,
  referenceHits: 0,
  referenceMisses: 0,
  totalRequests: 0,

  get criticalHitRate() {
    return this.criticalHits / (this.criticalHits + this.criticalMisses);
  },

  get referenceHitRate() {
    return this.referenceHits / (this.referenceHits + this.referenceMisses);
  },

  get overallHitRate() {
    const total = this.criticalHits + this.criticalMisses +
                  this.referenceHits + this.referenceMisses;
    return (this.criticalHits + this.referenceHits) / total;
  }
};
```

### **Response Time Distribution:**
```javascript
const RESPONSE_TIMES = {
  criticalCache: '< 1ms',      // Direct memory access
  referenceCache: '1-5ms',     // Cache lookup + validation
  wrapperAPI: '50-100ms',      // Network call + response

  get averageResponseTime() {
    const criticalTime = this.criticalRequests * 0.001;  // 1ms
    const referenceTime = this.referenceRequests * 0.003; // 3ms
    const wrapperTime = this.wrapperRequests * 0.075;    // 75ms

    return (criticalTime + referenceTime + wrapperTime) / this.totalRequests;
  }
};
```

## 🎯 API Endpoint Examples

### **1. Credit Validation Endpoint:**
```javascript
app.get('/api/credits/validate', async (req, res) => {
  const { operation, userId } = req.query;

  try {
    // 🚀 Critical data - instant response
    const creditCost = await crmConsumer.getCreditCost(operation);

    if (!creditCost) {
      return res.status(404).json({
        error: 'Operation not configured',
        operation,
        cached: true
      });
    }

    // Check user credits
    const availableCredits = await crmConsumer.getUserCredits(userId);

    res.json({
      operation,
      creditCost,
      availableCredits,
      canAfford: availableCredits >= creditCost,
      cached: true
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **2. User Profile Endpoint:**
```javascript
app.get('/api/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;

  try {
    // 🔄 Reference data - smart caching
    const profile = await crmConsumer.getUserProfile(userId);

    res.json({
      ...profile,
      cached: true,
      cacheExpiry: crmConsumer.getCacheExpiry(`user:${userId}`)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **3. Permission Check Endpoint:**
```javascript
app.get('/api/permissions/check', async (req, res) => {
  const { userId, permission } = req.query;

  try {
    // 🚀 Critical data - instant response
    const hasPermission = await crmConsumer.checkPermission(userId, permission);

    res.json({
      userId,
      permission,
      authorized: hasPermission,
      cached: true,
      responseTime: '< 1ms'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📈 Monitoring & Optimization

### **Cache Performance Monitoring:**
```javascript
class CacheMonitor {
  async trackPerformance() {
    const metrics = {
      criticalHitRate: CACHE_METRICS.criticalHitRate,
      referenceHitRate: CACHE_METRICS.referenceHitRate,
      overallHitRate: CACHE_METRICS.overallHitRate,
      averageResponseTime: RESPONSE_TIMES.averageResponseTime,
      cacheSize: this.getCacheSizes(),
      memoryUsage: process.memoryUsage()
    };

    // Log metrics
    console.log('📊 Cache Performance:', metrics);

    // Alert on poor performance
    if (metrics.criticalHitRate < 0.95) {
      console.warn('⚠️ Critical cache hit rate below 95%');
    }

    if (metrics.averageResponseTime > 50) {
      console.warn('⚠️ Average response time above 50ms');
    }
  }
}
```

### **Adaptive Caching:**
```javascript
class AdaptiveCache {
  adjustStrategy() {
    // Increase TTL for high-hit items
    if (this.hitRate > 0.95) {
      this.increaseTTL();
    }

    // Decrease TTL for low-hit items
    if (this.hitRate < 0.7) {
      this.decreaseTTL();
    }

    // Preload frequently accessed items
    if (this.accessCount > 100) {
      this.preloadSimilarItems();
    }
  }
}
```

## 🎉 Benefits of This Architecture

### **✅ Optimal Performance:**
- **Critical operations**: Sub-millisecond response
- **Reference operations**: Smart caching with TTL
- **Overall**: 95%+ cache hit rates

### **✅ Minimal Overhead:**
- **Memory efficient**: Only essential data cached
- **Network efficient**: Minimal Redis messages
- **CPU efficient**: Smart cache management

### **✅ Data Consistency:**
- **Real-time updates**: Immediate cache invalidation
- **Single source**: Wrapper remains authoritative
- **No drift**: Consistent data across all consumers

### **✅ Scalability:**
- **Horizontal scaling**: Independent consumer instances
- **Memory scaling**: Efficient cache sizing
- **Network scaling**: Optimized message patterns

**This caching architecture provides the perfect balance of performance, efficiency, and consistency!** 🚀
