# Organization Assignment Redis Streams Integration

## 📋 Overview

This integration provides real-time synchronization of organization assignments using Redis Streams. Organization assignments are **tenant-level operations** where tenant administrators can assign users to organizations within their tenant. When users are assigned to organizations (during invitation or management), events are published to Redis Streams for immediate consumption by CRM and other downstream systems.

## 🎯 Key Concepts

- **Tenant-Level Operation**: Organization assignments are managed at the tenant level, not system-wide
- **Multi-Organization Support**: Each tenant can have multiple organizations and assign users to them
- **Invitation Integration**: Organization assignments can be set during user invitation
- **Real-time Sync**: All assignment changes are published to Redis Streams immediately

## 🚀 Features

- **Real-time Events**: Organization assignment changes are published immediately
- **Event Types**: Created, Updated, Deactivated, Activated, Deleted
- **Reliable Delivery**: Redis Streams ensure message persistence and acknowledgment
- **Bulk Operations**: Support for bulk assignment operations
- **Consumer Management**: Automatic consumer group management and health monitoring

## 🔄 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Routes  │───▶│ Redis Streams   │───▶│   Consumers     │
│                 │    │                 │    │                 │
│ • Assign User   │    │ • crm-events    │    │ • CRM System    │
│ • Update Assign │    │ • crm-consumers │    │ • Analytics     │
│ • Remove Assign │    │                 │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📡 API Endpoints

### Base URL: `/api/tenants/current`

### GET `/organization-assignments`
Get all organization assignments for the current tenant.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "assignmentId": "user_org_1234567890",
      "userId": "a5c53dc2-fd8a-40ae-8704-59add9cf5d93",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "organizationId": "4b9fe8ea-6b18-40e8-b90a-044ab1db132a",
      "organizationName": "Engineering Department",
      "organizationCode": "ENG-DEPT",
      "assignmentType": "primary",
      "isActive": true,
      "assignedAt": "2025-01-10T10:00:00.000Z",
      "priority": 1
    }
  ]
}
```

### POST `/users/:userId/assign-organization`
Assign a user to an organization within the tenant.

**Request Body:**
```json
{
  "organizationId": "4b9fe8ea-6b18-40e8-b90a-044ab1db132a",
  "assignmentType": "primary",
  "priority": 1,
  "metadata": {
    "department": "Engineering",
    "designation": "Developer"
  }
}
```

### PUT `/users/:userId/update-organization`
Update a user's organization assignment within the tenant.

**Request Body:**
```json
{
  "organizationId": "4b9fe8ea-6b18-40e8-b90a-044ab1db132a",
  "changes": {
    "assignmentType": "secondary",
    "isActive": true,
    "priority": 2
  }
}
```

### DELETE `/users/:userId/remove-organization`
Remove a user from an organization within the tenant.

**Request Body:**
```json
{
  "organizationId": "4b9fe8ea-6b18-40e8-b90a-044ab1db132a",
  "reason": "permanent_removal"
}
```

### POST `/users/bulk-assign-organizations`
Bulk assign multiple users to organizations within the tenant.

**Request Body:**
```json
{
  "assignments": [
    {
      "userId": "user1-id",
      "organizationId": "org1-id",
      "assignmentType": "primary"
    },
    {
      "userId": "user2-id",
      "organizationId": "org2-id",
      "assignmentType": "secondary"
    }
  ]
}
```

### POST `/users/invite` (Enhanced)
Invite a user to the tenant and optionally assign them to an organization.

**Request Body:**
```json
{
  "email": "john@example.com",
  "roleId": "role-uuid",
  "organizationId": "4b9fe8ea-6b18-40e8-b90a-044ab1db132a",  // Optional
  "assignmentType": "primary",  // Optional, defaults to "primary"
  "priority": 1,  // Optional, defaults to 1
  "message": "Welcome to our team!"  // Optional
}
```

## 📊 Redis Stream Events

### Stream Configuration
- **Stream Name**: `crm-events`
- **Consumer Group**: `crm-consumers`
- **Max Length**: Auto-trimmed to prevent unbounded growth

### Event Structure
All events follow this base structure:

```json
{
  "eventId": "uuid-v4",
  "eventType": "organization.assignment.{action}",
  "source": "wrapper-app",
  "version": "1.0",
  "timestamp": "ISO-8601-datetime",
  "tenantId": "tenant-uuid",
  "data": { /* event-specific data */ }
}
```

### Event Types

#### `organization.assignment.created`
Published when a user is assigned to an organization.

**Data Structure:**
```json
{
  "assignmentId": "string",
  "userId": "string",
  "organizationId": "string",
  "organizationCode": "string",
  "assignmentType": "primary|secondary|temporary|guest",
  "isActive": true,
  "assignedAt": "ISO-datetime",
  "priority": 1,
  "assignedBy": "string",
  "metadata": {}
}
```

#### `organization.assignment.updated`
Published when an assignment is modified.

**Data Structure:**
```json
{
  "assignmentId": "string",
  "userId": "string",
  "organizationId": "string",
  "changes": {
    "assignmentType": "secondary",
    "isActive": false,
    "priority": 2
  },
  "updatedBy": "string"
}
```

#### `organization.assignment.deactivated`
Published when an assignment is temporarily disabled.

**Data Structure:**
```json
{
  "assignmentId": "string",
  "userId": "string",
  "organizationId": "string",
  "deactivatedBy": "string",
  "reason": "temporary_leave|policy_violation"
}
```

#### `organization.assignment.activated`
Published when a deactivated assignment is re-enabled.

**Data Structure:**
```json
{
  "assignmentId": "string",
  "userId": "string",
  "organizationId": "string",
  "activatedBy": "string"
}
```

#### `organization.assignment.deleted`
Published when an assignment is permanently removed.

**Data Structure:**
```json
{
  "assignmentId": "string",
  "userId": "string",
  "organizationId": "string",
  "deletedBy": "string",
  "reason": "permanent_removal|user_departure"
}
```

## 🔧 Consumer Implementation

### Starting the Consumer
```bash
# Run the consumer
node src/services/organization-assignment-consumer.js

