# 🏢 CRM Comprehensive Caching: Employee & Activity Data

## 🎯 CRM Data Requirements

### **Critical Data for CRM Operations:**
```javascript
const crmCriticalData = {
  // 🚀 Always cached locally (instant access)
  creditCosts: 'Map<operationCode, cost>',     // For operation validation
  userPermissions: 'Map<userId, permissions>', // For authorization
  userRoles: 'Map<userId, roleIds>',           // For role-based access
  activeUsers: 'Map<userId, status>',          // For user validation

  // 🔄 Cached with short TTL (5-15 min)
  userProfiles: 'Map<userId, profile>',        // For display & activity logs
  organizationHierarchy: 'Map<entityId, hierarchy>', // For entity relationships
  roleDefinitions: 'Map<roleId, roleData>',    // For permission resolution
  departmentMappings: 'Map<userId, department>', // For organizational context
};
```


## 📊 Comprehensive CRM Consumer Architecture

### **Multi-Tier Data Strategy:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CRM DATA ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  🚀 CRITICAL DATA (Local Cache - Always Fresh)                             │
│  • Credit Costs → Instant operation validation                             │
│  • User Permissions → Real-time authorization                              │
│  • User Roles → Role-based access control                                  │
│  • Active User Status → Session validation                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔄 OPERATIONAL DATA (Local Cache - Short TTL)                             │
│  • User Profiles → Activity logging & display                              │
│  • Organization Hierarchy → Entity relationships                           │
│  • Role Definitions → Permission resolution                                │
│  • Department Mappings → Organizational context                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  📊 ACTIVITY DATA (Redis Cache - Medium TTL)                              │
│  • Recent Activities → Real-time activity tracking                         │
│  • Operation Logs → Operation history                                      │
│  • Credit Transactions → Usage tracking                                   │
│  • User Sessions → Active session monitoring                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  📋 COMPREHENSIVE DATA (Wrapper API - On-Demand)                           │
│  • Complete User Profiles → Detailed information                           │
│  • Full Audit Trails → Compliance & investigation                          │
│  • Historical Data → Long-term analytics                                   │
│  • Entity History → Change tracking                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 💻 Smart CRM Consumer Implementation

### **Comprehensive Consumer Class:**

