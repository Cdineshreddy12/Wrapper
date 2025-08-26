#!/usr/bin/env node

import { UserClassificationService } from './src/services/user-classification-service.js';

async function testResponseStructure() {
  try {
    console.log('🧪 Testing Response Structure...');
    
    const tenantId = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
    
    // Get the raw data from the service
    const rawData = await UserClassificationService.classifyUsersByApplication(tenantId);
    
    console.log('\n📊 Raw Service Data:');
    console.log('Summary:', JSON.stringify(rawData.summary, null, 2));
    console.log('byApplication keys:', Object.keys(rawData.byApplication));
    console.log('byUser keys:', Object.keys(rawData.byUser));
    
    // Simulate the route response structure
    const cleanClassification = {
      summary: {
        totalUsers: rawData.summary.totalUsers,
        applicationBreakdown: rawData.summary.applicationBreakdown,
        subscriptionBreakdown: rawData.summary.subscriptionBreakdown
      },
      byApplication: {},
      byUser: {}
    };

    // Clean byApplication data (exactly like the route does)
    Object.keys(rawData.byApplication).forEach(appCode => {
      const appData = rawData.byApplication[appCode];
      
      let usersArray = [];
      try {
        if (appData.users && Array.isArray(appData.users)) {
          usersArray = appData.users.map(user => ({
            userId: user.userId,
            email: user.email || '',
            name: user.name || '',
            isTenantAdmin: user.isTenantAdmin || false
          }));
        }
      } catch (error) {
        console.log(`⚠️ Error processing users for ${appCode}:`, error);
      }
      
      cleanClassification.byApplication[appCode] = {
        appCode: appData.appInfo.appCode,
        appName: appData.appInfo.appName,
        description: appData.appInfo.description,
        icon: appData.appInfo.icon,
        baseUrl: appData.appInfo.baseUrl,
        userCount: appData.totalUsers || appData.userCount || 0,
        totalUsers: appData.totalUsers || appData.userCount || 0,
        users: usersArray
      };
    });

    // Clean byUser data
    Object.keys(rawData.byUser).forEach(userId => {
      const userData = rawData.byUser[userId];
      cleanClassification.byUser[userId] = {
        name: userData.name || '',
        email: userData.email || '',
        allowedApps: userData.allowedApplications || [],
        isTenantAdmin: userData.isTenantAdmin || false
      };
    });

    console.log('\n📊 Cleaned Classification Data:');
    console.log('Summary:', JSON.stringify(cleanClassification.summary, null, 2));
    console.log('byApplication keys:', Object.keys(cleanClassification.byApplication));
    console.log('byUser keys:', Object.keys(cleanClassification.byUser));
    
    // Test JSON serialization
    try {
      const testSerialization = JSON.stringify(cleanClassification);
      console.log('\n✅ JSON Serialization Test:');
      console.log('Length:', testSerialization.length);
      console.log('First 500 chars:', testSerialization.substring(0, 500));
    } catch (error) {
      console.error('❌ Serialization failed:', error);
    }
    
    // Test the final response structure
    const finalResponse = {
      success: true,
      data: cleanClassification,
      message: `Classified ${rawData.summary.totalUsers} users across ${Object.keys(rawData.byApplication).length} applications`
    };
    
    console.log('\n📊 Final Response Structure:');
    console.log('Response keys:', Object.keys(finalResponse));
    console.log('Data keys:', Object.keys(finalResponse.data));
    console.log('Message:', finalResponse.message);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testResponseStructure();
