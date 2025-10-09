/**
 * CRM Data Architecture Analysis - Phase 1: Data Discovery
 * Comprehensive inventory of ALL data available in the wrapper system
 */

const wrapperDataDiscovery = {
  // ============================================================================
  // AUTHENTICATION & USER MANAGEMENT (KINDE INTEGRATION)
  // ============================================================================
  authentication: {
    provider: "Kinde",
    endpoints: [
      "/oauth2/user_profile",
      "/oauth2/introspect",
      "/oauth2/token"
    ],
    dataFields: {
      user: [
        "id", "email", "name", "given_name", "family_name", "picture",
        "org_code", "org_codes", "sub", "preferred_email"
      ],
      organizations: [
        "org_code", "org_codes", "organization_code"
      ],
      token: [
        "access_token", "refresh_token", "expires_in", "token_type"
      ]
    },
    updateFrequency: "Real-time (per request)",
    dataVolume: "Per user session",
    relationships: ["Users belong to organizations"],
    currentUsage: "Every API request authentication"
  },

  // ============================================================================
  // TENANT MANAGEMENT (LOCAL DATABASE)
  // ============================================================================
  tenants: {
    provider: "Local PostgreSQL",
    table: "tenants",
    endpoints: [
      "GET /api/tenants/",
      "GET /api/tenants/current",
      "PUT /api/tenants/current/settings",
      "GET /api/tenants/current/users",
      "GET /api/tenants/usage"
    ],
    dataFields: {
      basic: [
        "tenantId", "companyName", "subdomain", "kindeOrgId", "adminEmail"
      ],
      profile: [
        "legalCompanyName", "gstin", "companyType", "industry", "website",
        "billingStreet", "billingCity", "billingState", "billingZip", "billingCountry", "phone"
      ],
      localization: [
        "defaultLanguage", "defaultLocale", "defaultCurrency", "defaultTimeZone"
      ],
      branding: [
        "logoUrl", "primaryColor", "customDomain", "brandingConfig"
      ],
      status: [
        "isActive", "isVerified", "settings", "onboardingCompleted", "onboardedAt"
      ],
      billing: [
        "stripeCustomerId", "trialEndsAt", "trialStartedAt"
      ],
      activity: [
        "firstLoginAt", "lastActivityAt"
      ]
    },
    updateFrequency: "Infrequent (user-driven changes)",
    dataVolume: "~1 record per tenant",
    relationships: ["Has many users", "Has many sub-organizations"],
    currentUsage: "Tenant settings, branding, basic info"
  },

  // ============================================================================
  // USER MANAGEMENT (LOCAL DATABASE + KINDE SYNC)
  // ============================================================================
  users: {
    provider: "Local PostgreSQL + Kinde Sync",
    table: "tenant_users",
    endpoints: [
      "GET /api/users/me",
      "PUT /api/users/me",
      "GET /api/users/me/activity",
      "GET /api/users/me/permissions",
      "POST /api/users/me/complete-onboarding"
    ],
    dataFields: {
      identity: [
        "userId", "kindeUserId", "tenantId", "email", "name",
        "firstName", "lastName", "username", "avatar", "title", "department"
      ],
      profile: [
        "alias", "phone", "mobile", "profileData"
      ],
      organization: [
        "primaryOrganizationId", "isResponsiblePerson", "adminPrivileges"
      ],
      status: [
        "isActive", "isVerified", "isTenantAdmin"
      ],
      activity: [
        "lastActiveAt", "lastLoginAt", "loginCount"
      ],
      preferences: [
        "preferences", "onboardingCompleted", "onboardingStep"
      ]
    },
    updateFrequency: "Mixed (login activity frequent, profile changes infrequent)",
    dataVolume: "~10-1000 records per tenant",
    relationships: ["Belongs to tenant", "Has many role assignments", "Has activity logs"],
    currentUsage: "User profiles, authentication, permissions"
  },

  // ============================================================================
  // ORGANIZATION HIERARCHY (LOCAL DATABASE)
  // ============================================================================
  organizations: {
    provider: "Local PostgreSQL",
    table: "unified_entities",
    endpoints: [
      "POST /api/organizations/parent",
      "POST /api/organizations/sub",
      "GET /api/organizations/:organizationId",
      "GET /api/organizations/:organizationId/sub-organizations",
      "GET /api/organizations/parent/:tenantId",
      "GET /api/organizations/hierarchy/current",
      "GET /api/organizations/hierarchy/:tenantId",
      "PUT /api/organizations/:organizationId",
      "GET /api/organizations/:organizationId/locations"
    ],
    dataFields: {
      hierarchy: [
        "entityId", "tenantId", "entityType", "entityName", "level",
        "parentEntityId", "path", "isActive"
      ],
      metadata: [
        "description", "config", "createdAt", "updatedAt"
      ]
    },
    updateFrequency: "Moderate (organizational changes)",
    dataVolume: "~5-50 records per tenant",
    relationships: ["Hierarchical parent-child relationships", "Contains users"],
    currentUsage: "Organization structure, data isolation"
  },

  // ============================================================================
  // PERMISSIONS & ROLES (LOCAL DATABASE)
  // ============================================================================
  permissions: {
    provider: "Local PostgreSQL",
    endpoints: [
      "GET /api/permissions/available",
      "GET /api/permissions/applications",
      "GET /api/permissions/users",
      "GET /api/permissions/users/:userId/permissions",
      "POST /api/permissions/bulk-assign",
      "DELETE /api/permissions/users/:userId/permissions",
      "GET /api/permissions/templates",
      "GET /api/permissions/roles",
      "PUT /api/permissions/roles/:roleId",
      "DELETE /api/permissions/roles/:roleId",
      "GET /api/permissions/assignments",
      "POST /api/permissions/assignments",
      "DELETE /api/permissions/assignments/:assignmentId",
      "GET /api/permissions/audit",
      "POST /api/permissions/check",
      "GET /api/permissions/user/:userId/effective",
      "POST /api/permissions/assignments/bulk",
      "GET /api/permissions/summary"
    ],
    dataFields: {
      roles: [
        "roleId", "tenantId", "organizationId", "locationId", "scope",
        "roleName", "description", "color", "kindeRoleId", "kindeRoleKey",
        "permissions", "restrictions", "isSystemRole", "isDefault", "priority"
      ],
      assignments: [
        "id", "userId", "roleId", "organizationId", "locationId", "scope",
        "isResponsiblePerson", "assignedBy", "assignedAt", "isTemporary", "expiresAt",
        "isActive", "deactivatedAt", "deactivatedBy"
      ],
      inheritance: [
        "isInheritable", "parentRoleId", "inheritedFrom"
      ]
    },
    updateFrequency: "High (permission checks on every operation)",
    dataVolume: "~10-100 roles per tenant, ~1-10 assignments per user",
    relationships: ["Users have role assignments", "Roles have permissions", "Hierarchical inheritance"],
    currentUsage: "Access control, feature gating"
  },

  // ============================================================================
  // ACTIVITY LOGGING & AUDIT (LOCAL DATABASE)
  // ============================================================================
  activity: {
    provider: "Local PostgreSQL",
    table: "audit_logs",
    endpoints: [
      "GET /api/activity/user",
      "GET /api/activity/audit",
      "GET /api/activity/stats",
      "GET /api/activity/user/:userId/summary",
      "POST /api/activity/export",
      "GET /api/activity/types"
    ],
    dataFields: {
      audit: [
        "logId", "tenantId", "userId", "organizationId", "locationId",
        "entityType", "accessLevel", "action", "resourceType", "resourceId",
        "oldValues", "newValues", "details", "ipAddress", "userAgent", "createdAt"
      ],
      activityTypes: [
        "auth.login", "auth.logout", "user.created", "user.updated", "user.deleted",
        "role.assigned", "permission.granted", "app.accessed", "data.export",
        "security.breach_attempt", "tenant.viewed", "billing.payment_success"
      ],
      resourceTypes: [
        "user", "role", "permission", "application", "tenant", "subscription",
        "payment", "system", "session", "invitation"
      ]
    },
    updateFrequency: "Very High (every user action)",
    dataVolume: "~100-1000 logs per user per month",
    relationships: ["Linked to users, resources, tenants"],
    currentUsage: "Audit trails, compliance, activity monitoring"
  },

  // ============================================================================
  // BILLING & SUBSCRIPTIONS (LOCAL DATABASE)
  // ============================================================================
  billing: {
    provider: "Local PostgreSQL + Stripe",
    endpoints: [
      // Credits and usage endpoints would be here
    ],
    dataFields: {
      credits: [
        "tenantId", "availableCredits", "usedCredits", "creditLimit",
        "resetDate", "lastUpdated"
      ],
      subscriptions: [
        "subscriptionId", "tenantId", "stripeSubscriptionId", "planId",
        "status", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd"
      ],
      payments: [
        "paymentId", "tenantId", "stripePaymentIntentId", "amount", "currency",
        "status", "createdAt", "invoiceUrl"
      ]
    },
    updateFrequency: "Real-time (credit usage), Periodic (billing cycles)",
    dataVolume: "~1 subscription per tenant, ~1-12 invoices per year",
    relationships: ["Tenant billing history, credit consumption"],
    currentUsage: "Credit validation, billing management"
  },

  // ============================================================================
  // USER SESSIONS (LOCAL DATABASE)
  // ============================================================================
  sessions: {
    provider: "Local PostgreSQL",
    table: "user_sessions",
    dataFields: {
      session: [
        "sessionId", "userId", "tenantId", "sessionToken", "ipAddress",
        "userAgent", "loginAt", "lastActivityAt", "expiresAt", "isActive"
      ]
    },
    updateFrequency: "High (every request)",
    dataVolume: "~1-5 active sessions per user",
    relationships: ["Belongs to user and tenant"],
    currentUsage: "Session management, activity tracking"
  },

  // ============================================================================
  // INVITATIONS (LOCAL DATABASE)
  // ============================================================================
  invitations: {
    provider: "Local PostgreSQL",
    table: "tenant_invitations",
    endpoints: [
      "POST /api/invitations/create",
      "POST /api/invitations/create-multi-entity",
      "POST /api/invitations/accept",
      "GET /api/tenants/current/invitations",
      "DELETE /api/tenants/current/invitations/:invitationId"
    ],
    dataFields: {
      invitation: [
        "invitationId", "tenantId", "email", "invitedBy", "invitationToken",
        "invitationUrl", "status", "expiresAt", "acceptedAt", "cancelledAt",
        "targetEntities", "invitationScope", "primaryEntityId"
      ]
    },
    updateFrequency: "Low (invitation lifecycle)",
    dataVolume: "~1-10 pending invitations per tenant",
    relationships: ["Creates new users", "Belongs to tenant"],
    currentUsage: "Team member onboarding"
  }
};

