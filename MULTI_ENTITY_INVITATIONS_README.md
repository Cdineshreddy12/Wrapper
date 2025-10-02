# Multi-Entity Invitations

## Overview

This implementation extends the existing invitation system to support inviting users to multiple organizations and locations within a tenant's hierarchy, rather than just inviting them to the tenant level.

## Features

✅ **Multi-Entity Targeting**: Invite users to multiple organizations/locations in a single invitation
✅ **Role Granularity**: Assign different roles for each target entity
✅ **Primary Entity**: Designate a primary organization/location for the invited user
✅ **Hierarchical Permissions**: Respect organization hierarchy and user access levels
✅ **Backward Compatibility**: Existing single-entity invitations continue to work
✅ **Unified Entity System**: Leverages the existing unified entities table

## Database Schema Changes

### Extended `tenant_invitations` Table

```sql
ALTER TABLE tenant_invitations
ADD COLUMN target_entities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN invitation_scope VARCHAR(20) DEFAULT 'tenant',
ADD COLUMN primary_entity_id UUID;
```

#### New Fields

- **`target_entities`**: JSON array of target entities with roles
  ```json
  [
    {
      "entityId": "org-uuid-1",
      "roleId": "role-uuid-1",
      "entityType": "organization",
      "membershipType": "direct"
    },
    {
      "entityId": "loc-uuid-1",
      "roleId": "role-uuid-2",
      "entityType": "location",
      "membershipType": "direct"
    }
  ]
  ```

- **`invitation_scope`**: Type of invitation
  - `'tenant'`: Legacy single-tenant invitation
  - `'organization'`: Single organization invitation
  - `'location'`: Single location invitation
  - `'multi-entity'`: Multiple entities invitation

- **`primary_entity_id`**: User's primary organization/location entity

## API Endpoints

### Create Multi-Entity Invitation

```http
POST /api/invitations/create-multi-entity
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com",
  "entities": [
    {
      "entityId": "org-uuid-1",
      "roleId": "role-uuid-1",
      "entityType": "organization",
      "membershipType": "direct"
    },
    {
      "entityId": "loc-uuid-1",
      "roleId": "role-uuid-2",
      "entityType": "location",
      "membershipType": "direct"
    }
  ],
  "primaryEntityId": "org-uuid-1",
  "message": "Welcome to our organization!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Multi-entity invitation created successfully",
  "invitation": {
    "invitationId": "invitation-uuid",
    "email": "user@example.com",
    "targetEntities": [...],
    "primaryEntityId": "org-uuid-1",
    "invitationScope": "multi-entity",
    "token": "invitation-token",
    "url": "https://app.com/invite/accept?token=...",
    "expiresAt": "2025-10-07T00:00:00.000Z"
  }
}
```

### Get Invitation Details

```http
GET /api/invitations/details-by-token?token=<invitation-token>
```

**Multi-Entity Response:**
```json
{
  "success": true,
  "invitation": {
    "email": "user@example.com",
    "organizationName": "Company Name",
    "inviterName": "John Doe",
    "invitationScope": "multi-entity",
    "targetEntities": [
      {
        "entityId": "org-uuid-1",
        "entityName": "Marketing Department",
        "entityType": "organization",
        "roleName": "Manager",
        "isPrimary": true
      },
      {
        "entityId": "loc-uuid-1",
        "entityName": "NYC Office",
        "entityType": "location",
        "roleName": "Member",
        "isPrimary": false
      }
    ],
    "primaryEntityId": "org-uuid-1",
    "primaryEntityName": "Marketing Department",
    "orgCode": "tenant-code",
    "expiresAt": "2025-10-07T00:00:00.000Z"
  }
}
```

### Accept Invitation

```http
POST /api/invitations/accept-by-token
Content-Type: application/json

{
  "token": "invitation-token",
  "kindeUserId": "kinde-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "user": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "name": "user",
    "isActive": true,
    "tenantId": "tenant-uuid",
    "onboardingCompleted": true,
    "isTenantAdmin": false
  },
  "invitationDetails": {
    "invitationScope": "multi-entity",
    "targetEntities": [...],
    "primaryEntityId": "org-uuid-1"
  }
}
```

## Permission System

### Hierarchical Access Control

The system implements hierarchical permission checking:

1. **Tenant Admins**: Can invite to any entity within the tenant
2. **Entity Managers/Admins**: Can invite to their entity and sub-entities (if `canAccessSubEntities` is true)
3. **Standard Users**: Limited to entities they have access to

### Permission Validation Flow

1. Check if user is tenant admin → Allow all
2. Get user's active memberships with admin/manager access
3. For each target entity, check if user has permission via direct membership or parent entity access
4. Return detailed permission restrictions if access is denied

## Implementation Details

### Database Relationships

- **tenant_invitations.primary_entity_id** → **entities.entity_id**
- **organization_memberships** created for each target entity
- **tenant_users.primary_organization_id** set to primary entity

### Backward Compatibility

- Existing single-entity invitations continue to work
- Legacy `roleId` field preserved for compatibility
- Invitation scope defaults to `'tenant'` for existing records

### Membership Creation

When a multi-entity invitation is accepted:

1. Create `organization_memberships` records for each target entity
2. Set appropriate membership status and access levels
3. Mark primary entity membership as `isPrimary: true`
4. Update user's `primaryOrganizationId`

## Testing

Run the test script to verify functionality:

```bash
node test-multi-entity-invitations.js
```

## Migration

Apply the database migration:

```sql
-- Run the migration script
\i backend/src/db/migrations/multi_entity_invitations.sql
```

## Usage Examples

### Invite User to Marketing Department + NYC Office

```javascript
const invitationData = {
  email: "newhire@company.com",
  entities: [
    {
      entityId: "marketing-dept-uuid",
      roleId: "manager-role-uuid",
      entityType: "organization"
    },
    {
      entityId: "nyc-office-uuid",
      roleId: "member-role-uuid",
      entityType: "location"
    }
  ],
  primaryEntityId: "marketing-dept-uuid"
};
```

### Frontend Integration

The system is designed to work with existing frontend components. Update invitation creation forms to:

1. Show hierarchical entity selector
2. Allow multiple entity selection
3. Display role assignment per entity
4. Highlight primary entity selection

## Future Enhancements

- Bulk invitation creation for multiple users
- Invitation templates for common entity/role combinations
- Advanced permission inheritance rules
- Invitation expiration policies per entity type
