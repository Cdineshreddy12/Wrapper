# **Wrapper API - User Tenant Verification**

## **Overview**

This API provides user tenant verification services for the CRM system. It allows the CRM to check if a user has tenant access and retrieve tenant information before allowing login.

## **Endpoints**

### **GET /api/user/tenant/{email}**

Verify if a user has tenant access and retrieve tenant information.

#### **Request**

```http
GET /api/user/tenant/{email}
```

**Note:** This endpoint is registered at the root API level (`/api`), not under the wrapper prefix.

**URL Parameters:**
- `email` (string, required): User's email address, URL-encoded

**Headers:**
```http
Content-Type: application/json
X-Request-Source: crm-backend
Authorization: Bearer {token} (optional)
```

**Example Request:**
```bash
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/user%40example.com" \
  -H "Content-Type: application/json" \
  -H "X-Request-Source: crm-backend"
```

#### **Success Response (200)**
When user has tenant access:

```json
{
  "success": true,
  "data": {
    "tenantId": "tenant_123456",
    "userId": "user_789012",
    "orgCode": "ORG001",
    "tenantName": "Acme Corporation",
    "status": "active",
    "subscription": {
      "plan": "enterprise",
      "status": "active"
    },
    "organization": {
      "name": "Acme Corp",
      "type": "corporation"
    }
  }
}
```

#### **No Tenant Response (200)**
When user exists but has no tenant:

```json
{
  "success": true,
  "data": null,
  "message": "User has no tenant assigned"
}
```

#### **Error Responses**

**404 - User Not Found:**
```json
{
  "success": false,
  "error": "User not found",
  "statusCode": 404
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized access",
  "statusCode": 401
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "statusCode": 500
}
```

## **Data Schema**

### **Response Data Object**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string | ✅ | Unique tenant identifier (e.g., "tenant_123456") |
| `userId` | string | ✅ | User's unique identifier (e.g., "user_789012") |
| `orgCode` | string | ✅ | Organization code (e.g., "ORG001") |
| `tenantName` | string | ✅ | Human-readable tenant name |
| `status` | string | ❌ | Tenant status: "active", "inactive", "suspended" |
| `subscription` | object | ❌ | Subscription information |
| `subscription.plan` | string | ❌ | Plan type: "free", "basic", "enterprise" |
| `subscription.status` | string | ❌ | Subscription status: "active", "expired", "cancelled" |
| `organization` | object | ❌ | Organization details |
| `organization.name` | string | ❌ | Organization name |
| `organization.type` | string | ❌ | Type: "corporation", "startup", "individual" |

## **Business Logic**

### **User Verification Flow**

1. **Validate Email**: Check if email parameter is provided and valid
2. **User Lookup**: Find user by email in your database
3. **Tenant Check**: Verify if user belongs to any active tenant
4. **Permission Check**: Ensure user has access to CRM system
5. **Data Retrieval**: Get tenant and organization information
6. **Response**: Return appropriate success/error response

### **Authentication & Authorization**

- **Optional Bearer Token**: For authenticated requests with additional permissions
- **API Key Validation**: Verify `X-Request-Source: crm-backend`
- **Rate Limiting**: Implement per IP/email/tenant rate limiting
- **Audit Logging**: Log all API calls for security

### **Error Scenarios**

1. **User Not Found**: Email doesn't exist in system
2. **No Tenant Access**: User exists but has no tenant assignment
3. **Inactive Tenant**: User's tenant is suspended/inactive
4. **Authentication Failed**: Invalid or expired token
5. **Server Errors**: Database connectivity issues, etc.

## **Implementation Details**

### **Database Query**

```sql
SELECT
  tu.user_id, t.tenant_id, t.company_name as tenant_name,
  t.is_active as tenant_status, tu.primary_organization_id,
  e.entity_code as org_code, e.entity_name as org_name,
  e.organization_type as org_type,
  s.plan as subscription_plan, s.status as subscription_status
FROM tenant_users tu
LEFT JOIN tenants t ON tu.tenant_id = t.tenant_id
LEFT JOIN entities e ON tu.primary_organization_id = e.entity_id
LEFT JOIN subscriptions s ON s.tenant_id = tu.tenant_id AND s.status = 'active'
WHERE tu.email = ? AND tu.is_active = true AND t.is_active = true
LIMIT 1;
```

### **Validation Rules**

- **Email Format**: Must be valid email address
- **Tenant Status**: Only return data for active tenants
- **User Status**: Only return data for active users
- **Organization Access**: User must have access to at least one organization

### **Security Considerations**

1. **Input Sanitization**: Validate and sanitize email parameter
2. **SQL Injection Prevention**: Use parameterized queries
3. **Rate Limiting**: Prevent abuse (max 10 requests/minute per IP)
4. **Logging**: Log all requests for audit purposes
5. **HTTPS Only**: Ensure endpoint is only accessible via HTTPS
6. **CORS**: Configure appropriate CORS policies

## **Testing Guidelines**

### **Test Cases**

#### **Positive Test Cases**
```bash
# User with active tenant
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/john@acme.com"
# Expected: 200 with tenant data

# User with multiple organizations
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/admin@multicorp.com"
# Expected: 200 with primary org data
```

#### **Negative Test Cases**
```bash
# User without tenant
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/freelancer@independent.com"
# Expected: 200 with success=true, data=null

# Non-existent user
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/nonexistent@user.com"
# Expected: 404 User not found

# Invalid email format
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/invalid-email"
# Expected: 400 Bad Request
```

#### **Edge Cases**
```bash
# User with inactive tenant
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/user@suspended-tenant.com"
# Expected: 200 with success=true, data=null

# Special characters in email
curl -X GET "https://wrapper.zopkit.com/api/user/tenant/user+tag@domain.co.uk"
# Expected: 200 with proper URL decoding
```

### **Performance Requirements**

- **Response Time**: < 500ms for 95% of requests
- **Availability**: 99.9% uptime
- **Error Rate**: < 1% error responses
- **Concurrent Requests**: Handle 100+ concurrent requests

## **Integration Notes**

### **CRM Integration**

The CRM calls this endpoint during:
1. **Login Process**: Before allowing user authentication
2. **Redirect Auth**: For users coming from external applications
3. **Tenant Sync**: To validate tenant access during data synchronization

### **Error Handling in CRM**

```javascript
// CRM handles different response scenarios
if (response.data.success && response.data.data) {
  // User has tenant - proceed with login
  loginUser(response.data.data);
} else if (response.data.success && !response.data.data) {
  // User exists but no tenant
  showNoTenantMessage();
} else {
  // Error response
  handleApiError(response);
}
```

### **Fallback Behavior**

When this API is unavailable, CRM falls back to:
- Demo tenant data (for development)
- Cached tenant information
- Offline mode with limited functionality

## **Deployment Checklist**

- [ ] API endpoint implemented and tested
- [ ] Database queries optimized
- [ ] Authentication middleware configured
- [ ] Rate limiting implemented
- [ ] Error handling tested
- [ ] Logging configured
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Documentation updated
- [ ] Monitoring alerts set up

## **Support**

For questions or issues with this API:
- **API Version**: v1.0
- **Contact**: Backend Team
- **Documentation**: This README
- **Testing**: Use provided curl examples

---

**Last Updated**: October 2025
**API Version**: 1.0
**Endpoint Status**: ✅ Active</contents>
</xai:function_call">Wrote contents to /Users/chintadineshreddy/Downloads/Wrapper-main/WRAPPER_API_README.md
