# 🏗️ CRM Data Architecture Decision Framework

## 🎯 Overview

This document provides a systematic framework for determining what data should be stored locally in your CRM application database versus what should be fetched from the wrapper system. The goal is to **eliminate data redundancy** while ensuring optimal performance, consistency, and compliance.

## 📊 **Key Recommendations Summary**

### **🏆 Data Storage Decisions:**

**STORE LOCALLY in CRM Database:**
- ✅ **Core CRM Data**: Contacts, deals, activities, notes, tasks, files, custom fields
- ✅ **Activity Logs**: Audit trails, compliance records
- ✅ **User Preferences**: UI settings, session state
- ✅ **Computed Analytics**: Reports, dashboards (calculated locally)

**FETCH FROM WRAPPER + CACHE:**
- 🔄 **Employee Profiles**: 1-hour cache for performance
- 🔄 **Organization Hierarchy**: 15-minute cache for permissions
- 🔄 **Tenant Configuration**: 24-hour cache for branding/features
- 🔄 **Roles**: 30-minute cache for UI workflows

**FETCH FROM WRAPPER (REAL-TIME):**
- ⚡ **Permissions**: Always fresh for security
- ⚡ **Billing Credits**: Real-time validation
- ⚡ **Authentication**: Live validation required

### **💾 Architecture Benefits:**
- **Zero Data Redundancy**: Single source of truth for cross-app data
- **Optimal Performance**: Fast local access + smart caching
- **Security Compliance**: Real-time permission validation
- **Scalability**: Efficient API usage and storage costs

---

## 📋 Phase 1: Data Discovery

### What Data is Available in the Wrapper System?

Based on analysis of the codebase, the wrapper system provides:

#### Core Entities
- **Tenants**: Organization-level data, configuration, branding, billing
- **Employees**: User profiles, roles, permissions, organization memberships
- **Organizations**: Hierarchical structure (tenant > sub-orgs > teams)
- **Permissions**: Granular access control, role-based permissions
- **Billing**: Credits, usage limits, subscriptions, invoices

#### API Endpoints Available
- `/api/tenants` - Tenant management and configuration
- `/api/employees` - Employee profiles and management
- `/api/organizations` - Organization hierarchy
- `/api/permissions` - Permission and role management
- `/api/billing` - Credit and billing operations
- `/auth/validate` - Token validation and user context


#### Data Characteristics
- **Update Frequency**: Real-time for permissions, daily for profiles, periodic for config
- **Data Volume**: Small-medium (profiles, permissions); variable (billing per tenant)
- **Relationships**: Complex hierarchical (org > employee > permissions)

## 📋 Phase 2: CRM Requirements Analysis

### What Does CRM Actually Need?

#### Critical Requirements (Cannot Function Without)
- **Employee Authentication**: Login, roles, basic permissions
- **Tenant Context**: Organization isolation, branding
- **Billing Validation**: Credit checks before operations
- **Organization Hierarchy**: Data isolation and access control

#### Important Requirements (User Experience)
- **Contact Management**: Customer data, interactions, deals
- **Activity Logging**: Audit trails, compliance tracking
- **User Preferences**: UI settings, filters, views
- **Performance**: Fast access to frequently used data

#### Nice-to-Have Requirements
- **Advanced Analytics**: Reporting, dashboards
- **File Attachments**: Document management
- **Custom Fields**: Flexible data structures

## 📋 Phase 3: Decision Framework Application

### Decision Matrix Criteria

Each data type is evaluated on a 1-5 scale:

- **Criticality**: How essential is this data? (5 = cannot function without)
- **Access Frequency**: How often accessed? (5 = every request)
- **Update Frequency**: How often does it change? (5 = real-time changes)
- **Data Volume**: How much data? (5 = very large datasets)
- **Relationships**: Query complexity? (5 = complex joins needed)
- **Compliance**: Audit/legal requirements? (5 = strict compliance needed)

**STORE LOCALLY**: Total score > 25 points
**FETCH FROM WRAPPER**: Total score < 20 points
**CACHE**: Score 20-25 points

---

## 🎯 SPECIFIC RECOMMENDATIONS

### 1. **CONTACT/CUSTOMER DATA**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 5/5 (Core CRM functionality)
- Access Frequency: 5/5 (Every page, every operation)
- Update Frequency: 3/5 (Changes with customer interactions)
- Data Volume: 4/5 (Can grow large per tenant)
- Relationships: 4/5 (Complex queries: contacts ↔ deals ↔ activities)
- Compliance: 5/5 (GDPR, audit trails required)
**Total Score: 26 → STORE LOCALLY**

