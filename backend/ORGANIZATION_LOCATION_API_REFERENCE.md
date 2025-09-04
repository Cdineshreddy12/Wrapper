# 🚀 Organization & Location Management API Reference

## Overview

Complete RESTful API reference for organization and location management in your business suite. All endpoints support **application-level data isolation** and **hierarchical access control**.

## 🔐 Authentication & Application Context

All endpoints require:
- **Authentication**: JWT token in `Authorization` header
- **Application Context**: `X-Application` header (crm, hr, finance, sales, marketing, inventory, projects, analytics)

```javascript
// Example request with authentication and application context
const response = await fetch('/api/organizations/parent', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'X-Application': 'crm',  // Required for all requests
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ ... })
});
```

---

## 🏢 ORGANIZATION MANAGEMENT ENDPOINTS

### 1. Create Parent Organization
**POST** `/api/organizations/parent`

Creates a new parent organization at the root level.

**Request Body:**
```json
{
  "name": "Tech Solutions Inc.",
  "description": "Leading technology solutions provider",
  "gstin": "22AAAAA0000A1Z5",
  "parentTenantId": "893d8c75-68e6-4d42-92f8-45df62ef08b6"
}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "org-uuid-123",
    "organizationName": "Tech Solutions Inc.",
    "organizationType": "parent",
    "organizationLevel": 1,
    "hierarchyPath": "org-uuid-123"
  },
  "message": "Parent organization created successfully"
}
```

### 2. Create Sub-Organization
**POST** `/api/organizations/sub`

Creates a sub-organization under a parent organization.

**Request Body:**
```json
{
  "name": "Development Division",
  "description": "Software development and engineering",
  "gstin": "22AAAAA0000A1Z6",
  "parentOrganizationId": "parent-org-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "sub-org-uuid-456",
    "organizationName": "Development Division",
    "organizationType": "sub",
    "organizationLevel": 2,
    "hierarchyPath": "parent-org-uuid/sub-org-uuid-456"
  },
  "message": "Sub-organization created successfully"
}
```

### 3. Get Organization Details
**GET** `/api/organizations/:organizationId`

