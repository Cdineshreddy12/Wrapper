/**
 * CRM Data Architecture Analysis - Phase 2: CRM Requirements Analysis
 * What does your CRM actually need to function?
 */

const crmRequirements = {
  // ============================================================================
  // CRITICAL REQUIREMENTS (Cannot function without)
  // ============================================================================
  critical: {
    authentication: {
      description: "User login, session management, identity verification",
      requiredData: [
        "userId", "email", "name", "tenantId", "org_code",
        "isTenantAdmin", "isActive", "isVerified"
      ],
      dataSources: ["Kinde (real-time)", "Local DB (cached profile)"],
      failureImpact: "Complete system inaccessibility",
      rationale: "Without authentication, no CRM functionality is possible"
    },

    permissions: {
      description: "Access control, feature gating, data isolation",
      requiredData: [
        "user permissions", "role assignments", "organization hierarchy",
        "entity access levels", "resource restrictions"
      ],
      dataSources: ["Local DB (real-time checks)"],
      failureImpact: "Security breaches, unauthorized access",
      rationale: "Security is non-negotiable for multi-tenant CRM"
    },

    tenantIsolation: {
      description: "Data separation between tenants, tenant context",
      requiredData: [
        "tenantId", "organization structure", "user memberships",
        "data access boundaries"
      ],
      dataSources: ["Local DB (real-time)"],
      failureImpact: "Data leakage between tenants",
      rationale: "Multi-tenant isolation is core to the business model"
    }
  },

  // ============================================================================
  // IMPORTANT REQUIREMENTS (Major UX/functionality impact)
  // ============================================================================
  important: {
    userProfiles: {
      description: "User information display, personalization, contact details",
      requiredData: [
        "name", "email", "avatar", "title", "department",
        "phone", "preferences", "lastActiveAt"
      ],
      dataSources: ["Local DB (primary)", "Kinde (fallback)"],
      failureImpact: "Poor user experience, contact info unavailable",
      rationale: "User profiles are central to CRM user experience"
    },

    activityLogging: {
      description: "Audit trails, compliance, activity monitoring",
      requiredData: [
        "user actions", "resource changes", "access logs",
        "compliance records", "security events"
      ],
      dataSources: ["Local DB (primary)"],
      failureImpact: "Compliance violations, audit gaps",
      rationale: "Required for business compliance and security monitoring"
    },

    organizationStructure: {
      description: "Hierarchical organization display, navigation",
      requiredData: [
        "organization hierarchy", "entity relationships",
        "user placements", "reporting structures"
      ],
      dataSources: ["Local DB (real-time)"],
      failureImpact: "Navigation confusion, incorrect reporting",
      rationale: "Organization structure drives CRM navigation and data organization"
    }
  },

  // ============================================================================
  // NICE-TO-HAVE REQUIREMENTS (Enhancements, not critical)
  // ============================================================================
  niceToHave: {
    advancedPermissions: {
      description: "Granular access controls, temporary permissions",
      requiredData: [
        "permission inheritance", "temporary roles",
        "conditional access", "advanced restrictions"
      ],
      dataSources: ["Local DB (optional)"],
      failureImpact: "Limited flexibility in access control",
      rationale: "Advanced permissions enhance security but aren't required for basic operation"
    },

    usageAnalytics: {
      description: "Usage reporting, dashboard metrics, billing analytics",
      requiredData: [
        "activity summaries", "usage statistics",
        "performance metrics", "billing data"
      ],
      dataSources: ["Local DB (aggregated)"],
      failureImpact: "Limited reporting capabilities",
      rationale: "Analytics are valuable but not required for core CRM functionality"
    },

    realTimeUpdates: {
      description: "Live notifications, real-time data sync",
      requiredData: [
        "websocket connections", "change notifications",
        "live updates", "collaborative features"
      ],
      dataSources: ["External services (optional)"],
      failureImpact: "Delayed information updates",
      rationale: "Real-time features enhance UX but aren't core requirements"
    }
  }
};