**Implementation:**
```javascript
// Local CRM database schema
const ContactSchema = {
  id: "uuid primary key",
  tenantId: "foreign key to wrapper",
  firstName: "string",
  lastName: "string",
  email: "string unique",
  phone: "string",
  company: "string",
  createdBy: "employeeId from wrapper",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  customFields: "jsonb for flexibility"
};
```

### 2. **DEALS/OPPORTUNITIES**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 5/5 (Core CRM functionality)
- Access Frequency: 5/5 (Dashboard, reports, daily work)
- Update Frequency: 4/5 (Frequent status changes)
- Data Volume: 3/5 (Moderate per tenant)
- Relationships: 5/5 (Complex: deals → contacts → activities → employees)
- Compliance: 5/5 (Sales audit trails)
**Total Score: 27 → STORE LOCALLY**

### 3. **ACTIVITIES/INTERACTIONS**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 5/5 (Audit trail, compliance)
- Access Frequency: 4/5 (Timeline views, reports)
- Update Frequency: 5/5 (Every customer interaction)
- Data Volume: 5/5 (High volume, grows rapidly)
- Relationships: 4/5 (Linked to contacts, deals, employees)
- Compliance: 5/5 (GDPR, legal requirements)
**Total Score: 28 → STORE LOCALLY**

### 4. **NOTES/COMMENTS**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 4/5 (Important for context)
- Access Frequency: 4/5 (Viewing contact/deal details)
- Update Frequency: 4/5 (Added during interactions)
- Data Volume: 4/5 (Text data, can accumulate)
- Relationships: 3/5 (Belongs to contacts/deals)
- Compliance: 5/5 (Conversation records)
**Total Score: 24 → STORE LOCALLY**

### 5. **TASKS/REMINDERS**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 4/5 (Productivity tool)
- Access Frequency: 5/5 (Daily task management)
- Update Frequency: 4/5 (Status changes throughout day)
- Data Volume: 2/5 (Small records)
- Relationships: 4/5 (Assigned to employees, linked to deals)
- Compliance: 3/5 (Internal tracking)
**Total Score: 22 → STORE LOCALLY**

### 6. **FILES/DOCUMENTS**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 3/5 (Important for deals)
- Access Frequency: 3/5 (When needed)
- Update Frequency: 2/5 (Infrequent uploads)
- Data Volume: 5/5 (Large files, high storage cost)
- Relationships: 3/5 (Attached to contacts/deals)
- Compliance: 5/5 (Document retention laws)
**Total Score: 21 → STORE LOCALLY**

### 7. **CUSTOM FIELDS/METADATA**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 4/5 (Flexibility requirement)
- Access Frequency: 5/5 (Every form, every view)
- Update Frequency: 1/5 (Schema changes rare)
- Data Volume: 3/5 (Metadata, not large)
- Relationships: 4/5 (Extends base entities)
- Compliance: 4/5 (Data structure compliance)
**Total Score: 21 → STORE LOCALLY**

### 8. **ACTIVITY LOGS/AUDIT TRAILS**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 5/5 (Compliance, security)
- Access Frequency: 2/5 (Occasional reviews)
- Update Frequency: 5/5 (Every action logged)
- Data Volume: 5/5 (Massive accumulation)
- Relationships: 3/5 (Linked to users/actions)
- Compliance: 5/5 (Legal requirement)
**Total Score: 25 → STORE LOCALLY**

### 9. **USER PREFERENCES/SETTINGS**
**Decision: STORE LOCALLY**

**Reasoning:**
- Criticality: 3/5 (UX enhancement)
- Access Frequency: 5/5 (Every page load)
- Update Frequency: 1/5 (Rare changes)
- Data Volume: 1/5 (Small preference data)
- Relationships: 1/5 (Simple user-based)
- Compliance: 2/5 (Not critical)
**Total Score: 13 → FETCH FROM WRAPPER**

*Wait, this should be local for performance. Let me recalculate...*

Actually, user preferences should be **STORE LOCALLY** because:
- Access Frequency is 5/5 (every page load)
- Data Volume is 1/5 (very small)
- Update Frequency is 1/5 (rare)
- **Total Score: 18 → But access frequency makes it worth caching locally**

### 10. **EMPLOYEE PROFILES**
**Decision: FETCH FROM WRAPPER + CACHE**

