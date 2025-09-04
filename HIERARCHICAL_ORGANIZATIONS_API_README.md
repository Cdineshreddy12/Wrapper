# Hierarchical Organizations & Locations API

A comprehensive REST API for managing hierarchical organizations and locations following SOLID principles.

## 🏗️ Architecture Overview

### Hierarchical Structure
```
Tenant
├── Parent Organization
│   ├── Sub-Organization 1
│   │   ├── Location A (inherited or specific)
│   │   └── Location B (specific)
│   └── Sub-Organization 2
│       └── Location C (inherited or specific)
├── Location D (parent level)
└── Location E (parent level)
```

### Key Features
- ✅ Parent organizations with multiple sub-organizations
- ✅ Sub-organizations with default location inheritance
- ✅ Multiple locations per organization
- ✅ Location sharing between organizations
- ✅ Hierarchical access control
- ✅ Credit system integration
- ✅ Audit logging
- ✅ Soft delete functionality

## 🔐 Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## 📡 API Endpoints

### Organization Management

#### Create Parent Organization
```http
POST /api/organizations/parent
Content-Type: application/json

{
  "name": "Tech Solutions Inc.",
  "description": "Main company for tech solutions",
  "gstin": "22AAAAA0000A1Z0",
  "parentTenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "uuid",
    "organizationName": "Tech Solutions Inc.",
    "organizationType": "parent",
    "organizationLevel": 1,
    "hierarchyPath": "uuid"
  },
  "message": "Parent organization created successfully"
}
```

#### Create Sub-Organization
```http
POST /api/organizations/sub
Content-Type: application/json

{
  "name": "Development Division",
  "description": "Software development department",
  "gstin": "22BBBBB0000B1Z0",
  "parentOrganizationId": "parent-org-uuid"
}
```

#### Get Organization Details
```http
GET /api/organizations/{organizationId}
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "uuid",
    "organizationName": "Tech Solutions Inc.",
    "organizationType": "parent",
    "organizationLevel": 1,
    "hierarchyPath": "uuid"
  },
  "parentOrganization": {
    "organizationId": "parent-uuid",
    "organizationName": "Parent Company"
  },
  "message": "Organization details retrieved successfully"
}
```

#### Get Sub-Organizations
```http
GET /api/organizations/{organizationId}/sub-organizations
```

**Response:**
```json
{
  "success": true,
  "subOrganizations": [
    {
      "organizationId": "uuid",
      "organizationName": "Development Division",
      "organizationType": "sub",
      "organizationLevel": 2,
      "isActive": true
    }
  ],
  "count": 1,
  "message": "Sub-organizations retrieved successfully"
}
```

#### Get Organization Hierarchy
```http
GET /api/organizations/hierarchy/{tenantId}
```

**Response:**
```json
{
  "success": true,
  "hierarchy": [
    {
      "organizationId": "uuid",
      "organizationName": "Tech Solutions Inc.",
      "organizationType": "parent",
      "organizationLevel": 1,
      "hierarchyPath": "uuid",
      "children": [
        {
          "organizationId": "sub-uuid",
          "organizationName": "Development Division",
          "organizationType": "sub",
          "organizationLevel": 2,
          "hierarchyPath": "uuid.sub-uuid",
          "children": []
        }
      ]
    }
  ],
  "totalOrganizations": 2,
  "message": "Organization hierarchy retrieved successfully"
}
```

#### Update Organization
```http
PUT /api/organizations/{organizationId}
Content-Type: application/json

{
  "organizationName": "Updated Name",
  "description": "Updated description",
  "responsiblePersonId": "new-responsible-person-uuid"
}
```

#### Delete Organization (Soft Delete)
```http
DELETE /api/organizations/{organizationId}
```

### Location Management