# Or run in background
nohup node src/services/organization-assignment-consumer.js &
```

### Consumer Features
- **Auto Consumer Group Creation**: Creates consumer group if it doesn't exist
- **Message Acknowledgment**: Properly acknowledges processed messages
- **Error Handling**: Continues processing despite individual message failures
- **Health Monitoring**: Provides metrics on consumer lag and performance

### Consumer Health Check
```javascript
import { checkConsumerHealth } from './src/services/organization-assignment-consumer.js';

const health = await checkConsumerHealth();
console.log(`Pending messages: ${health.pendingMessages}`);
```

## 🧪 Testing

### Run Test Suite
```bash
# Run all organization assignment tests
node test-organization-assignments.js
```

### Test Individual Events
```bash
# Test assignment created event
node -e "
import { testAssignmentCreated } from './test-organization-assignments.js';
await testAssignmentCreated();
"
```

### Check Stream Health
```bash
# View stream information
node -e "
import { checkStreamHealth } from './test-organization-assignments.js';
await checkStreamHealth();
"
```

### View Recent Messages
```bash
# View last 10 messages
node -e "
import { viewRecentMessages } from './test-organization-assignments.js';
await viewRecentMessages(10);
"
```

## 📈 Monitoring & Metrics

### Key Metrics to Monitor
- **Publish Rate**: Events published per minute
- **Consumer Lag**: Pending messages in queue
- **Error Rate**: Failed publish/consume operations
- **Assignment Changes**: Daily assignment activity

### Health Checks
```javascript
// Check Redis connection
const redisHealth = await redisManager.isConnected;

// Check stream info
const streamInfo = await redis.client.xInfo('STREAM', 'crm-events');

// Check consumer lag
const pending = await redis.client.xPending('crm-events', 'crm-consumers');
```

## 🔧 Configuration

### Environment Variables
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password  # if required

# Application Settings
TENANT_ID=your-tenant-id

# Consumer Settings
CONSUMER_NAME=org-assignment-consumer-${hostname}
CONSUMER_GROUP=crm-consumers
STREAM_NAME=crm-events
```

### Consumer Group Management
```javascript
// Reset consumer group (for testing)
await redis.client.xGroupDestroy('crm-events', 'crm-consumers');
await redis.client.xGroupCreate('crm-events', 'crm-consumers', '0');
```

