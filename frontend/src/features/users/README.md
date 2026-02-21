# Users Feature

User management dashboard for viewing, inviting, editing, and managing team members, their roles, organization assignments, and application access.

## Directory Structure

```
users/
├── pages/
│   ├── InviteUserPage.tsx                    # Standalone invite user page
│   ├── UserDetailsPage.tsx                   # Individual user details page
│   └── UserApplicationAccess.tsx             # User's application access page
└── components/
    ├── index.ts
    ├── UserManagementDashboard.tsx            # Legacy user management dashboard
    ├── ModernUserDashboard.tsx                # Modern user list with CRUD actions
    ├── ComprehensiveUserApplicationManager.tsx # User + application access management
    ├── UserList.tsx                           # User list component
    ├── UserRow.tsx                            # Individual user row
    ├── UserCard.tsx                           # User card display
    ├── UserFilters.tsx                        # Search and filter controls
    ├── UserStats.tsx                          # User statistics summary
    ├── UserDetailsModal.tsx                   # User details modal
    ├── EditUserModal.tsx                      # Edit user modal
    ├── DeleteUserModal.tsx                    # Delete confirmation modal
    ├── InviteUserModal.tsx                    # Invite new user modal
    ├── RoleAssignmentModal.tsx                # Assign roles to user
    ├── UserAccessModal.tsx                    # User access management modal
    ├── UserRoleManager.tsx                    # Role management per user
    ├── UserOrganizationManager.tsx            # Organization assignments per user
    ├── UserApplicationAccess.tsx              # Application access per user
    ├── UserApplicationStates.tsx              # Application sync states
    ├── ApplicationAccessCard.tsx              # Single app access card
    ├── ApplicationStatsTab.tsx                # Application statistics tab
    ├── SyncDialog.tsx                         # User sync dialog
    ├── SyncResultsTab.tsx                     # Sync results display
    ├── SyncManagement.tsx                     # Sync management controls
    ├── BulkActions.tsx                        # Bulk user actions
    ├── SummaryCards.tsx                        # Summary stat cards
    ├── UserApplicationSummaryCards.tsx         # App access summary cards
    ├── NoDataState.tsx                        # Empty state component
    ├── context/
    │   └── UserManagementContext.tsx          # Shared state context
    ├── hooks/
    │   ├── useUsers.ts                       # User list data hook
    │   ├── useRoles.ts                       # Roles data hook
    │   ├── useUserActions.ts                 # User action mutations
    │   ├── useUserFilters.ts                 # Filter state management
    │   └── useUserStats.ts                   # User statistics
    ├── services/
    │   ├── UserService.ts                    # All user API calls
    │   ├── ValidationService.ts              # Input validation
    │   └── LoggingService.ts                 # Action logging
    ├── table/
    │   ├── index.tsx                         # Table entry point
    │   ├── columns.tsx                       # Column definitions
    │   └── actions.tsx                       # Row action definitions
    └── components/
        ├── UserManagementContent.tsx          # Main content wrapper
        ├── UserTable.tsx                      # Data table component
        └── UserManagementModals.tsx           # Modal orchestrator
```

## Key APIs

All API calls are centralized in `UserService.ts`:

| Action | Endpoint |
|--------|----------|
| List users | `GET /tenants/current/users`, `GET /admin/users` |
| Invite user | `POST /admin/organizations/current/invite-user` |
| Update user | `PUT /tenants/current/users/:userId` |
| Delete user | `DELETE /tenants/current/users/:userId` |
| Promote | `POST /tenants/current/users/:userId/promote` |
| Deactivate | `POST /tenants/current/users/:userId/deactivate` |
| Reactivate | `POST /tenants/current/users/:userId/reactivate` |
| Resend invite | `POST /tenants/current/users/:userId/resend-invite` |
| Assign roles | `POST /tenants/current/users/:userId/assign-roles` |
| Remove role | `DELETE /admin/users/:userId/roles/:roleId` |
| User orgs | `GET /admin/users/:userId/organizations` |
| Roles list | `GET /permissions/roles` |

## Features

- **User list** — Searchable, filterable user table with pagination
- **Invite** — Invite new users with role assignment
- **Edit** — Update user details and roles
- **Bulk actions** — Multi-select for bulk operations
- **Role management** — Assign/remove roles per user
- **Organization management** — Manage user's entity assignments
- **Application access** — View and manage per-user application access
- **Sync management** — Sync users to external applications

## Dependencies

- `@tanstack/react-query` — Data fetching and cache management
- `@/lib/api` — API client and `invitationAPI`
- `@/hooks/useSharedQueries` — Shared query hooks
- `@/types/user-management` — User management types
- `lucide-react` — Icons
- `react-hot-toast` — Notifications