#### Create Location
```http
POST /api/locations
Content-Type: application/json

{
  "name": "Headquarters",
  "address": "123 Tech Street, Silicon Valley",
  "city": "San Francisco",
  "state": "California",
  "zipCode": "94105",
  "country": "USA",
  "organizationId": "organization-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "locationId": "uuid",
    "locationName": "Headquarters",
    "address": {
      "street": "123 Tech Street, Silicon Valley",
      "city": "San Francisco",
      "state": "California",
      "zipCode": "94105",
      "country": "USA"
    },
    "isActive": true
  },
  "organization": {
    "organizationId": "org-uuid",
    "organizationName": "Tech Solutions Inc."
  },
  "message": "Location created and assigned to organization successfully"
}
```

#### Get Organization Locations
```http
GET /api/organizations/{organizationId}/locations
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "organizationId": "org-uuid",
    "organizationName": "Tech Solutions Inc."
  },
  "locations": [
    {
      "locationId": "uuid",
      "locationName": "Headquarters",
      "address": {
        "street": "123 Tech Street",
        "city": "San Francisco",
        "state": "California",
        "country": "USA"
      },
      "isActive": true,
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "message": "Organization locations retrieved successfully"
}
```

#### Get Location Details
```http
GET /api/locations/{locationId}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "locationId": "uuid",
    "locationName": "Headquarters",
    "address": {
      "street": "123 Tech Street",
      "city": "San Francisco",
      "state": "California",
      "country": "USA"
    },
    "isActive": true
  },
  "organizations": [
    {
      "organizationId": "org-uuid",
      "organizationName": "Tech Solutions Inc.",
      "organizationType": "parent",
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "organizationCount": 1,
  "message": "Location details retrieved successfully"
}
```

#### Update Location
```http
PUT /api/locations/{locationId}
Content-Type: application/json

{
  "locationName": "Main Headquarters",
  "address": "123 Tech Street, Silicon Valley, Building A",
  "city": "San Francisco",
  "state": "California",
  "zipCode": "94105",
  "country": "USA",
  "responsiblePersonId": "responsible-person-uuid"
}
```

#### Assign Location to Organization
```http
POST /api/locations/{locationId}/assign/{organizationId}
```

#### Remove Location from Organization
```http
DELETE /api/locations/{locationId}/organizations/{organizationId}
```

#### Get All Tenant Locations
```http
GET /api/locations/tenant/{tenantId}
```

#### Delete Location (Soft Delete)
```http
DELETE /api/locations/{locationId}
```

## 🧪 Testing

### Complete Test Suite
Run the comprehensive test suite:

```bash
node test-hierarchical-organizations.js
```

### Individual Endpoint Testing

#### Using cURL
```bash
# Create parent organization
curl -X POST http://localhost:3000/api/organizations/parent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Tech Solutions Inc.",
    "description": "Main company",
    "gstin": "22AAAAA0000A1Z0",
    "parentTenantId": "tenant-uuid"
  }'

# Get organization hierarchy
curl -X GET http://localhost:3000/api/organizations/hierarchy/tenant-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Using JavaScript/Node.js
```javascript
import { apiCall } from './test-hierarchical-organizations.js';

// Create parent organization
const result = await apiCall('POST', '/organizations/parent', {
  name: 'Tech Solutions Inc.',
  description: 'Main company',
  gstin: '22AAAAA0000A1Z0',
  parentTenantId: 'tenant-uuid'
});

