# 📊 Data Flow Diagram: Request Processing

## 🎯 Visual Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST PROCESSING FLOW                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  🌐 HTTP Request → 🚀 Critical Cache → 🔄 Reference Cache → 🌐 Wrapper API  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                          REQUEST ROUTER                                │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │  1. Parse Request Type                                                  │  │
│  │  2. Route to Appropriate Handler                                        │  │
│  │  3. Return Response                                                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    🚀 CRITICAL DATA FLOW                              │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │  • Credit Costs      → Map Lookup (<1ms)                               │  │
│  │  • Role Permissions  → Map Lookup (<1ms)                               │  │
│  │  • User Status       → Map Lookup (<1ms)                               │  │
│  │  • Active Configs    → Map Lookup (<1ms)                               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    🔄 REFERENCE DATA FLOW                             │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │  • User Profiles     → Cache Check → Fetch if Miss → Cache Result     │  │
│  │  • Hierarchy Data    → Cache Check → Fetch if Miss → Cache Result     │  │
│  │  • Audit Logs        → Cache Check → Fetch if Miss → Cache Result     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    📡 REDIS MESSAGE FLOW                              │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │  • Change Notifications → Update Critical Cache                        │  │
│  │  • Change Notifications → Invalidate Reference Cache                   │  │
│  │  • Minimal Data Transfer                                               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Detailed Request Flows

### **Flow 1: Credit Validation Request**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREDIT VALIDATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  HTTP Request: POST /api/operations/validate                                │
│  Body: { operation: 'crm.leads.create', userId: 'user-123' }               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  1. Route to Credit Handler                                             │  │
│  │     - Parse operation: 'crm.leads.create'                              │  │
│  │     - Parse userId: 'user-123'                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  2. Critical Cache Lookup                                               │  │
│  │     - Lookup: criticalCache.getCreditCost('crm.leads.create')          │  │
│  │     - Result: 3.0 credits (cached)                                     │  │
│  │     - Response Time: <1ms                                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  3. User Credits Check                                                  │  │
│  │     - Check: referenceCache.getUserCredits('user-123')                  │  │
│  │     - Cache Miss → Fetch from Wrapper                                  │  │
│  │     - Cache Result for 5 minutes                                       │  │
│  │     - Response Time: 50-100ms                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  4. Validation Logic                                                    │  │
│  │     - Compare: userCredits (100) >= operationCost (3.0)                │  │
│  │     - Result: true (can afford)                                        │  │
│  │     - Response Time: <1ms                                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  5. HTTP Response                                                       │  │
│  │     - Status: 200 OK                                                   │  │
│  │     - Body: { operation: 'crm.leads.create', cost: 3.0, canAfford: true }│
│  │     - Total Response Time: ~50ms                                       │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Flow 2: User Profile Request**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER PROFILE REQUEST                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  HTTP Request: GET /api/users/user-456/profile                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  1. Route to Profile Handler                                            │  │
│  │     - Parse userId: 'user-456'                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  2. Reference Cache Check                                               │  │
│  │     - Check: referenceCache.getUserProfile('user-456')                  │  │
│  │     - Cache Hit: Profile found (expires in 3 minutes)                  │  │
│  │     - Response Time: 1-2ms                                             │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  3. HTTP Response                                                       │  │
│  │     - Status: 200 OK                                                   │  │
│  │     - Body: { id: 'user-456', name: 'John', department: 'Sales' }      │  │
│  │     - Cached: true                                                     │  │
│  │     - Cache Expiry: 3 minutes                                          │  │
│  │     - Total Response Time: ~2ms                                        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Flow 3: Role Permission Check**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERMISSION CHECK REQUEST                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  HTTP Request: GET /api/permissions/check                                   │
│  Query: { userId: 'user-123', permission: 'crm.leads.create' }             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  1. Route to Permission Handler                                         │  │
│  │     - Parse userId: 'user-123'                                          │  │
│  │     - Parse permission: 'crm.leads.create'                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  2. Critical Cache Lookups                                              │  │
│  │     - Get user roles: criticalCache.getUserRoles('user-123')           │  │
│  │     - Get role permissions: criticalCache.getRolePermissions('role-1') │  │
│  │     - Check permission match: 'crm.leads.create' ∈ permissions         │  │
│  │     - Result: true (authorized)                                        │  │
│  │     - Response Time: <1ms                                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  3. HTTP Response                                                       │  │
│  │     - Status: 200 OK                                                   │  │
│  │     - Body: { authorized: true, responseTime: '<1ms' }                  │  │
│  │     - Total Response Time: <1ms                                        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📡 Redis Message Processing Flow

