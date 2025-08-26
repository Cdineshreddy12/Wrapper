#!/usr/bin/env node

import { UserClassificationService } from './src/services/user-classification-service.js';

async function testClassification() {
  try {
    console.log('🧪 Testing UserClassificationService...');
    
    const tenantId = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
    
    const result = await UserClassificationService.classifyUsersByApplication(tenantId);
    
    console.log('\n✅ Classification Result:');
    console.log('Summary:', JSON.stringify(result.summary, null, 2));
    console.log('\nApplications:', Object.keys(result.byApplication));
    console.log('Users:', Object.keys(result.byUser));
    
    // Check specific data
    console.log('\n📊 Application Breakdown:');
    Object.entries(result.byApplication).forEach(([appCode, appData]) => {
      console.log(`  ${appCode}: ${appData.totalUsers} users`);
    });
    
    console.log('\n👥 User Details:');
    Object.entries(result.byUser).forEach(([userId, userData]) => {
      console.log(`  ${userData.name} (${userData.email}):`);
      console.log(`    Admin: ${userData.isTenantAdmin}`);
      console.log(`    Apps: ${userData.allowedApplications.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testClassification();
