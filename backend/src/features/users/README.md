# Users Feature

Current user profile, permissions, tenant verification for CRM/operations, tenant sync (WrapperSyncService), user classification by application access, user-application sync, and user-application access APIs.

## Directory Structure

```
users/
├── index.ts                                  # Feature exports
├── routes/
│   ├── users.ts                              # User profile, permissions, tenant sync
│   ├── user-routes.ts                        # Tenant verification (legacy)
│   ├── user-sync.ts                          # User classification and app sync
│   ├── user-verification-routes.ts           # User tenant verification
│   └── user-applications.ts                  # User application access APIs
└── services/
    ├── user-sync-service.ts                  # Sync users to external applications
    └── user-classification-service.ts        # Classify users by application access
```

## Endpoints

### Users (`/api/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user profile with permissions and roles |
| GET | `/me/permissions` | Current user permissions and roles |
| GET | `/tenant/:email` | CRM tenant verification by email |
| GET | `/tenant/:tenantId/sync-status` | Sync status for tenant |
| GET | `/sync/data-requirements` | Data requirements spec for sync |
| PUT | `/me` | Update current user profile |
| POST | `/me/complete-onboarding` | Mark current user onboarding completed |
| POST | `/tenant/:tenantId/sync` | Trigger tenant sync |

### User Verification (`/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user/test` | Test that verification routes are working |
| GET | `/user/tenant/:email` | Verify tenant access for user by email |

### User Sync (`/api/user-sync`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/classification` | Users classified by application access |
| GET | `/classification/:appCode` | Users with access to a specific application |
| GET | `/user/:userId/access` | Applications a user can access |
| GET | `/status` | Sync status and config for tenant |
| GET | `/test-response` | Test response serialization (debug) |
| POST | `/sync/all` | Sync all tenant users to their applications |
| POST | `/sync/application/:appCode` | Sync users for one application |
| POST | `/sync/user/:userId` | Sync one user to their applications |
| POST | `/refresh/:userId` | Refresh user classification and optionally sync |
| POST | `/test-connectivity` | Test connectivity to application URLs |

### User Applications (`/api/user-applications`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | All users with application access |
| GET | `/users/:userId` | One user's application access |
| GET | `/summary` | Application access summary |
| POST | `/sync/:appCode` | Sync users to one application |
| POST | `/sync/bulk` | Bulk sync all users to all applications |
| POST | `/sync/user/:userId` | Sync one user to their applications |

## Services

| Service | Description |
|---------|-------------|
| **UserSyncService** | Syncs users to external applications (CRM, HR, Affiliate, etc.): transforms to app format, JWT auth, sync all users for tenant, sync by application, sync single user, remove from applications, sync status |
| **UserClassificationService** | Classifies users by application access using tenant users, subscription, roles, and permissions. Provides summary, byApplication, byUser views. Refresh classification and per-app name/description/icon/URL helpers |