### **Critical Data Update:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REDIS MESSAGE: CRITICAL DATA                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Redis Message Received: credit-config-changed                              │
│  Channel: crm:123:credit-configs                                            │
│  Payload: { operationCode: 'crm.leads.create', newValue: 5.0 }              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  1. Parse Message                                                       │  │
│  │     - Event Type: credit-config-changed                                │  │
│  │     - Data Type: credit-configs                                        │  │
│  │     - Operation: crm.leads.create                                      │  │
│  │     - New Value: 5.0                                                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  2. Update Critical Cache                                               │  │
│  │     - Update: criticalCache.setCreditCost('crm.leads.create', 5.0)     │  │
│  │     - Invalidate related caches                                        │  │
│  │     - Log: 'Credit cost updated for crm.leads.create'                  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  3. Broadcast Update (Optional)                                          │  │
│  │     - Notify other local services                                      │  │
│  │     - Update UI components                                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Reference Data Invalidation:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REDIS MESSAGE: REFERENCE DATA                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Redis Message Received: user-profile-changed                               │
│  Channel: crm:123:users                                                     │
│  Payload: { userId: 'user-456', changedFields: ['department'] }             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  1. Parse Message                                                       │  │
│  │     - Event Type: user-profile-changed                                 │  │
│  │     - Data Type: users                                                 │  │
│  │     - User ID: user-456                                                │  │
│  │     - Changed Fields: ['department']                                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  2. Invalidate Reference Cache                                          │  │
│  │     - Delete: referenceCache.delete('user:user-456')                   │  │
│  │     - Delete: cacheExpiry.delete('user:user-456')                      │  │
│  │     - Log: 'User profile cache invalidated for user-456'               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  3. Next Access Will Fetch Fresh Data                                   │  │
│  │     - Any future requests for user-456 will fetch from Wrapper        │  │
│  │     - Fresh data will be cached for next 5 minutes                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Cache Strategy Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CACHE DECISION TREE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Request Received: What type of data is needed?                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  🚀 Critical Data Needed? (Credit costs, permissions, status)          │  │
│  │  YES → Check Critical Cache                                            │  │
│  │  │                                                                       │
│  │  │  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  │  │  Found in Cache?                                                  │  │
│  │  │  │  YES → Return immediately (<1ms)                                 │  │
│  │  │  │  NO → Return error (not configured)                              │  │
│  │  │  └───────────────────────────────────────────────────────────────────┘  │
│  │  │                                                                       │
│  │  │  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  │  │  Redis Message Received?                                         │  │
│  │  │  │  YES → Update Critical Cache immediately                         │  │
│  │  │  │  NO → Keep serving from cache                                    │  │
│  │  │  └───────────────────────────────────────────────────────────────────┘  │
│  │  │                                                                       │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  │  🔄 Reference Data Needed? (Profiles, hierarchy, historical)             │
│  │  YES → Check Reference Cache                                            │
│  │  │                                                                       │
│  │  │  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  │  │  Found & Valid?                                                   │  │
│  │  │  │  YES → Return cached data (1-5ms)                                │  │
│  │  │  │  NO → Fetch from Wrapper API (50-100ms)                         │  │
│  │  │  └───────────────────────────────────────────────────────────────────┘  │
│  │  │                                                                       │
│  │  │  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  │  │  Redis Message Received?                                         │  │
│  │  │  │  YES → Invalidate cache entry                                    │  │
│  │  │  │  NO → Keep cache with TTL                                        │  │
│  │  │  └───────────────────────────────────────────────────────────────────┘  │
│  │  │                                                                       │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                          │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Performance Metrics

### **Response Time Distribution:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESPONSE TIME DISTRIBUTION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🚀 Critical Data Requests (70% of traffic)                               │
│  • Cache Hit: <1ms (95% of critical requests)                              │
│  • Cache Miss: Error response (<1ms)                                       │
│  • Average: ~1ms                                                           │
│                                                                             │
│  🔄 Reference Data Requests (25% of traffic)                               │
│  • Cache Hit: 1-5ms (80% of reference requests)                            │
│  • Cache Miss: 50-100ms (20% of reference requests)                        │
│  • Average: ~15ms                                                          │
│                                                                             │
│  🌐 Wrapper API Calls (5% of traffic)                                      │
│  • Network latency: 50-100ms                                               │
│  • Processing time: 10-50ms                                                │
│  • Total: 60-150ms                                                         │
│                                                                             │
│  📊 Overall Average Response Time: ~8ms                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Cache Hit Rate Optimization:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CACHE HIT RATE TARGETS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Critical Cache Hit Rate: 100%                                             │
│  • All critical data should be cached                                     │
│  • Cache misses indicate configuration issues                             │
│  • Target: 99.9%+ hit rate                                                │
│                                                                             │
│  Reference Cache Hit Rate: 80%+                                            │
│  • Balance between freshness and performance                               │
│  • Higher hit rate = better performance                                   │
│  • Lower hit rate = more API calls                                        │
│                                                                             │
│  Overall Cache Hit Rate: 95%+                                              │
│  • 95% of requests served from cache                                      │
│  • 5% of requests require Wrapper API calls                                │
│  • Optimal balance of performance and consistency                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎉 Implementation Summary

### **Key Benefits:**

1. **🚀 Ultra-Fast Critical Operations**: Sub-millisecond response times
2. **🔄 Smart Reference Caching**: TTL-based with automatic refresh
3. **📡 Minimal Redis Traffic**: Only change notifications sent
4. **🌐 Efficient API Usage**: Only 5% of requests hit the Wrapper
5. **⚡ Optimal Performance**: 95%+ cache hit rates overall

### **Data Flow Efficiency:**

1. **Critical requests** → Instant cache lookup → Immediate response
2. **Reference requests** → Cache check → Fetch if needed → Cache result
3. **Redis messages** → Update critical cache → Invalidate reference cache
4. **Wrapper API** → Single source of truth → Fresh data on cache miss

**This architecture provides the perfect balance of speed, efficiency, and data consistency!** 🚀