```javascript
class ComprehensiveCRMConsumer {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.redisClient = null;
    this.isConnected = false;

    // 🚀 Critical Data (Always cached locally)
    this.criticalCache = {
      creditCosts: new Map(),      // operationCode → {cost, updatedAt}
      userPermissions: new Map(),  // userId → Set<permissions>
      userRoles: new Map(),        // userId → Set<roleIds>
      activeUsers: new Map(),      // userId → {status, lastSeen}
      operationConfigs: new Map()  // operationCode → config
    };

    // 🔄 Operational Data (Cached with TTL)
    this.operationalCache = {
      userProfiles: new Map(),     // userId → profile (5 min TTL)
      organizationHierarchy: new Map(), // entityId → hierarchy (15 min TTL)
      roleDefinitions: new Map(),  // roleId → roleData (30 min TTL)
      departmentMappings: new Map() // userId → department (10 min TTL)
    };

    // 📊 Activity Data (Redis with TTL)
    this.activityCache = {
      recentActivities: new Map(), // activityId → activity (1 hour TTL)
      operationLogs: new Map(),    // operationId → log (24 hours TTL)
      creditTransactions: new Map(), // transactionId → tx (7 days TTL)
      userSessions: new Map()      // sessionId → session (1 hour TTL)
    };

    this.cacheExpiry = new Map();
    this.wrapperApi = new WrapperApiClient();

    // 📈 Performance tracking
    this.metrics = {
      criticalHits: 0,
      operationalHits: 0,
      activityHits: 0,
      totalRequests: 0
    };
  }

  async initialize() {
    await this.connectToRedis();
    await this.subscribeToChannels();
    this.setupMessageHandlers();
    await this.preloadCriticalData();
    await this.preloadOperationalData();
    console.log('✅ Comprehensive CRM Consumer initialized');
  }

  // 🚀 Critical Data Methods (Ultra-fast)
  async getCreditCost(operationCode) {
    this.metrics.totalRequests++;

    const cached = this.criticalCache.creditCosts.get(operationCode);
    if (cached) {
      this.metrics.criticalHits++;
      return cached.cost;
    }

    // Fallback to operational data
    const config = this.operationalCache.operationConfigs?.get(operationCode);
    if (config) {
      this.promoteToCritical(operationCode, config);
      return config.creditCost;
    }

    return null;
  }

  async checkUserPermission(userId, permission) {
    this.metrics.totalRequests++;

    const userPermissions = this.criticalCache.userPermissions.get(userId);
    if (userPermissions && userPermissions.has(permission)) {
      this.metrics.criticalHits++;
      return true;
    }

    // Check roles for derived permissions
    const userRoles = this.criticalCache.userRoles.get(userId);
    if (userRoles) {
      for (const roleId of userRoles) {
        const roleData = this.operationalCache.roleDefinitions.get(roleId);
        if (roleData?.permissions?.includes(permission)) {
          this.promoteToCritical(userId, { permissions: userPermissions });
          return true;
        }
      }
    }

    return false;
  }

  // 🔄 Operational Data Methods (Smart caching)
  async getUserProfile(userId) {
    this.metrics.totalRequests++;

    const cacheKey = `profile:${userId}`;
    const cached = this.operationalCache.userProfiles.get(userId);

    if (this.isCacheValid(cacheKey) && cached) {
      this.metrics.operationalHits++;
      return cached;
    }

    // Fetch comprehensive profile
    const profile = await this.fetchComprehensiveUserProfile(userId);
    this.setOperationalCache(cacheKey, profile, 5 * 60 * 1000); // 5 min TTL

    return profile;
  }

  async getUserOrganizationContext(userId) {
    const profile = await this.getUserProfile(userId);
    const department = this.operationalCache.departmentMappings.get(userId);
    const hierarchy = this.operationalCache.organizationHierarchy.get(profile.organizationId);

    return {
      user: profile,
      department: department || 'Unknown',
      hierarchy: hierarchy || {},
      entityPath: this.buildEntityPath(profile, hierarchy)
    };
  }

  // 📊 Activity Tracking Methods
  async logActivity(activityData) {
    const activityId = `activity:${Date.now()}:${activityData.userId}`;

    const activity = {
      id: activityId,
      userId: activityData.userId,
      operation: activityData.operation,
      entityId: activityData.entityId,
      entityType: activityData.entityType,
      creditCost: activityData.creditCost,
      timestamp: new Date().toISOString(),
      userContext: await this.getUserOrganizationContext(activityData.userId),
      metadata: activityData.metadata || {}
    };

    // Store in activity cache
    this.activityCache.recentActivities.set(activityId, activity);

    // Send to Redis for persistence
    await this.redisClient.publish(`crm:${this.tenantId}:activities`, JSON.stringify(activity));

    console.log(`📊 Activity logged: ${activity.operation} by ${activityData.userId}`);
  }

  async getUserActivities(userId, options = {}) {
    const { limit = 50, since = '24h', includeDetails = true } = options;

    // Get from activity cache first
    const cachedActivities = this.getCachedActivities(userId, limit);

    if (cachedActivities.length >= limit) {
      return cachedActivities;
    }

    // Fetch from Wrapper API for complete history
    const additionalActivities = await this.fetchActivitiesFromWrapper(userId, {
      limit: limit - cachedActivities.length,
      since,
      includeDetails
    });

    return [...cachedActivities, ...additionalActivities];
  }

  // 🌐 Comprehensive Data Fetching
  async fetchComprehensiveUserProfile(userId) {
    try {
      const profile = await this.wrapperApi.get(`/api/users/${userId}/comprehensive`);

      // Cache related data
      if (profile.roles) {
        profile.roles.forEach(role => {
          this.operationalCache.roleDefinitions.set(role.roleId, role);
        });
      }

      if (profile.department) {
        this.operationalCache.departmentMappings.set(userId, profile.department);
      }

      if (profile.organizationId) {
        await this.cacheOrganizationHierarchy(profile.organizationId);
      }

      return profile;
    } catch (error) {
      console.error(`❌ Failed to fetch comprehensive profile: ${userId}`, error);
      throw error;
    }
  }

  async cacheOrganizationHierarchy(orgId) {
    try {
      const hierarchy = await this.wrapperApi.get(`/api/organizations/${orgId}/hierarchy`);

      // Cache all hierarchy entities
      this.traverseHierarchy(hierarchy, (entity) => {
        this.operationalCache.organizationHierarchy.set(entity.entityId, entity);
      });

    } catch (error) {
      console.error(`❌ Failed to cache hierarchy: ${orgId}`, error);
    }
  }

  // 📡 Redis Message Handling
  async handleMessage(channel, event) {
    try {
      switch (event.eventType) {
        case 'credit-config-changed':
          await this.updateCreditConfig(event.data);
          break;
        case 'role-changed':
          await this.updateRoleData(event.data);
          break;
        case 'user-changed':
          await this.updateUserData(event.data);
          break;
        case 'hierarchy-changed':
          await this.updateHierarchyData(event.data);
          break;
        case 'activity-logged':
          await this.cacheActivity(event.data);
          break;
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  async updateCreditConfig(configData) {
    this.criticalCache.creditCosts.set(configData.operationCode, {
      cost: configData.creditCost,
      updatedAt: new Date().toISOString()
    });

    this.criticalCache.operationConfigs.set(configData.operationCode, configData);
    console.log(`💰 Updated credit config: ${configData.operationCode}`);
  }

  async updateUserData(userData) {
    // Update critical caches
    this.criticalCache.activeUsers.set(userData.userId, {
      status: userData.isActive,
      lastSeen: new Date().toISOString()
    });

    // Invalidate operational caches
    this.invalidateOperationalCache(`profile:${userData.userId}`);
    this.operationalCache.departmentMappings.delete(userData.userId);

    console.log(`👤 Updated user data: ${userData.userId}`);
  }

  async cacheActivity(activityData) {
    this.activityCache.recentActivities.set(activityData.id, activityData);

    // Maintain cache size
    if (this.activityCache.recentActivities.size > 1000) {
      this.evictOldActivities(200);
    }
  }

  // 🔧 Cache Management
  isCacheValid(cacheKey) {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry && Date.now() < expiry;
  }

  setOperationalCache(cacheKey, data, ttlMs) {
    this.operationalCache.userProfiles.set(cacheKey.split(':')[1], data);
    this.cacheExpiry.set(cacheKey, Date.now() + ttlMs);
  }

  invalidateOperationalCache(cacheKey) {
    const userId = cacheKey.split(':')[1];
    this.operationalCache.userProfiles.delete(userId);
    this.cacheExpiry.delete(cacheKey);
  }

  promoteToCritical(key, data) {
    // Move frequently accessed data to critical cache
    if (key.startsWith('profile:')) {
      const userId = key.split(':')[1];
      const permissions = data.permissions || [];
      this.criticalCache.userPermissions.set(userId, new Set(permissions));
    }
  }

  getCachedActivities(userId, limit) {
    const activities = Array.from(this.activityCache.recentActivities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return activities;
  }

  evictOldActivities(count) {
    const activities = Array.from(this.activityCache.recentActivities.entries())
      .sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp))
      .slice(0, count);

    activities.forEach(([id]) => {
      this.activityCache.recentActivities.delete(id);
    });
  }

  // 🔄 Connection Management
  async handleConnectionLoss() {
    this.isConnected = false;
    console.log('🔄 Operating in degraded mode - using cached data only');

    // Refresh critical data from local storage if available
    await this.loadFromLocalStorage();

    setTimeout(async () => {
      await this.reconnect();
    }, 5000);
  }

  async loadFromLocalStorage() {
    // Load critical data from local storage as backup
    try {
      const stored = localStorage.getItem(`crm-cache-${this.tenantId}`);
      if (stored) {
        const data = JSON.parse(stored);
        Object.assign(this.criticalCache, data.criticalCache);
        console.log('✅ Loaded critical data from local storage');
      }
    } catch (error) {
      console.error('❌ Failed to load from local storage:', error);
    }
  }

  // 📊 Performance Monitoring
  getMetrics() {
    const total = this.metrics.criticalHits + this.metrics.operationalHits;

    return {
      criticalHitRate: this.metrics.criticalHits / (this.metrics.criticalHits + this.metrics.operationalHits),
      operationalHitRate: this.metrics.operationalHits / total,
      overallHitRate: total / this.metrics.totalRequests,
      cacheSizes: {
        critical: this.getCacheSizes().critical,
        operational: this.getCacheSizes().operational,
        activity: this.activityCache.recentActivities.size
      }
    };
  }

  getCacheSizes() {
    return {
      critical: {
        creditCosts: this.criticalCache.creditCosts.size,
        userPermissions: this.criticalCache.userPermissions.size,
        userRoles: this.criticalCache.userRoles.size,
        activeUsers: this.criticalCache.activeUsers.size
      },
      operational: {
        userProfiles: this.operationalCache.userProfiles.size,
        organizationHierarchy: this.operationalCache.organizationHierarchy.size,
        roleDefinitions: this.operationalCache.roleDefinitions.size,
        departmentMappings: this.operationalCache.departmentMappings.size
      }
    };
  }

  // 🌐 Wrapper API Integration
  async fetchActivitiesFromWrapper(userId, options) {
    const params = new URLSearchParams({
      userId,
      limit: options.limit,
      since: options.since,
      includeDetails: options.includeDetails
    });

    const response = await this.wrapperApi.get(`/api/activities?${params}`);
    return response.data.activities;
  }

  traverseHierarchy(hierarchy, callback) {
    callback(hierarchy);
    if (hierarchy.children) {
      hierarchy.children.forEach(child => this.traverseHierarchy(child, callback));
    }
  }

  buildEntityPath(user, hierarchy) {
    // Build entity path: Tenant → Organization → Department → User
    const path = [this.tenantId];

    if (hierarchy) {
      path.push(hierarchy.organizationName);
      if (hierarchy.departmentName) {
        path.push(hierarchy.departmentName);
      }
    }

    if (user) {
      path.push(user.name);
    }

    return path.join(' → ');
  }

  async shutdown() {
    // Persist critical data to local storage
    const criticalData = {
      creditCosts: Object.fromEntries(this.criticalCache.creditCosts),
      userPermissions: Object.fromEntries(this.criticalCache.userPermissions),
      userRoles: Object.fromEntries(this.criticalCache.userRoles),
      activeUsers: Object.fromEntries(this.criticalCache.activeUsers)
    };

    localStorage.setItem(`crm-cache-${this.tenantId}`, JSON.stringify({ criticalData }));

    if (this.redisClient) {
      await this.redisClient.disconnect();
    }

    console.log('🛑 Comprehensive CRM Consumer shutdown');
  }
}
```