// ============================================================================
// DATA ACCESS PATTERNS ANALYSIS
// ============================================================================
const accessPatterns = {
  // ============================================================================
  // AUTHENTICATION FLOW
  // ============================================================================
  loginFlow: {
    description: "User authentication and initial session setup",
    steps: [
      {
        step: "Token validation",
        data: ["Kinde access token"],
        source: "Kinde API",
        frequency: "Once per login",
        latency: "Must be <2s",
        volume: "Small payload"
      },
      {
        step: "User profile fetch",
        data: ["user profile", "roles", "permissions"],
        source: "Local DB",
        frequency: "Once per login",
        latency: "Must be <1s",
        volume: "Medium payload"
      },
      {
        step: "Tenant context",
        data: ["tenant settings", "organization structure"],
        source: "Local DB",
        frequency: "Once per login",
        latency: "Must be <500ms",
        volume: "Small payload"
      }
    ],
    totalLatency: "<3.5s target",
    failureHandling: "Block login, show error"
  },

  // ============================================================================
  // PAGE NAVIGATION
  // ============================================================================
  pageNavigation: {
    description: "Loading pages with permission-dependent content",
    steps: [
      {
        step: "Permission check",
        data: ["user permissions", "entity access"],
        source: "Local DB",
        frequency: "Every page load",
        latency: "Must be <200ms",
        volume: "Small payload"
      },
      {
        step: "Content filtering",
        data: ["accessible records", "filtered data"],
        source: "Local DB",
        frequency: "Every data load",
        latency: "Must be <500ms",
        volume: "Variable payload"
      },
      {
        step: "UI state",
        data: ["user preferences", "last viewed"],
        source: "Local DB",
        frequency: "Per component",
        latency: "Must be <100ms",
        volume: "Small payload"
      }
    ],
    totalLatency: "<800ms target",
    failureHandling: "Show loading error, retry option"
  },

  // ============================================================================
  // DATA OPERATIONS
  // ============================================================================
  dataOperations: {
    description: "CRUD operations on CRM data",
    steps: [
      {
        step: "Pre-operation validation",
        data: ["permissions", "business rules"],
        source: "Local DB",
        frequency: "Every operation",
        latency: "Must be <100ms",
        volume: "Small payload"
      },
      {
        step: "Data modification",
        data: ["CRM records", "relationships"],
        source: "Local DB",
        frequency: "Per user action",
        latency: "Must be <500ms",
        volume: "Variable payload"
      },
      {
        step: "Activity logging",
        data: ["audit trail", "change tracking"],
        source: "Local DB",
        frequency: "Every operation",
        latency: "Async (non-blocking)",
        volume: "Small payload"
      }
    ],
    totalLatency: "<600ms target",
    failureHandling: "Rollback transaction, show error"
  },

  // ============================================================================
  // REPORTING & ANALYTICS
  // ============================================================================
  reporting: {
    description: "Generating reports and analytics",
    steps: [
      {
        step: "Access validation",
        data: ["reporting permissions"],
        source: "Local DB",
        frequency: "Per report request",
        latency: "Must be <200ms",
        volume: "Small payload"
      },
      {
        step: "Data aggregation",
        data: ["activity logs", "usage metrics"],
        source: "Local DB",
        frequency: "On demand",
        latency: "Acceptable <5s",
        volume: "Large payload"
      },
      {
        step: "Report generation",
        data: ["computed results", "export data"],
        source: "Local processing",
        frequency: "On demand",
        latency: "Acceptable <10s",
        volume: "Variable payload"
      }
    ],
    totalLatency: "<15s target (background processing)",
    failureHandling: "Show partial results, retry option"
  },

  // ============================================================================
  // BACKGROUND OPERATIONS
  // ============================================================================
  backgroundOperations: {
    description: "Automated tasks, sync operations, cleanup",
    steps: [
      {
        step: "Data synchronization",
        data: ["user profiles", "permissions"],
        source: "Kinde → Local DB",
        frequency: "Periodic (hourly)",
        latency: "Async (minutes)",
        volume: "Batch processing"
      },
      {
        step: "Cache invalidation",
        data: ["expired cache entries"],
        source: "Local cache",
        frequency: "Periodic (minutes)",
        latency: "Async",
        volume: "Small operations"
      },
      {
        step: "Log rotation",
        data: ["old activity logs"],
        source: "Local DB",
        frequency: "Daily/weekly",
        latency: "Async",
        volume: "Batch operations"
      }
    ],
    totalLatency: "Non-critical (background)",
    failureHandling: "Retry with backoff, alert monitoring"
  }
};

