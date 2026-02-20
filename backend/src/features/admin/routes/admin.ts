/**
 * Admin Routes — Registrar
 *
 * Thin wrapper that registers all admin sub-route plugins.
 * Actual route logic lives in the split modules:
 *   - admin-org-routes.ts    (auth/context, organizations)
 *   - admin-trial-routes.ts  (trial management)
 *   - admin-user-routes.ts   (user CRUD, invitations, org memberships)
 *   - admin-tenant-routes.ts (tenant settings, onboarding, deletion)
 *   - admin-role-routes.ts   (role CRUD, audit logs)
 */

import type { FastifyInstance } from 'fastify';
import adminOrgRoutes from './admin-org-routes.js';
import adminTrialRoutes from './admin-trial-routes.js';
import adminUserRoutes from './admin-user-routes.js';
import adminTenantRoutes from './admin-tenant-routes.js';
import adminRoleRoutes from './admin-role-routes.js';

export default async function adminRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {
  fastify.register(adminOrgRoutes);
  fastify.register(adminTrialRoutes);
  fastify.register(adminUserRoutes);
  fastify.register(adminTenantRoutes);
  fastify.register(adminRoleRoutes);
}
