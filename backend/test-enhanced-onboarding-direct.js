#!/usr/bin/env node

/**
 * Direct Test of Enhanced Onboarding Service
 * 
 * This script tests the enhanced onboarding service directly without
 * starting the full server, to avoid any startup issues.
 */

import { config } from 'dotenv';
import EnhancedOnboardingService from './src/services/enhanced-onboarding-service.js';

// Load environment variables
config();

async function testEnhancedOnboarding() {
  console.log('🧪 Testing Enhanced Onboarding Service Directly');
  console.log('=' .repeat(50));

  const onboardingService = EnhancedOnboardingService;

  const testData = {
    organizationName: "Test Corp " + Date.now(),
    gstin: "22AAAAA0000A1Z" + Math.floor(Math.random() * 9 + 1),
    mobile: "9876543210",
    adminEmail: "admin" + Date.now() + "@test.com",
    adminName: "Test Admin"
  };

  console.log('📝 Test data:', testData);

  try {
    console.log('\n🚀 Starting enhanced onboarding...');
    
    const result = await onboardingService.createEnhancedOrganization(testData);

    console.log('\n✅ Enhanced onboarding completed successfully!');
    console.log('📊 Results:');
    console.log('- Success:', result.success);
    console.log('- Message:', result.message);
    
    if (result.data) {
      console.log('\n📋 Onboarding Data:');
      console.log('- Tenant ID:', result.data.tenantId);
      console.log('- User ID:', result.data.userId);
      console.log('- Kinde Org ID:', result.data.kindeOrgId);
      console.log('- Subdomain:', result.data.subdomain);
      console.log('- Full Domain:', result.data.fullDomain);
      console.log('- Trial Ends:', result.data.trialEndsAt);
      console.log('- Free Credits:', result.data.freeCredits);
      console.log('- Onboarding Status:', result.data.onboardingStatus);
      console.log('- Access Token:', result.data.accessToken ? '✅ Provided' : '❌ Missing');
      
      if (result.data.dnsSetup) {
        console.log('\n🌐 DNS Setup:');
        console.log('- Subdomain:', result.data.dnsSetup.subdomain);
        console.log('- Full Domain:', result.data.dnsSetup.fullDomain);
        console.log('- Target:', result.data.dnsSetup.target);
        console.log('- DNS Change ID:', result.data.dnsSetup.dnsChangeId);
        console.log('- Is Mock:', result.data.dnsSetup.isMock || false);
      }
    }

    console.log('\n🎉 Test completed successfully!');
    return { success: true, result };

  } catch (error) {
    console.error('\n❌ Enhanced onboarding test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
testEnhancedOnboarding().then(result => {
  if (result.success) {
    console.log('\n🏁 All tests passed! Enhanced onboarding is working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 Tests failed. Please check the error details above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