## 🚨 Error Handling

### Publish Failures
```javascript
try {
  await OrganizationAssignmentService.publishOrgAssignmentCreated(assignmentData);
} catch (error) {
  console.error('Failed to publish assignment event:', error);
  // Assignment still succeeds, but event is lost
  // Consider implementing retry logic or dead letter queue
}
```

### Consumer Errors
```javascript
// Consumer continues processing despite individual failures
try {
  await processOrgAssignmentEvent(eventType, eventData);
  await redis.client.xAck(streamKey, consumerGroup, messageId);
} catch (error) {
  console.error(`Failed to process message ${messageId}:`, error);
  // Message remains unacknowledged for retry
}
```

## 🔄 Integration Examples

### Invitation Workflow
```javascript
// 1. Invite user with organization assignment
const inviteResponse = await fetch('/api/tenants/current/users/invite', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    email: 'john@example.com',
    roleId: 'developer-role-id',
    organizationId: 'engineering-org-id',
    assignmentType: 'primary',
    message: 'Welcome to Engineering team!'
  })
});

// 2. User accepts invitation (organization assignment applied automatically)
const acceptResponse = await fetch(`/api/tenants/invite/${token}/accept`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' }
});

// 3. Redis event published automatically:
// {
//   "eventId": "uuid",
//   "eventType": "organization.assignment.created",
//   "source": "wrapper-app",
//   "data": {
//     "assignmentId": "user_org_timestamp",
//     "userId": "user-id",
//     "organizationId": "engineering-org-id",
//     "assignmentType": "primary",
//     "assignedBy": "inviter-id",
//     "metadata": { "source": "invitation_acceptance" }
//   }
// }
```

### CRM System Integration
```javascript
// In CRM system consumer
async function handleOrgAssignmentCreated(assignmentData) {
  // Update user-organization relationship in CRM
  await crmApi.updateUserOrganization({
    userId: assignmentData.userId,
    organizationId: assignmentData.organizationId,
    role: assignmentData.assignmentType
  });

  // Send notification
  await notificationService.sendAssignmentNotification(assignmentData);
}
```

### Analytics Integration
```javascript
// Track assignment changes for analytics
async function trackAssignmentMetrics(assignmentData) {
  await analytics.track('organization_assignment', {
    tenantId: assignmentData.tenantId,
    userId: assignmentData.userId,
    organizationId: assignmentData.organizationId,
    action: assignmentData.eventType.split('.').pop(),
    timestamp: assignmentData.timestamp
  });
}
```

## 📋 Data Flow

1. **Assignment Request** → Admin API validates and updates database
2. **Event Publishing** → Redis Stream receives assignment event
3. **Consumer Processing** → CRM and other systems consume events
4. **Acknowledgment** → Successful processing acknowledged
5. **Monitoring** → Health checks and metrics collected

## 🔐 Security Considerations

- **Authentication**: All admin routes require authentication
- **Authorization**: Users must have admin privileges
- **Data Validation**: Input validation on all endpoints
- **Rate Limiting**: Consider implementing rate limits for bulk operations

## 🚀 Production Deployment

### Consumer Scaling
```javascript
// Run multiple consumer instances
for (let i = 0; i < numInstances; i++) {
  spawn('node', ['src/services/organization-assignment-consumer.js'], {
    env: { ...process.env, CONSUMER_NAME: `consumer-${i}` }
  });
}
```

### Stream Maintenance
```javascript
// Periodic cleanup (run as cron job)
const cleanupOldMessages = async () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const cutoff = Date.now() - maxAge;

  await redis.client.xTrim('crm-events', 'MINID', cutoff);
};
```

## 📞 Support

### Troubleshooting
1. **High Consumer Lag**: Check consumer processing logic and scale consumers
2. **Publish Failures**: Verify Redis connection and stream permissions
3. **Duplicate Events**: Implement idempotency in consumer logic
4. **Stream Full**: Configure appropriate max length and cleanup policies

### Getting Help
- Check Redis connection logs
- Monitor consumer acknowledgment rates
- Verify event data structure compliance
- Test with small data sets first

---

*This Redis Streams integration ensures reliable, real-time organization assignment synchronization across all connected systems.*