Retrieves detailed information about a specific organization.

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "org-uuid-123",
    "organizationName": "Tech Solutions Inc.",
    "organizationType": "parent",
    "organizationLevel": 1,
    "hierarchyPath": "org-uuid-123",
    "description": "Leading technology solutions provider",
    "gstin": "22AAAAA0000A1Z5",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "parentOrganization": {
    "organizationId": "parent-org-uuid",
    "organizationName": "Parent Organization"
  },
  "message": "Organization details retrieved successfully"
}
```

### 4. Get Sub-Organizations
**GET** `/api/organizations/:organizationId/sub-organizations`

Retrieves all sub-organizations for a given parent organization.

**Response:**
```json
{
  "success": true,
  "subOrganizations": [
    {
      "organizationId": "sub-org-uuid-456",
      "organizationName": "Development Division",
      "organizationType": "sub",
      "organizationLevel": 2,
      "isActive": true,
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ],
  "count": 1,
  "message": "Sub-organizations retrieved successfully"
}
```

### 5. Get Organization Hierarchy
**GET** `/api/organizations/hierarchy/:tenantId`

Retrieves the complete organization hierarchy for a tenant.

**Response:**
```json
{
  "success": true,
  "hierarchy": [
    {
      "organizationId": "parent-org-uuid",
      "organizationName": "Tech Solutions Inc.",
      "organizationType": "parent",
      "organizationLevel": 1,
      "hierarchyPath": "parent-org-uuid",
      "children": [
        {
          "organizationId": "sub-org-uuid",
          "organizationName": "Development Division",
          "organizationType": "sub",
          "organizationLevel": 2,
          "hierarchyPath": "parent-org-uuid/sub-org-uuid",
          "children": []
        }
      ]
    }
  ],
  "totalOrganizations": 2,
  "message": "Organization hierarchy retrieved successfully"
}
```

### 6. Update Organization
**PUT** `/api/organizations/:organizationId`

Updates organization details.

**Request Body:**
```json
{
  "organizationName": "Updated Organization Name",
  "description": "Updated description",
  "gstin": "22AAAAA0000A1Z5",
  "responsiblePersonId": "user-uuid-789"
}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "org-uuid-123",
    "organizationName": "Updated Organization Name",
    "description": "Updated description"
  },
  "message": "Organization updated successfully"
}
```

### 7. Move Organization
**PATCH** `/api/organizations/:organizationId/move`

Moves organization to a new parent in the hierarchy.

**Request Body:**
```json
{
  "newParentId": "new-parent-org-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "org-uuid-123",
    "organizationName": "Moved Organization",
    "parentOrganizationId": "new-parent-org-uuid",
    "hierarchyPath": "new-parent-org-uuid/org-uuid-123",
    "organizationLevel": 3
  },
  "message": "Organization moved successfully"
}
```

### 8. Bulk Create Organizations
**POST** `/api/organizations/bulk`

Creates multiple organizations in a single request.

**Request Body:**
```json
{
  "organizations": [
    {
      "name": "Marketing Division",
      "description": "Digital marketing and brand management",
      "gstin": "22AAAAA0000A1Z7",
      "parentTenantId": "tenant-uuid"
    },
    {
      "name": "Sales Division",
      "description": "Sales and business development",
      "gstin": "22AAAAA0000A1Z8",
      "parentTenantId": "tenant-uuid"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "organization": {
        "organizationId": "org-uuid-1",
        "organizationName": "Marketing Division"
      }
    },
    {
      "success": true,
      "organization": {
        "organizationId": "org-uuid-2",
        "organizationName": "Sales Division"
      }
    }
  ],
  "errors": [],
  "totalProcessed": 2,
  "successful": 2,
  "failed": 0,
  "message": "Bulk organization creation completed"
}
```

### 9. Bulk Update Organizations
**PUT** `/api/organizations/bulk`

Updates multiple organizations in a single request.

**Request Body:**
```json
{
  "updates": [
    {
      "organizationId": "org-uuid-1",
      "organizationName": "Updated Marketing Division",
      "description": "Updated description"
    }
  ]
}
```

### 10. Bulk Delete Organizations
**DELETE** `/api/organizations/bulk`

Soft deletes multiple organizations.

**Request Body:**
```json
{
  "organizationIds": ["org-uuid-1", "org-uuid-2"]
}
```

### 11. Delete Organization
**DELETE** `/api/organizations/:organizationId`

Soft deletes a single organization.

---

## 📍 LOCATION MANAGEMENT ENDPOINTS

### 1. Create Location
**POST** `/api/locations/`

Creates a new location and assigns it to an organization.

**Request Body:**
```json
{
  "name": "Headquarters",
  "address": "123 Technology Street",
  "city": "Bangalore",
  "state": "Karnataka",
  "zipCode": "560001",
  "country": "India",
  "organizationId": "org-uuid-123"
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "locationId": "loc-uuid-123",
    "locationName": "Headquarters",
    "address": {
      "street": "123 Technology Street",
      "city": "Bangalore",
      "state": "Karnataka",
      "zipCode": "560001",
      "country": "India"
    },
    "city": "Bangalore",
    "country": "India"
  },
  "organization": {
    "organizationId": "org-uuid-123",
    "organizationName": "Tech Solutions Inc."
  },
  "message": "Location created successfully"
}
```

### 2. Get Location Details
**GET** `/api/locations/:locationId`

Retrieves detailed information about a location.

**Response:**
```json
{
  "success": true,
  "location": {
    "locationId": "loc-uuid-123",
    "locationName": "Headquarters",
    "address": {
      "street": "123 Technology Street",
      "city": "Bangalore",
      "state": "Karnataka",
      "zipCode": "560001",
      "country": "India"
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "organizations": [
    {
      "organizationId": "org-uuid-123",
      "organizationName": "Tech Solutions Inc.",
      "organizationType": "parent",
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "organizationCount": 1,
  "message": "Location details retrieved successfully"
}
```

### 3. Update Location
**PUT** `/api/locations/:locationId`

Updates location information.

**Request Body:**
```json
{
  "locationName": "Updated Headquarters",
  "address": "456 Innovation Avenue",
  "city": "Bangalore",
  "responsiblePersonId": "user-uuid-789"
}
```

### 4. Assign Location to Organization
**POST** `/api/locations/:locationId/assign/:organizationId`

Assigns an existing location to an organization.

**Response:**
```json
{
  "success": true,
  "assignment": {
    "assignmentId": "assign-uuid-123",
    "locationId": "loc-uuid-123",
    "entityId": "org-uuid-456",
    "entityType": "organization",
    "assignedAt": "2024-01-15T10:30:00Z"
  },
  "location": {
    "locationId": "loc-uuid-123",
    "locationName": "Headquarters"
  },
  "organization": {
    "organizationId": "org-uuid-456",
    "organizationName": "Development Division"
  },
  "message": "Location assigned to organization successfully"
}
```

### 5. Remove Location from Organization
**DELETE** `/api/locations/:locationId/organizations/:organizationId`

Removes location assignment from an organization.

### 6. Update Location Capacity
**PUT** `/api/locations/:locationId/capacity`

Updates location capacity and resource information.

**Request Body:**
```json
{
  "maxOccupancy": 150,
  "currentOccupancy": 85,
  "resources": {
    "conferenceRooms": 5,
    "parkingSpaces": 100,
    "wifiAccessPoints": 20
  }
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "locationId": "loc-uuid-123",
    "locationName": "Headquarters",
    "capacity": {
      "maxOccupancy": 150,
      "currentOccupancy": 85,
      "resources": {
        "conferenceRooms": 5,
        "parkingSpaces": 100,
        "wifiAccessPoints": 20
      }
    }
  },
  "message": "Location capacity updated successfully"
}
```

### 7. Get Location Analytics
**GET** `/api/locations/:locationId/analytics`

Retrieves utilization analytics for a location.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "locationId": "loc-uuid-123",
    "locationName": "Headquarters",
    "capacity": {
      "maxOccupancy": 150,
      "currentOccupancy": 85,
      "utilizationPercentage": 56.67
    },
    "resources": {
      "conferenceRooms": { "total": 5, "occupied": 2 },
      "parkingSpaces": { "total": 100, "occupied": 45 },
      "wifiAccessPoints": { "total": 20, "active": 18 }
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "message": "Location analytics retrieved successfully"
}
```

### 8. Get Locations by Utilization
**GET** `/api/locations/utilization/:tenantId/:utilizationLevel?`

Retrieves locations filtered by utilization level.

**Parameters:**
- `utilizationLevel`: `all`, `critical`, `high`, `medium`, `low`

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "locationId": "loc-uuid-123",
      "locationName": "Headquarters",
      "utilizationPercentage": 85.5,
      "utilizationLevel": "high"
    }
  ],
  "total": 1,
  "breakdown": {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 5
  },
  "message": "Locations retrieved successfully"
}
```

### 9. Bulk Update Location Capacities
**PUT** `/api/locations/bulk/capacity`

Updates capacity for multiple locations.

**Request Body:**
```json
{
  "updates": [
    {
      "locationId": "loc-uuid-1",
      "maxOccupancy": 200,
      "currentOccupancy": 120,
      "resources": { "conferenceRooms": 8 }
    }
  ]
}
```

### 10. Delete Location
**DELETE** `/api/locations/:locationId`

Soft deletes a location.

---

## 🔗 INTEGRATION ENDPOINTS

### 1. Get Organization Locations
**GET** `/api/organizations/:organizationId/locations`

Retrieves all locations assigned to an organization.

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "org-uuid-123",
    "organizationName": "Tech Solutions Inc."
  },
  "locations": [
    {
      "locationId": "loc-uuid-123",
      "locationName": "Headquarters",
      "address": {
        "street": "123 Technology Street",
        "city": "Bangalore",
        "country": "India"
      },
      "isActive": true,
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "message": "Organization locations retrieved successfully"
}
```