**Reasoning:**
- Criticality: 4/5 (Need for personalization)
- Access Frequency: 4/5 (Headers, signatures)
- Update Frequency: 2/5 (Infrequent changes)
- Data Volume: 2/5 (Small profiles)
- Relationships: 2/5 (Simple lookups)
- Compliance: 3/5 (Standard HR data)
**Total Score: 17 → FETCH FROM WRAPPER + CACHE**

**Cache Strategy:** 1-hour TTL, lazy loading

### 11. **ORGANIZATION HIERARCHY**
**Decision: FETCH FROM WRAPPER + CACHE**

**Reasoning:**
- Criticality: 5/5 (Data isolation, permissions)
- Access Frequency: 5/5 (Every permission check)
- Update Frequency: 3/5 (Moderate changes)
- Data Volume: 2/5 (Manageable hierarchy)
- Relationships: 4/5 (Complex org structure)
- Compliance: 4/5 (Access control)
**Total Score: 23 → CACHE LOCALLY**

### 12. **ROLES**
**Decision: FETCH FROM WRAPPER + CACHE**

**Reasoning:**
- Criticality: 4/5 (Important for UI and workflows)
- Access Frequency: 4/5 (User interface, role-based features)
- Update Frequency: 2/5 (Changes with organizational changes)
- Data Volume: 1/5 (Small role definitions)
- Relationships: 3/5 (Users assigned to roles)
- Compliance: 4/5 (Access control auditing)
**Total Score: 18 → FETCH FROM WRAPPER + CACHE**

**Cache Strategy:** 30-minute TTL, invalidate on role changes

**Implementation:**
```javascript
// Cached role definitions
const roleCache = {
  'admin': { name: 'Administrator', permissions: ['*'] },
  'manager': { name: 'Manager', permissions: ['read', 'write', 'manage_team'] },
  'sales': { name: 'Sales Rep', permissions: ['read', 'write', 'manage_contacts'] },
  'viewer': { name: 'Viewer', permissions: ['read'] }
};
```

### 13. **PERMISSIONS**
**Decision: FETCH FROM WRAPPER (REAL-TIME)**

**Reasoning:**
- Criticality: 5/5 (Security critical - cannot allow unauthorized access)
- Access Frequency: 5/5 (Every API call, every UI action)
- Update Frequency: 4/5 (Can change anytime via admin actions)
- Data Volume: 2/5 (Permission matrices per user/org)
- Relationships: 4/5 (Complex: user → roles → permissions → resources)
- Compliance: 5/5 (Security requirement, audit trails)
**Total Score: 25 → STORE LOCALLY (with real-time sync)**

**Implementation:**
```javascript
// Permission checking service
class PermissionService {
  constructor(wrapperService) {
    this.wrapper = wrapperService;
    this.permissionCache = new Map();
  }

  // Real-time permission validation
  async canUserPerformAction(userId, orgId, action, resource) {
    // Always check with wrapper for latest permissions
    const permissions = await this.wrapper.getUserPermissions(userId, orgId);

    // Cache for short duration to reduce API calls
    this.permissionCache.set(`${userId}:${orgId}`, {
      permissions,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });

    return this.checkPermission(permissions, action, resource);
  }

  checkPermission(permissionSet, action, resource) {
    // Complex permission logic here
    return permissionSet.some(permission =>
      permission.action === action &&
      permission.resource === resource
    );
  }
}
```

### 14. **CREDIT CONFIGURATION**
**Decision: FETCH FROM WRAPPER + CACHE**

**Reasoning:**
- Criticality: 4/5 (Important for feature availability)
- Access Frequency: 3/5 (On feature usage, UI display)
- Update Frequency: 2/5 (Changes with plan upgrades/downgrades)
- Data Volume: 1/5 (Simple configuration objects)
- Relationships: 2/5 (Tenant-based configuration)
- Compliance: 3/5 (Billing accuracy requirements)
**Total Score: 15 → FETCH FROM WRAPPER + CACHE**

**Cache Strategy:** 1-hour TTL, real-time validation for critical operations

