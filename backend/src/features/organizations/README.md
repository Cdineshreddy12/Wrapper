# Organizations Feature

Parent/sub-organization and location management using a unified entities model, invitations, entity-scope/responsible-person APIs, and organization-assignment event publishing to Amazon MQ.

## Directory Structure

```
organizations/
├── index.ts                                  # Feature exports
├── routes/
│   ├── organizations.ts                      # Organization CRUD and hierarchy
│   ├── entities.ts                           # Unified entity endpoints
│   ├── entity-scope.ts                       # User entity scope and responsible persons
│   ├── locations.ts                          # Location CRUD and analytics
│   └── invitations.ts                        # Invitation management
└── services/
    ├── organization-service.ts               # Organization CRUD, hierarchy, bulk ops
    ├── location-service.ts                   # Location CRUD and hierarchy
    └── organization-assignment-service.ts    # Org-assignment event publishing
```

## Endpoints

### Organizations (`/api/organizations`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:organizationId` | Get organization details and hierarchy info |
| GET | `/:organizationId/sub-organizations` | List sub-organizations for a parent |
| GET | `/:organizationId/locations` | List locations for an organization |
| GET | `/parent/:tenantId` | Get parent organization for a tenant |
| GET | `/hierarchy/current` | Full organization hierarchy for current tenant |
| GET | `/hierarchy/:tenantId` | Full organization hierarchy for a tenant |
| POST | `/parent` | Create a parent organization (one per tenant) |
| POST | `/sub` | Create a sub-organization under a parent |
| POST | `/bulk` | Bulk create organizations |
| PUT | `/:organizationId` | Update organization details |
| PUT | `/bulk` | Bulk update organizations |
| PATCH | `/:organizationId/move` | Move organization to a new parent |
| DELETE | `/:organizationId` | Soft-delete organization |
| DELETE | `/bulk` | Bulk delete organizations |

### Entities (`/api/entities`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hierarchy/:tenantId` | Full entity hierarchy including locations |
| GET | `/parent/:parentEntityId` | Parent entity and all descendants (tree) |
| GET | `/tenant/:tenantId` | Tenant entities, optional `entityType` filter |
| POST | `/organization` | Create organization entity |
| POST | `/location` | Create location entity under an organization |
| PUT | `/:entityId` | Update entity |
| DELETE | `/:entityId` | Delete entity |

### Entity Scope

| Method | Path | Description |
|--------|------|-------------|
| GET | `/entity-scope` | Current user's entity scope (accessible entities) |
| GET | `/entities/:entityId/responsible-person` | Get responsible person for an entity |
| PATCH | `/entities/:entityId/responsible-person` | Set or clear responsible person |

### Locations (`/api/locations`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:locationId` | Get location details |
| GET | `/:locationId/analytics` | Location utilization analytics |
| GET | `/utilization/:tenantId/:utilizationLevel?` | Locations by utilization level |
| GET | `/tenant/:tenantId` | All locations for a tenant |
| POST | `/` | Create a location and link to organization |
| POST | `/:locationId/assign/:organizationId` | Assign location to organization |
| PUT | `/:locationId` | Update location |
| PUT | `/:locationId/capacity` | Update location capacity/usage |
| PUT | `/bulk/capacity` | Bulk update location capacities |
| DELETE | `/:locationId` | Soft-delete location |
| DELETE | `/:locationId/organizations/:organizationId` | Remove location from organization |

### Invitations (`/api/invitations`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/details` | Invitation details by org and email |
| GET | `/details-by-token` | Invitation details by token |
| GET | `/debug/url-generation` | Debug invitation URL generation |
| GET | `/debug/:org/:email` | Debug invitation by org and email |
| GET | `/admin/:orgCode` | Admin: list invitations for org |
| POST | `/accept` | Accept invitation |
| POST | `/accept-by-token` | Accept invitation by token |
| POST | `/create` | Create invitation |
| POST | `/create-multi-entity` | Create multi-entity invitation |
| POST | `/create-test-invitation` | Create test invitation |
| POST | `/test-email` | Test email sending |
| POST | `/test-invitation-flow` | Test invitation flow |
| POST | `/admin/:orgCode/:invitationId/resend` | Admin: resend invitation |
| DELETE | `/admin/:orgCode/:invitationId` | Admin: cancel/delete invitation |

## Services

| Service | Description |
|---------|-------------|
| **OrganizationService** | Parent/sub-organization CRUD, hierarchy management, move, bulk create/update/delete. Ensures one parent org per tenant. Publishes `org_created` events to Amazon MQ |
| **LocationService** | Location CRUD in unified entities table, locations by organization or tenant, entity hierarchy with locations, validation |
| **OrganizationAssignmentService** | Publishes organization-assignment events (created/updated/deactivated/activated/deleted) to RabbitMQ with retries, validation, enrichment, and user lookup. Supports bulk publish and rate limiting |