### 2. Get Tenant Locations
**GET** `/api/locations/tenant/:tenantId`

Retrieves all locations for a tenant.

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "locationId": "loc-uuid-123",
      "locationName": "Headquarters",
      "address": {
        "street": "123 Technology Street",
        "city": "Bangalore",
        "country": "India"
      },
      "organizationCount": 2,
      "isActive": true
    }
  ],
  "count": 1,
  "message": "Tenant locations retrieved successfully"
}
```

---

## 🛡️ SECURITY FEATURES

### Application-Level Isolation
All endpoints automatically filter data based on:
- **Application Context**: Data accessible only to the specified application
- **User Permissions**: User's application-specific permission level
- **Organization Hierarchy**: Respects organizational access control
- **Location Assignments**: Only assigned locations are accessible

### Permission Levels
```javascript
const PERMISSION_LEVELS = {
  NONE: 0,        // No access
  VIEWER: 1,      // Read-only access
  EDITOR: 2,      // Read + Write access
  ADMIN: 3,       // Full application admin
  SUPER_ADMIN: 4  // Tenant-wide application admin
};
```

### Cross-Application Sharing Rules
```javascript
const sharingRules = {
  'hr-finance': ['user', 'organization'],     // HR → Finance: Employee data
  'hr-crm': ['user'],                          // HR → CRM: Basic user data
  'finance-sales': ['organization'],           // Finance → Sales: Org data
  'crm-sales': ['user', 'organization'],       // CRM ↔ Sales: Customer data
};
```

---

## 📊 RESPONSE FORMAT

All endpoints follow a consistent response format:

### Success Response
```json
{
  "success": true,
  "data": { ... },           // Main data payload
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Bulk Operation Response
```json
{
  "success": true,
  "results": [ ... ],        // Individual operation results
  "errors": [ ... ],         // Any errors encountered
  "totalProcessed": 10,      // Total items processed
  "successful": 9,           // Number of successful operations
  "failed": 1,              // Number of failed operations
  "message": "Bulk operation completed"
}
```

---

## 🔧 TESTING

Run the comprehensive test suite:

```bash
cd backend
node test-creation-apis.js
```

This will test all creation and management endpoints with:
- ✅ Parent organization creation
- ✅ Sub-organization creation
- ✅ Location creation and assignment
- ✅ Capacity management
- ✅ Hierarchy retrieval
- ✅ Bulk operations
- ✅ Analytics access
- ✅ Application isolation

---

## 🚀 QUICK START

1. **Create Parent Organization:**
```bash
curl -X POST http://localhost:3000/api/organizations/parent \
  -H "Authorization: Bearer <token>" \
  -H "X-Application: crm" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Company", "parentTenantId": "tenant-uuid"}'
```

2. **Create Location:**
```bash
curl -X POST http://localhost:3000/api/locations/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Application: crm" \
  -H "Content-Type: application/json" \
  -d '{"name": "HQ", "city": "Bangalore", "organizationId": "org-uuid"}'
```

3. **Get Hierarchy:**
```bash
curl -X GET http://localhost:3000/api/organizations/hierarchy/tenant-uuid \
  -H "Authorization: Bearer <token>" \
  -H "X-Application: crm"
```

---

## 🎯 SUMMARY

**Your organization and location management APIs are fully implemented with:**

- ✅ **Complete CRUD Operations**: Create, Read, Update, Delete for all entities
- ✅ **Hierarchical Management**: Parent-child relationships and moves
- ✅ **Bulk Operations**: Efficient batch processing
- ✅ **Application Isolation**: Per-application data segregation
- ✅ **Advanced Analytics**: Capacity tracking and utilization reports
- ✅ **Enterprise Security**: Multi-level access control
- ✅ **RESTful Design**: Consistent API patterns
- ✅ **Comprehensive Testing**: Full test coverage

**Ready for frontend integration and production deployment!** 🚀