console.log(result);
```

## 📊 Data Flow Examples

### Complete Organization Setup Flow

1. **Create Parent Organization**
   ```javascript
   const parentOrg = await apiCall('POST', '/organizations/parent', {
     name: 'Tech Corp',
     gstin: '22AAAAA0000A1Z0',
     parentTenantId: tenantId
   });
   ```

2. **Create Sub-Organizations**
   ```javascript
   const devOrg = await apiCall('POST', '/organizations/sub', {
     name: 'Development Division',
     gstin: '22BBBBB0000B1Z0',
     parentOrganizationId: parentOrg.result.organization.organizationId
   });
   ```

3. **Create Locations**
   ```javascript
   // Headquarters for parent
   await apiCall('POST', '/locations', {
     name: 'Headquarters',
     address: '123 Main St',
     city: 'NYC',
     country: 'USA',
     organizationId: parentOrg.result.organization.organizationId
   });

   // Office for development division
   await apiCall('POST', '/locations', {
     name: 'Dev Office',
     address: '456 Code St',
     city: 'Austin',
     country: 'USA',
     organizationId: devOrg.result.organization.organizationId
   });
   ```

4. **View Complete Hierarchy**
   ```javascript
   const hierarchy = await apiCall('GET', `/organizations/hierarchy/${tenantId}`);
   console.log(JSON.stringify(hierarchy.result, null, 2));
   ```

## 🔒 Security Features

### Authentication & Authorization
- JWT token validation on all endpoints
- Role-based access control
- Organization-level data isolation
- User context validation

### Data Validation
- GSTIN format validation
- Required field validation
- Data type checking
- Business rule enforcement

### Audit Logging
- All operations are logged
- User context tracking
- Timestamp recording
- Change history maintenance

## 🏗️ SOLID Principles Implementation

### Single Responsibility Principle (SRP)
- **OrganizationService**: Handles only organization operations
- **LocationService**: Handles only location operations
- **Routes**: Handle only HTTP request/response logic

### Open/Closed Principle (OCP)
- Services can be extended without modification
- New organization types can be added
- Location types are extensible

### Liskov Substitution Principle (LSP)
- All services implement consistent interfaces
- Sub-organization behaves like parent organization
- Location assignments work consistently

### Interface Segregation Principle (ISP)
- Separate interfaces for different operations
- Clients depend only on methods they use
- Clean separation of concerns

### Dependency Inversion Principle (DIP)
- High-level modules don't depend on low-level modules
- Both depend on abstractions
- Services are injected rather than created

## 🗄️ Database Schema

### Core Tables
- `organizations`: Hierarchical organization structure
- `locations`: Physical/virtual locations
- `location_assignments`: Organization-location relationships
- `organization_memberships`: User-organization relationships

### Key Relationships
- Organizations can have parent-child relationships
- Locations can be assigned to multiple organizations
- Users can belong to multiple organizations/locations
- Credit systems integrate at entity level

## 🚀 Production Considerations

### Performance
- Database indexing on frequently queried fields
- Connection pooling
- Query optimization
- Caching strategies

### Scalability
- Horizontal scaling support
- Microservices architecture compatibility
- Load balancing ready
- CDN integration

### Monitoring
- Request/response logging
- Error tracking
- Performance metrics
- Business analytics

## 🐛 Error Handling

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict (duplicate assignments)
- `500`: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

## 📈 Usage Analytics

The system tracks:
- Organization creation metrics
- Location assignment patterns
- User activity per entity
- Credit consumption by organization/location
- Hierarchy depth and complexity

## 🔄 Integration Points

### Existing Systems
- **Onboarding Service**: Creates initial organization
- **Credit System**: Tracks usage per entity
- **User Management**: Handles memberships
- **Audit System**: Logs all operations
- **DNS Management**: Creates subdomains

### External Integrations
- **Kinde**: User authentication
- **Stripe**: Billing and payments
- **AWS Route 53**: DNS management
- **Email Services**: Notifications

## 🧪 Testing Strategy

### Unit Tests
- Service layer testing
- Business logic validation
- Data transformation testing
- Error handling verification

### Integration Tests
- End-to-end API testing
- Database transaction testing
- External service integration
- Performance testing

### Test Coverage
- All CRUD operations
- Error scenarios
- Edge cases
- Business rule validation
- Security testing

## 📚 API Documentation

### Swagger/OpenAPI
The API is fully documented with OpenAPI 3.0 specifications:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Error response formats

### Interactive Documentation
Access the API documentation at:
```
http://localhost:3000/api/documentation
```

## 🎯 Next Steps

1. **Frontend Integration**: Build UI components for organization management
2. **Advanced Permissions**: Implement granular access control
3. **Bulk Operations**: Add bulk creation/update endpoints
4. **Search & Filtering**: Implement advanced search capabilities
5. **Export Features**: Add data export functionality
6. **Real-time Updates**: WebSocket integration for live updates
7. **Mobile App**: Develop mobile application support

---

**Built with ❤️ following SOLID principles and microservices architecture**
