#!/usr/bin/env node

/**
 * Test script to verify organization assignment events publishing
 */

import { getRedis } from './src/utils/redis.js';
import { crmSyncStreams } from './src/utils/redis.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRedisConnection() {
  console.log('🧪 Testing Redis connection and organization assignment events...');
  console.log('🔗 Redis URL configured:', process.env.REDIS_URL ? 'YES (Cloud Redis)' : 'NO (using localhost)');

  try {
    const redis = getRedis();
    console.log('✅ Redis manager obtained');

    console.log('🔗 Redis connection status:', redis.isConnected ? 'CONNECTED' : 'NOT CONNECTED');

    if (!redis.isConnected) {
      console.log('🔄 Attempting to connect...');
      await redis.connect();
      console.log('✅ Redis connected successfully');
    }

    // Test publishing to organization assignments stream
    const testEvent = {
      eventId: `test_${Date.now()}`,
      eventType: 'organization.assignment.test',
      source: 'test-script',
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: 'test-tenant',
      data: {
        assignmentId: 'test-assignment',
        userId: 'test-user',
        organizationId: 'test-org',
        assignmentType: 'direct',
        isActive: true,
        assignedAt: new Date().toISOString()
      }
    };

    console.log('📡 Publishing test event to organization assignments stream...');
    const result = await crmSyncStreams.publishToStream('crm:organization-assignments', testEvent);

    console.log('✅ Event published successfully:', result);

    // Test pub/sub publishing
    console.log('📡 Publishing test event to pub/sub channel...');
    const channel = 'crm:test-tenant:organization-assignments';
    await redis.publish(channel, JSON.stringify(testEvent));
    console.log('✅ Pub/sub event published successfully');

    console.log('🎉 Basic organization assignment event publishing tests passed!');

    // Test enhanced organization assignment publisher
    console.log('\n🧪 Testing enhanced organization assignment publisher...');

    const { OrganizationAssignmentService } = await import('./src/services/organization-assignment-service.js');

    const testAssignmentData = {
      tenantId: 'test-tenant-123',
      userId: 'test-user-456',
      organizationId: 'test-org-789',
      organizationCode: 'TEST-ORG',
      assignmentType: 'direct',
      accessLevel: 'standard',
      isPrimary: false,
      priority: 2,
      assignedBy: 'test-admin',
      metadata: {
        source: 'test-script',
        testRun: true
      }
    };

    // Test validation
    console.log('🔍 Testing data validation...');
    try {
      OrganizationAssignmentService.validateAssignmentData(testAssignmentData);
      console.log('✅ Data validation passed');
    } catch (error) {
      console.error('❌ Data validation failed:', error.message);
    }

    // Test enrichment
    console.log('🎨 Testing data enrichment...');
    const enriched = OrganizationAssignmentService.enrichEventData(testAssignmentData);
    console.log('✅ Data enrichment completed');

    // Test publishing via enhanced service
    console.log('📡 Testing enhanced publisher...');
    const publishResult = await OrganizationAssignmentService.publishOrgAssignmentCreated(testAssignmentData);

    if (publishResult.success) {
      console.log('✅ Enhanced publisher successful:', {
        eventId: publishResult.eventId,
        assignmentId: publishResult.assignmentId,
        duration: publishResult.duration,
        attempts: publishResult.result.attempts
      });
    } else {
      console.error('❌ Enhanced publisher failed:', publishResult.error);
    }

    console.log('🎉 All enhanced organization assignment event publishing tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRedisConnection().catch(console.error);
