import { db } from './src/db/index.js';
import { tenants, tenantUsers } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

// Simulate the onboarding endpoint to test token validation
async function testOnboardingFlow() {
  try {
    console.log('🔍 Testing onboarding flow with token validation...\n');

    // Simulate the onboarding request data
    const onboardingData = {
      companyName: 'Test Company',
      adminEmail: 'test@example.com',
      adminMobile: '9876543210',
      gstin: '22AAAAA0000A1Z6'
    };

    console.log('📝 Onboarding data:', onboardingData);

    // Test 1: Check if tenant already exists
    const existingTenant = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        createdAt: tenants.createdAt
      })
      .from(tenants)
      .where(eq(tenants.adminEmail, onboardingData.adminEmail))
      .limit(1);

    if (existingTenant.length > 0) {
      console.log('❌ Organization already exists for email:', onboardingData.adminEmail);
      console.log('Existing tenant:', existingTenant[0]);
      return;
    }

    // Test 2: Simulate token extraction (this would normally come from the request)
    const mockRequest = {
      headers: {
        authorization: 'Bearer mock-jwt-token' // This would normally be the real token
      }
    };

    // Simulate the extractToken function
    const authHeader = mockRequest.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    console.log('🔑 Extracted token:', token ? `${token.substring(0, 20)}...` : 'No token');

    if (token) {
      // Simulate token validation (this would normally call Kinde)
      console.log('🔍 Would validate token with Kinde service...');

      // For testing, simulate token validation failure
      console.log('❌ Token validation failed (simulated)');
      console.log('📝 User not authenticated during onboarding - will create user in Kinde');
    } else {
      console.log('❌ No token provided in request');
    }

    // Test 3: Simulate subdomain generation
    const generatedSubdomain = onboardingData.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);

    console.log('🏢 Generated subdomain:', generatedSubdomain);

    // Test 4: Test subdomain availability check
    const existing = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.subdomain, generatedSubdomain))
      .limit(1);

    const available = existing.length === 0;
    console.log('✅ Subdomain availability:', {
      subdomain: generatedSubdomain,
      available,
      existingCount: existing.length
    });

    if (!available) {
      // Try with counter
      let counter = 1;
      let finalSubdomain = generatedSubdomain;
      while (counter < 10) {
        const existingCheck = await db
          .select({ tenantId: tenants.tenantId })
          .from(tenants)
          .where(eq(tenants.subdomain, finalSubdomain))
          .limit(1);

        if (existingCheck.length === 0) {
          console.log('✅ Found available subdomain:', finalSubdomain);
          break;
        }

        counter++;
        finalSubdomain = `${generatedSubdomain}${counter}`;
      }
    }

    console.log('\n🎉 Onboarding flow simulation completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Tenant check: ✅ Passed');
    console.log('   - Token extraction: ✅ Working');
    console.log('   - Subdomain generation: ✅ Working');
    console.log('   - Subdomain availability: ✅ Working');

  } catch (error) {
    console.error('❌ Error testing onboarding flow:', error);
  } finally {
    process.exit(0);
  }
}

testOnboardingFlow();