// ============================================================================
// FAILURE SCENARIOS & MITIGATION
// ============================================================================
const failureScenarios = {
  kindeDown: {
    impact: "New user authentication fails",
    affectedOperations: ["Login", "New user registration"],
    mitigationStrategies: [
      "Allow existing sessions to continue",
      "Use cached user data for known users",
      "Show maintenance message for new logins"
    ],
    recoveryTime: "Until Kinde service restored",
    userImpact: "High (blocks new users)"
  },

  databaseDown: {
    impact: "Most CRM operations fail",
    affectedOperations: ["All data operations", "Permission checks", "Activity logging"],
    mitigationStrategies: [
      "Read-only mode with cached data",
      "Offline operation for basic functions",
      "Queue operations for when DB recovers"
    ],
    recoveryTime: "Until database restored",
    userImpact: "Critical (most functions unavailable)"
  },

  networkIssues: {
    impact: "Slow performance, timeouts",
    affectedOperations: ["All operations"],
    mitigationStrategies: [
      "Aggressive caching",
      "Offline operation modes",
      "Progressive loading",
      "Retry with backoff"
    ],
    recoveryTime: "Until network stable",
    userImpact: "Medium (degraded performance)"
  },

  permissionSystemFailure: {
    impact: "Access control fails",
    affectedOperations: ["All secured operations"],
    mitigationStrategies: [
      "Fail-closed (deny access)",
      "Emergency admin access",
      "Read-only mode"
    ],
    recoveryTime: "Until permission system restored",
    userImpact: "High (security risk)"
  }
};

// ============================================================================
// PERFORMANCE TARGETS
// ============================================================================
const performanceTargets = {
  authentication: {
    loginTime: "<2s (95th percentile)",
    tokenValidation: "<500ms",
    profileLoad: "<500ms",
    sessionSetup: "<200ms"
  },

  dataOperations: {
    permissionCheck: "<100ms",
    recordLoad: "<300ms",
    recordSave: "<500ms",
    searchQuery: "<1s"
  },

  pageLoads: {
    dashboard: "<1s",
    dataTables: "<2s",
    reports: "<5s (background processing)"
  },

  apiResponseTimes: {
    fastOperations: "<200ms (permission checks)",
    normalOperations: "<500ms (CRUD)",
    slowOperations: "<2s (complex queries)",
    backgroundOperations: "<30s (reports, exports)"
  }
};

// ============================================================================
// SCALABILITY REQUIREMENTS
// ============================================================================
const scalabilityRequirements = {
  concurrentUsers: {
    target: "1000+ simultaneous users",
    peakLoad: "5000+ during business hours",
    geographicDistribution: "Global (multiple regions)"
  },

  dataVolume: {
    activityLogs: "50MB-500MB per tenant per year",
    userProfiles: "1MB-10MB per tenant",
    permissions: "100KB-1MB per tenant",
    totalDatabase: "1GB-10GB per tenant (5 year retention)"
  },

  apiLoad: {
    requestsPerSecond: "100-1000 RPS per tenant",
    peakRequestsPerSecond: "5000 RPS system-wide",
    averagePayloadSize: "1KB-100KB per request"
  },

  cachingStrategy: {
    userSessions: "In-memory (Redis)",
    permissions: "In-memory with TTL",
    tenantConfig: "Database with caching layer",
    activityLogs: "Database with indexing"
  }
};

module.exports = {
  crmRequirements,
  accessPatterns,
  failureScenarios,
  performanceTargets,
  scalabilityRequirements
};
