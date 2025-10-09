#!/usr/bin/env node

/**
 * Test script to verify activity logging is working correctly
 */

import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from './backend/src/services/activityLogger.js';
import { db } from './backend/src/db/index.js';

async function testActivityLogging() {
  console.log('🧪 Testing Activity Logging System...');

  try {
    // Test basic activity logging
    console.log('📝 Testing basic activity log...');
    const result = await ActivityLogger.logActivity(
      'test-user-123',
      'test-tenant-456',
      null,
      ACTIVITY_TYPES.USER_PROFILE_UPDATED,
      {
        test: true,
        userId: 'test-user-123',
        updatedFields: ['name', 'email']
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        sessionId: 'test-session-789'
      }
    );

    console.log('✅ Basic activity log result:', result);

    // Test audit event logging
    console.log('📋 Testing audit event log...');
    const auditResult = await ActivityLogger.logAuditEvent(
      'test-tenant-456',
      'test-user-123',
      'test_action',
      RESOURCE_TYPES.USER,
      'test-resource-999',
      {
        oldValues: { name: 'Old Name' },
        newValues: { name: 'New Name' },
        details: { reason: 'test update' }
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        sessionId: 'test-session-789'
      }
    );

    console.log('✅ Audit event log result:', auditResult);

    // Test getting activity logs
    console.log('🔍 Testing activity log retrieval...');
    const activities = await ActivityLogger.getUserActivity('test-user-123', {
      limit: 10,
      includeMetadata: true
    });

    console.log('✅ Retrieved activities:', activities.activities?.length || 0);

    // Test getting tenant audit logs
    console.log('📊 Testing tenant audit log retrieval...');
    const auditLogs = await ActivityLogger.getTenantAuditLogs('test-tenant-456', {
      limit: 10,
      includeDetails: true
    });

    console.log('✅ Retrieved audit logs:', auditLogs.logs?.length || 0);

    console.log('🎉 All activity logging tests completed successfully!');

  } catch (error) {
    console.error('❌ Activity logging test failed:', error);
    process.exit(1);
  }
}

// Run the test
testActivityLogging().then(() => {
  console.log('✅ Test script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
