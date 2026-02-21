# Organizations Feature

Manages organizational hierarchy (organizations, locations, departments), entity CRUD, and user assignment within entities.

## Directory Structure

```
organizations/
├── index.ts
├── pages/
│   ├── OrganizationPage.tsx              # Route wrapper, loads tenant/org data
│   └── OrganizationManagement.tsx        # Page-level org management
└── components/
    ├── index.ts
    ├── OrganizationManagement.tsx        # Main UI: hierarchy, entities, users, credits
    ├── OrganizationHierarchyFlow.tsx     # Visual hierarchy flow diagram
    ├── OrganizationTreeManagement.tsx    # Tree view of org/location/department
    ├── OrganizationUserManagement.tsx    # User list and actions per entity
    ├── OrganizationNode.tsx             # Individual node in hierarchy
    ├── TreeNode.tsx                      # Tree node component
    ├── OrganizationDialogs.tsx          # Create/edit entity dialogs
    ├── UserActions.tsx                   # User action buttons
    ├── UserCard.tsx                      # User card display
    ├── UserStatsGrid.tsx                # User statistics grid
    └── EmptyUsersState.tsx              # Empty state for user lists
```

## Features

- **Hierarchy visualization** — Tree view of organizations, locations, and departments
- **Entity management** — Create, edit, and manage entities at each level
- **User assignment** — View and manage users assigned to each entity
- **Credit allocation** — View credit allocations per entity
- **Application access** — View applications assigned to entities

## Key APIs

| Action | Endpoint |
|--------|----------|
| Hierarchy | `GET /entities/hierarchy/:tenantId` |
| All orgs (fallback) | `GET /admin/organizations/all` |
| Tenant users | `GET /tenants/current/users` |
| Current tenant | `GET /tenants/current` |
| Auth status | `GET /api/admin/auth-status` |
| User details | `GET /admin/users/:userId` |

## Dependencies

- `@tanstack/react-query` — Data fetching
- `@/hooks/useDashboardData` — Dashboard data
- `@/hooks/useOrganizationHierarchy` — Hierarchy data
- `@/hooks/useOrganizationAuth` — Org-level auth
- `lucide-react` — Icons
- `react-hot-toast` — Notifications