**Implementation:**
```javascript
// Credit configuration service
class CreditConfigService {
  constructor(wrapperService) {
    this.wrapper = wrapperService;
    this.configCache = new Map();
  }

  // Get credit configuration with caching
  async getCreditConfig(tenantId) {
    const cacheKey = `credit_config:${tenantId}`;
    const cached = this.configCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.config;
    }

    const config = await this.wrapper.getCreditConfiguration(tenantId);
    this.configCache.set(cacheKey, {
      config,
      timestamp: Date.now()
    });

    return config;
  }

  // Real-time credit validation (no caching for safety)
  async validateCreditUsage(tenantId, operationCost) {
    const currentCredits = await this.wrapper.getCurrentCredits(tenantId);
    const config = await this.getCreditConfig(tenantId);

    if (currentCredits < operationCost) {
      throw new Error('Insufficient credits');
    }

    if (config.dailyLimit && config.dailyUsage + operationCost > config.dailyLimit) {
      throw new Error('Daily credit limit exceeded');
    }

    return true;
  }
}

// Example credit configuration structure
const creditConfigSchema = {
  tenantId: "uuid",
  planType: "free|starter|professional|enterprise",
  monthlyLimit: 10000, // credits per month
  dailyLimit: 500,     // credits per day
  featureLimits: {
    contacts: 1000,    // max contacts
    deals: 500,        // max deals
    emails: 1000,      // max emails per month
    storage: "5GB"     // file storage limit
  },
  overageAllowed: false,
  pricing: {
    perContact: 0.10,
    perDeal: 0.50,
    perEmail: 0.05
  }
};
```

### 15. **BILLING CREDITS/USAGE**
**Decision: FETCH FROM WRAPPER (REAL-TIME)**

**Reasoning:**
- Criticality: 5/5 (Cannot exceed limits)
- Access Frequency: 5/5 (Before operations)
- Update Frequency: 5/5 (Real-time usage)
- Data Volume: 1/5 (Simple counters)
- Relationships: 1/5 (Tenant-based)
- Compliance: 4/5 (Billing accuracy)
**Total Score: 21 → CACHE LOCALLY with real-time validation**

### 16. **TENANT CONFIGURATION**
**Decision: FETCH FROM WRAPPER + CACHE**

**Reasoning:**
- Criticality: 4/5 (Branding, features)
- Access Frequency: 3/5 (On login, cached)
- Update Frequency: 1/5 (Rare config changes)
- Data Volume: 1/5 (Small config objects)
- Relationships: 1/5 (Simple tenant lookup)
- Compliance: 3/5 (Standard config)
**Total Score: 13 → FETCH FROM WRAPPER + CACHE**

**Cache Strategy:** 24-hour TTL, invalidate on login

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### Local Database Schema (PostgreSQL Recommended)

```sql
-- Core CRM Tables
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL, -- From wrapper
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  created_by UUID, -- Employee ID from wrapper
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  custom_fields JSONB
);

CREATE TABLE deals (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  title VARCHAR(255),
  value DECIMAL(10,2),
  stage VARCHAR(50),
  assigned_to UUID, -- Employee ID from wrapper
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  type VARCHAR(50), -- call, email, meeting, etc.
  description TEXT,
  created_by UUID, -- Employee ID from wrapper
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cache Tables for Wrapper Data
CREATE TABLE employee_cache (
  employee_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  profile JSONB,
  roles JSONB,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE permissions_cache (
  employee_id UUID,
  org_id UUID,
  permissions JSONB,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  PRIMARY KEY (employee_id, org_id)
);
```

### Wrapper Integration Layer

```javascript
// Wrapper data access service
class WrapperService {
  constructor() {
    this.baseUrl = process.env.WRAPPER_API_URL;
    this.cache = new RedisCache();
  }

  // Real-time validation (no cache)
  async validateCredits(tenantId, requiredCredits) {
    const response = await this.api.get(`/api/billing/credits/${tenantId}`);
    return response.available >= requiredCredits;
  }

  // Cached data with TTL
  async getEmployeeProfile(employeeId) {
    return this.cache.getOrFetch(
      `employee:${employeeId}`,
      () => this.api.get(`/api/employees/${employeeId}`),
      { ttl: 3600000 } // 1 hour
    );
  }

  async getOrganizationHierarchy(tenantId) {
    return this.cache.getOrFetch(
      `orgs:${tenantId}`,
      () => this.api.get(`/api/organizations/${tenantId}`),
      { ttl: 900000 } // 15 minutes
    );
  }
}
```

### Sync Strategy

```javascript
const syncConfiguration = {
  // Real-time (no caching)
  realtime: [
    'validatePermissions',
    'checkCredits',
    'authenticateUser'
  ],

  // Short-term cache
  shortCache: [
    { method: 'getEmployeeProfile', ttl: '1h' },
    { method: 'getOrgHierarchy', ttl: '15m' },
    { method: 'getTenantConfig', ttl: '1d' }
  ],

  // Long-term local storage
  localStorage: [
    'contacts',
    'deals',
    'activities',
    'notes',
    'tasks',
    'files',
    'auditLogs'
  ]
};
```

---

## 📞 QUESTIONS FOR WRAPPER TEAM

