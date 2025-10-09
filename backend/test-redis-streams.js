#!/usr/bin/env node

/**
 * Quick Redis Streams Test for CRM Sync
 */

import Redis from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function testRedisStreams() {
  console.log('🔍 Testing Redis Streams Connection');
  console.log('====================================');
  console.log(`📡 Redis URL: ${redisUrl}`);
  console.log('');

  const client = Redis.createClient({ url: redisUrl });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Test basic ping
    const ping = await client.ping();
    console.log(`🏓 Ping response: ${ping}`);

    // Check for CRM sync streams
    const streamKeys = await client.keys('crm:sync:*');
    console.log(`📊 Found ${streamKeys.length} CRM sync streams:`);

    if (streamKeys.length === 0) {
      console.log('❌ No streams found. Try making some changes to trigger events.');
      console.log('');
      console.log('💡 Expected streams:');
      console.log('   • crm:sync:user:user_created');
      console.log('   • crm:sync:user:user_deactivated');
      console.log('   • crm:sync:permissions:role_assigned');
      console.log('   • crm:sync:permissions:role_unassigned');
      console.log('   • crm:sync:organization:org_created');
      console.log('   • crm:sync:credits:credit_allocated');
      console.log('   • crm:sync:credits:credit_config_updated');
    } else {
      for (const streamKey of streamKeys) {
        console.log(`\n🔗 ${streamKey}:`);

        try {
          const info = await client.xInfoStream(streamKey);
          console.log(`   📈 Length: ${info.length} messages`);

          // Get recent messages
          const messages = await client.xRevRange(streamKey, '+', '-', 'COUNT', 3);
          console.log(`   📨 Recent messages: ${messages.length}`);

          if (messages.length > 0) {
            messages.forEach((msg, i) => {
              console.log(`      ${i + 1}. ${msg.message.eventType} - ${msg.message.timestamp}`);
              try {
                const data = JSON.parse(msg.message.data);
                if (msg.message.eventType === 'credit_config_updated') {
                  console.log(`         ⚙️ ${data.operationCode}: ${data.previousConfig?.creditCost || 'N/A'} → ${data.creditCost}`);
                } else if (msg.message.eventType.includes('user_')) {
                  console.log(`         👤 ${data.email || data.userId}`);
                } else if (msg.message.eventType.includes('role_')) {
                  console.log(`         👥 ${data.userId} → ${data.roleId}`);
                }
              } catch (e) {
                console.log(`         📊 ${msg.message.data.substring(0, 50)}...`);
              }
            });
          }
        } catch (error) {
          console.log(`   ❌ Error reading stream: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Redis Streams test completed successfully!');

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('1. Check REDIS_URL in .env file');
    console.log('2. Verify Redis Cloud credentials');
    console.log('3. Ensure Redis Cloud instance is running');
    console.log('4. Check network connectivity to Redis Cloud');
  } finally {
    await client.quit();
  }
}

testRedisStreams();
