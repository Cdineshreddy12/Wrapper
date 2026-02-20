import type { UserContext, LegacyUser, RequestAnalysis } from './common.js';
import type { Sql } from 'postgres';

declare module 'fastify' {
  interface FastifyInstance {
    db?: Sql | null;
  }
  interface FastifyRequest {
    userContext: UserContext;
    user: LegacyUser;
    rawBody?: Buffer | string;
    db: Sql | null;
    requestAnalysis?: RequestAnalysis;
    activityContext?: { startTime: number; method: string; url: string; userAgent?: string; ipAddress?: string; sessionId?: string };
    pendingActivity?: { userId: string; tenantId: string; action: string; appId: string | null; metadata: Record<string, unknown>; requestContext: unknown };
    auditContext?: { tenantId: string; userId: string; resourceType: string; resourceId?: string; requestContext: unknown; captureChanges?: boolean };
    userAccessScope?: unknown;
    cacheMetrics?: unknown;
    subscription?: { plan: string; [k: string]: unknown };
    entityScope?: { scope: string; entityIds: string[]; isUnrestricted?: boolean; [k: string]: unknown };
    applicationContext?: { application: string; permissions: number; accessibleOrganizations?: string[]; accessibleLocations?: string[]; scope?: unknown };
    isolationContext?: { tenantId: string; application: string; userId: string; organizations: string[]; locations: string[]; permissions: number };
    crossAppSharing?: { sourceApp: string; targetApp: string; dataType?: string; dataId?: string; approved: boolean };
    filterByApplication?: (data: unknown, dataType?: string) => Promise<unknown>;
    canAccessInApplication?: (dataType: string, dataId: string) => Promise<boolean>;
    usageStartTime?: number;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: LegacyUser;
  }
}

declare global {
  var rlsService: unknown;
  function logToES(level: string, message: string, data?: Record<string, unknown>): void;
}

export {};