### Data Discovery
1. **Complete API Inventory**: What are all available endpoints and their schemas?
2. **Data Volumes**: How many records per tenant for employees, organizations, permissions?
3. **Update Patterns**: What triggers updates to employee profiles, permissions, org structure?
4. **Real-time Requirements**: Which data changes need immediate propagation?
5. **Retention Policies**: How long is historical data kept?

### Integration Requirements
6. **Authentication**: How does CRM authenticate with wrapper APIs?
7. **Rate Limits**: What are the API rate limits and throttling rules?
8. **Webhooks**: Are real-time webhooks available for data changes?
9. **Caching Headers**: Does wrapper provide cache-control headers?
10. **Error Handling**: What error codes should CRM expect and handle?

### Support & Operations
11. **SLA**: What's the API availability SLA?
12. **Monitoring**: How can CRM monitor wrapper API health?
13. **Testing**: Are there sandbox/test environments?
14. **Versioning**: How are API changes communicated?
15. **Support**: Who to contact for integration issues?

---

## 🧪 TESTING & VALIDATION

### Performance Benchmarks
- **Login Time**: < 2 seconds (with cached employee data)
- **Page Load**: < 500ms for permission-dependent content
- **API Response**: < 200ms for cached data, < 1s for wrapper calls
- **Offline Capability**: 30 minutes of operation with cached data

### Failure Scenarios
- **Wrapper Down**: Allow existing sessions, read-only mode
- **Network Issues**: Aggressive caching, offline queues
- **Data Inconsistency**: Version checking, conflict resolution
- **Rate Limiting**: Exponential backoff, request queuing

### Monitoring Requirements
- **API Latency**: Track wrapper API response times
- **Cache Hit Rates**: Monitor cache effectiveness
- **Error Rates**: Track wrapper API failures
- **Data Freshness**: Alert on stale cached data

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Set up local CRM database schema
- [ ] Implement wrapper API client
- [ ] Create basic authentication flow
- [ ] Set up caching layer

### Phase 2: Core CRM (Week 3-6)
- [ ] Implement contact management (local storage)
- [ ] Add deal/opportunity tracking (local storage)
- [ ] Build activity logging (local storage)
- [ ] Integrate permission validation (wrapper)

### Phase 3: Optimization (Week 7-8)
- [ ] Implement caching strategies
- [ ] Add offline capability
- [ ] Performance testing and optimization
- [ ] Error handling and monitoring

### Phase 4: Advanced Features (Week 9-12)
- [ ] Custom fields and flexibility
- [ ] Advanced reporting and analytics
- [ ] File attachments and documents
- [ ] Audit trails and compliance features

---

## ⚠️ IMPORTANT CONSIDERATIONS

### Data Consistency
- **Single Source of Truth**: Wrapper owns employee/org data
- **Cache Invalidation**: Proper cache clearing on data changes
- **Conflict Resolution**: Handle concurrent modifications
- **Version Control**: Track data versions for consistency

### Performance
- **Lazy Loading**: Load data only when needed
- **Background Sync**: Update caches in background
- **Pagination**: Handle large datasets efficiently
- **Compression**: Reduce network payload sizes

### Security
- **Token Management**: Secure wrapper API authentication
- **Data Isolation**: Ensure tenant data separation
- **Audit Logging**: Track all data access and changes
- **Encryption**: Encrypt sensitive cached data

### Scalability
- **Horizontal Scaling**: Design for multiple CRM instances
- **Cache Distribution**: Shared caching for multiple instances
- **Database Sharding**: Plan for data growth
- **API Optimization**: Minimize wrapper API calls

---

## 📊 SUCCESS METRICS

### User Experience
- **Login Speed**: < 2 seconds from authentication to dashboard
- **Page Performance**: < 500ms for data-heavy pages
- **Offline Capability**: Full functionality for 30+ minutes
- **Error Rate**: < 1% of operations fail due to wrapper issues

### Technical Metrics
- **Cache Hit Rate**: > 85% for frequently accessed data
- **API Latency**: < 200ms average for cached requests
- **Data Freshness**: < 5 minute lag for non-critical data
- **Uptime**: 99.9% availability despite wrapper dependencies

### Business Impact
- **User Adoption**: Increased CRM usage due to performance
- **Data Accuracy**: No duplicate or stale data issues
- **Compliance**: Full audit trails and data governance
- **Cost Efficiency**: Optimized API usage and storage costs

---

*This framework ensures your CRM makes data storage decisions based on evidence, not assumptions. Regular review and adjustment based on real usage patterns is recommended.*