// ============================================================================
// CURRENT USAGE PATTERNS ANALYSIS
// ============================================================================
const currentUsagePatterns = {
  authentication: {
    dataSource: "Kinde",
    accessPattern: "Every API request",
    frequency: "Per request (~10-100 requests per user session)",
    latencyRequirement: "Very fast (<500ms)",
    failureImpact: "Complete system inaccessibility"
  },

  userProfiles: {
    dataSource: "Local PostgreSQL",
    accessPattern: "On login + cached",
    frequency: "1-5 times per session",
    latencyRequirement: "Fast (<1s)",
    failureImpact: "Personalization loss, minor functionality impact"
  },

  permissions: {
    dataSource: "Local PostgreSQL",
    accessPattern: "Every operation",
    frequency: "5-50 times per user action",
    latencyRequirement: "Very fast (<200ms)",
    failureImpact: "Access denied errors, major functionality impact"
  },

  activityLogging: {
    dataSource: "Local PostgreSQL",
    accessPattern: "Every user action + periodic retrieval",
    frequency: "Write: every action, Read: on demand",
    latencyRequirement: "Write: async, Read: acceptable (<2s)",
    failureImpact: "Audit trail gaps, compliance issues"
  },

  tenantConfig: {
    dataSource: "Local PostgreSQL",
    accessPattern: "On login + cached",
    frequency: "1-3 times per session",
    latencyRequirement: "Fast (<1s)",
    failureImpact: "Branding/UI issues, minor impact"
  },

  organizationHierarchy: {
    dataSource: "Local PostgreSQL",
    accessPattern: "Frequent for data isolation",
    frequency: "Multiple times per session",
    latencyRequirement: "Fast (<500ms)",
    failureImpact: "Data isolation failures, security issues"
  }
};

