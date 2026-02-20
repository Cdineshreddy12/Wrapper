# App Sync Feature

Exposes sync and read-only APIs so downstream applications (CRM, HR, Affiliate, Accounting, Inventory) can pull tenant, user, role, credit, and entity data from the Wrapper platform. Accepts both Kinde tokens and service JWTs for authentication.

## Directory Structure

```
app-sync/
├── index.ts              # Feature exports
├── routes/
│   └── sync-routes.ts    # All sync and data-pull endpoints
└── services/
    └── sync-service.ts   # WrapperSyncService – sync orchestration and data retrieval
```

## Endpoints (`/api/sync`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/tenants/:tenantId/sync` | Trigger full tenant data sync (essential + reference + validation) |
| GET | `/tenants/:tenantId/sync/status` | Sync status for a tenant (lastSync, isComplete, dataCounts) |
| GET | `/data-requirements` | Data-requirements spec for CRM integration (no auth) |
| GET | `/tenants/:tenantId` | Basic tenant info (name, status, settings, organization) |
| GET | `/tenants/:tenantId/users` | User profiles in CRM shape (paginated) |
| GET | `/tenants/:tenantId/organizations` | Organizations/entities in CRM shape (paginated) |
| GET | `/tenants/:tenantId/tenant-users` | Detailed tenant users (admin, onboarding, profile) (paginated) |
| GET | `/tenants/:tenantId/roles` | Role definitions, optional `appCode` filter (paginated) |
| GET | `/tenants/:tenantId/credit-configs` | Credit configs for tenant by app (tenant + global) |
| GET | `/credit-configs/global` | Global-only credit configs for an app |
| GET | `/tenants/:tenantId/credit-configs/tenant-specific` | Tenant-only credit config overrides |
| GET | `/tenants/:tenantId/entity-credits` | Entity credit allocations/usage by app (paginated) |
| GET | `/tenants/:tenantId/employee-assignments` | User–organization assignments in CRM format (paginated) |
| GET | `/tenants/:tenantId/role-assignments` | User–role assignments in CRM format (paginated) |

> `:tenantId` can be the Wrapper tenant UUID or Kinde organization ID.

## Services

| Service | Description |
|---------|-------------|
| **WrapperSyncService** | Orchestrates tenant data sync in three phases: essential data (tenant, users, organizations), reference data (tenant users, credit configs, entity credits, employee/role assignments), and validation. Provides sync status and data-requirements spec. |
