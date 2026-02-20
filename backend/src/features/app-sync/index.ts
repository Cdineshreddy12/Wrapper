/**
 * App Sync Feature
 * Provides data synchronization endpoints for any downstream application
 * (CRM, HR, Affiliate, Accounting, Inventory) to pull tenant, user, role,
 * credit, and entity data from the Wrapper platform.
 */

export { default as appSyncRoutes } from './routes/sync-routes.js';
export { WrapperSyncService } from './services/sync-service.js';