## 🌐 CRM API Integration Examples

### **1. Operation with Activity Logging:**

```javascript
app.post('/api/leads', async (req, res) => {
  const { userId, leadData } = req.body;

  try {
    // 🚀 Check permissions (critical cache)
    const hasPermission = await crmConsumer.checkUserPermission(userId, 'crm.leads.create');

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // 🚀 Get credit cost (critical cache)
    const creditCost = await crmConsumer.getCreditCost('crm.leads.create');

    // 🔄 Get user context (operational cache)
    const userContext = await crmConsumer.getUserOrganizationContext(userId);

    // Process the operation
    const lead = await createLeadInDatabase(leadData, userContext);

    // 📊 Log activity with full context
    await crmConsumer.logActivity({
      userId,
      operation: 'lead.create',
      entityId: lead.id,
      entityType: 'lead',
      creditCost,
      metadata: { leadTitle: leadData.title, source: leadData.source }
    });

    res.json({
      success: true,
      leadId: lead.id,
      creditsDeducted: creditCost,
      userContext: {
        user: userContext.user.name,
        department: userContext.department,
        entityPath: userContext.entityPath
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **2. User Activity Dashboard:**

```javascript
app.get('/api/users/:userId/activity', async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, includeDetails = true } = req.query;

  try {
    // 📊 Get user activities with comprehensive data
    const activities = await crmConsumer.getUserActivities(userId, {
      limit: parseInt(limit),
      since: '7d',
      includeDetails
    });

    // 🔄 Get user profile context
    const userContext = await crmConsumer.getUserOrganizationContext(userId);

    // Aggregate activity statistics
    const stats = this.aggregateActivityStats(activities);

    res.json({
      userId,
      userContext,
      activities,
      statistics: stats,
      summary: {
        totalOperations: activities.length,
        totalCreditsUsed: stats.totalCredits,
        lastActivity: activities[0]?.timestamp,
        activePeriod: stats.period
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **3. Organizational Activity Report:**

```javascript
app.get('/api/reports/organizational-activity', async (req, res) => {
  const { departmentId, since = '30d', groupBy = 'day' } = req.query;

  try {
    // 🔄 Get hierarchy data
    const hierarchy = await crmConsumer.getOrganizationHierarchy(departmentId);

    // 📊 Get all activities in the organizational unit
    const activities = await crmConsumer.getOrganizationalActivities(departmentId, since);

    // Aggregate by user, operation type, time period
    const report = this.generateOrganizationalReport(activities, hierarchy, groupBy);

    res.json({
      departmentId,
      hierarchy,
      report,
      summary: {
        totalUsers: report.userStats.length,
        totalOperations: activities.length,
        totalCredits: report.totalCredits,
        period: since
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📊 Memory Usage for Comprehensive CRM

### **Memory Footprint:**

```javascript
const comprehensiveCRMMemory = {
  criticalCache: '20-50KB',         // Credit costs, permissions, roles, active users
  operationalCache: '100-500KB',    // User profiles, hierarchy, roles, departments
  activityCache: '50-200KB',        // Recent activities, logs, transactions
  overhead: '10-50KB',              // Monitoring, indices, metadata
  totalPerTenant: '180-800KB'       // Comprehensive data per tenant
};
```

### **Scaling with Multiple Tenants:**

```javascript
const scalingMemoryUsage = {
  tenants: 100,
  memoryPerTenant: '300KB',
  totalMemory: '30MB',
  optimization: 'Redis backend for activity data',

  tenants: 1000,
  memoryPerTenant: '250KB',        // Optimized per-tenant storage
  totalMemory: '250MB',
  optimization: 'Tiered caching + Redis',

  tenants: 10000,
  memoryPerTenant: '150KB',        // Advanced optimization
  totalMemory: '1.5GB',
  optimization: 'Full Redis backend + compression'
};
```

## 🎯 Benefits of Comprehensive CRM Caching

### **✅ Complete Data Coverage:**
- **All employee data** available for activity tracking
- **Organizational context** for entity relationships
- **Real-time permissions** for authorization
- **Comprehensive audit trails** for compliance

### **✅ Performance Optimization:**
- **Critical operations**: <1ms response time
- **Activity logging**: Real-time with full context
- **User profiles**: Cached with organizational hierarchy
- **Permission checks**: Instant role-based access

### **✅ Activity Tracking Excellence:**
- **Who**: Complete user profile and organizational context
- **What**: Operation details with credit costs
- **When**: Precise timestamps with session information
- **Where**: Entity hierarchy and department mapping
- **Why**: Permission context and role information

### **✅ Scalability:**
- **Memory efficient**: Optimized storage per data type
- **Redis integration**: Activity data in Redis for larger scale
- **Tiered caching**: Critical → Operational → Activity → Comprehensive
- **Horizontal scaling**: Multiple consumer instances

**This comprehensive approach gives your CRM application all the employee data, roles, permissions, and activity tracking capabilities it needs while maintaining optimal performance!** 🚀