// ============================================================================
// DATA VOLUME ESTIMATES
// ============================================================================
const dataVolumeEstimates = {
  tenants: "~100-1000 total tenants",
  users: "~10-1000 users per tenant",
  organizations: "~5-50 organizations per tenant",
  roles: "~5-20 roles per tenant",
  roleAssignments: "~1-5 assignments per user",
  activityLogs: "~50-500 logs per user per month",
  sessions: "~1-10 active sessions per user",
  invitations: "~1-20 pending invitations per tenant"
};

// ============================================================================
// PERFORMANCE & SCALABILITY METRICS
// ============================================================================
const performanceMetrics = {
  authentication: {
    targetLatency: "<500ms",
    currentLatency: "~200-400ms",
    scalability: "High (stateless, cacheable)"
  },

  permissionChecks: {
    targetLatency: "<200ms",
    currentLatency: "~50-150ms",
    scalability: "Medium (database queries, cacheable)"
  },

  activityLogging: {
    targetLatency: "Async (non-blocking)",
    currentLatency: "~10-50ms",
    scalability: "High (async writes, indexed queries)"
  },

  userProfileLoads: {
    targetLatency: "<1s",
    currentLatency: "~200-500ms",
    scalability: "High (cached, indexed)"
  }
};

module.exports = {
  wrapperDataDiscovery,
  currentUsagePatterns,
  dataVolumeEstimates,
  performanceMetrics
};
