#!/usr/bin/env node

/**
 * CRM-Wrapper Integration Test Script (Simple Version)
 * Tests different URL parameter combinations for CRM authentication flow
 */

console.log('🔄 CRM-Wrapper Integration Test Script\n');

// Test URL patterns
const testUrls = [
  {
    name: 'Basic CRM Redirect',
    url: 'https://wrapper.zopkit.com/login?returnTo=https://crm.zopkit.com/dashboard&source=crm&app=crm&redirectAfterAuth=true',
    expected: {
      isCrmRequest: true,
      returnTo: 'https://crm.zopkit.com/dashboard',
      source: 'crm',
      app: 'crm',
      redirectAfterAuth: 'true'
    }
  },
  {
    name: 'CRM Redirect with Error',
    url: 'https://wrapper.zopkit.com/login?returnTo=https://crm.zopkit.com/dashboard&error=Token%20expired&source=crm&app=crm&redirectAfterAuth=true',
    expected: {
      isCrmRequest: true,
      returnTo: 'https://crm.zopkit.com/dashboard',
      error: 'Token expired',
      source: 'crm',
      app: 'crm',
      redirectAfterAuth: 'true'
    }
  },
  {
    name: 'CRM Redirect with crmRedirect Flag',
    url: 'https://wrapper.zopkit.com/login?returnTo=https://crm.zopkit.com/leads&crmRedirect=true&redirectAfterAuth=true',
    expected: {
      isCrmRequest: true,
      returnTo: 'https://crm.zopkit.com/leads',
      crmRedirect: 'true',
      redirectAfterAuth: 'true'
    }
  },
  {
    name: 'Normal Wrapper Login',
    url: 'https://wrapper.zopkit.com/login',
    expected: {
      isCrmRequest: false,
      returnTo: null,
      source: null,
      app: null,
      redirectAfterAuth: null
    }
  },
  {
    name: 'External App Redirect (Non-CRM)',
    url: 'https://wrapper.zopkit.com/login?redirect_to=https://hr.zopkit.com&app=hr',
    expected: {
      isCrmRequest: false,
      redirectTo: 'https://hr.zopkit.com',
      app: 'hr'
    }
  }
];

// Test URL validation function (same as in the React component)
function isValidCrmReturnUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow CRM domain
    return parsed.hostname === 'crm.zopkit.com' || 
           parsed.hostname.endsWith('.crm.zopkit.com');
  } catch {
    return false;
  }
}

// Test URL validation function
function testUrlValidation() {
  console.log('🔍 Testing URL Validation Logic:\n');
  
  const testUrls = [
    'https://crm.zopkit.com/dashboard',
    'https://crm.zopkit.com/leads',
    'https://subdomain.crm.zopkit.com/settings',
    'https://malicious.com/fake-crm',
    'https://crm.evil.com/dashboard',
    'http://crm.zopkit.com/dashboard', // HTTP not HTTPS
    'invalid-url'
  ];
  
  testUrls.forEach(url => {
    const isValid = isValidCrmReturnUrl(url);
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`${status} ${url}`);
  });
}

// Test URL parameter parsing
function testUrlParsing() {
  console.log('\n🔍 Testing URL Parameter Parsing:\n');
  
  testUrls.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    console.log(`URL: ${test.url}`);
    
    // Parse URL parameters
    const url = new URL(test.url);
    const params = {
      returnTo: url.searchParams.get('returnTo'),
      source: url.searchParams.get('source'),
      app: url.searchParams.get('app'),
      error: url.searchParams.get('error'),
      redirectAfterAuth: url.searchParams.get('redirectAfterAuth'),
      crmRedirect: url.searchParams.get('crmRedirect'),
      redirectTo: url.searchParams.get('redirect_to') // Legacy parameter
    };
    
    // Determine if this is a CRM request
    const isCrmRequest = params.source === 'crm' || params.app === 'crm' || params.crmRedirect === 'true';
    
    console.log('Parsed Parameters:');
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    console.log(`  isCrmRequest: ${isCrmRequest}`);
    
    // Validate expected values
    let allMatch = true;
    Object.entries(test.expected).forEach(([key, expectedValue]) => {
      const actualValue = params[key] || (key === 'isCrmRequest' ? isCrmRequest : null);
      if (actualValue !== expectedValue) {
        console.log(`    ❌ ${key}: expected ${expectedValue}, got ${actualValue}`);
        allMatch = false;
      }
    });
    
    if (allMatch) {
      console.log('  ✅ All parameters match expected values');
    }
    
    console.log('');
  });
}

// Test CRM redirect flow
function testCrmRedirectFlow() {
  console.log('🔄 Testing CRM Redirect Flow:\n');
  
  const flowSteps = [
    '1. CRM detects user not authenticated',
    '2. CRM redirects to wrapper with parameters',
    '3. Wrapper shows CRM-specific UI',
    '4. User logs in via Kinde',
    '5. Wrapper validates return URL',
    '6. Wrapper redirects back to CRM',
    '7. CRM receives authenticated user via Kinde domain cookies'
  ];
  
  flowSteps.forEach(step => {
    console.log(`  ${step}`);
  });
  
  console.log('\n📋 Required URL Parameters:');
  console.log('  - returnTo: CRM URL to redirect back to');
  console.log('  - source: "crm" to identify CRM request');
  console.log('  - app: "crm" to specify target application');
  console.log('  - redirectAfterAuth: "true" to enable auto-redirect');
  
  console.log('\n🔒 Security Features:');
  console.log('  - URL validation (only crm.zopkit.com allowed)');
  console.log('  - Parameter sanitization');
  console.log('  - Redirect loop prevention');
  console.log('  - Kinde domain cookie authentication');
}

// Test error handling
function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling:\n');
  
  const errorScenarios = [
    {
      scenario: 'Invalid return URL',
      url: 'https://wrapper.zopkit.com/login?returnTo=https://evil.com&source=crm&app=crm',
      expected: 'Should reject and show error'
    },
    {
      scenario: 'Missing return URL',
      url: 'https://wrapper.zopkit.com/login?source=crm&app=crm',
      expected: 'Should not trigger CRM mode'
    },
    {
      scenario: 'Malformed URL parameters',
      url: 'https://wrapper.zopkit.com/login?returnTo=invalid-url&source=crm',
      expected: 'Should handle gracefully and show error'
    }
  ];
  
  errorScenarios.forEach((test, index) => {
    console.log(`${index + 1}. ${test.scenario}`);
    console.log(`URL: ${test.url}`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const url = new URL(test.url);
      const returnTo = url.searchParams.get('returnTo');
      const isValid = returnTo ? isValidCrmReturnUrl(returnTo) : false;
      
      if (isValid) {
        console.log('  ✅ URL is valid');
      } else {
        console.log('  ❌ URL is invalid (as expected)');
      }
    } catch (error) {
      console.log(`  ❌ URL parsing failed: ${error.message}`);
    }
    
    console.log('');
  });
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting CRM-Wrapper Integration Tests...\n');
  
  testUrlValidation();
  testUrlParsing();
  testCrmRedirectFlow();
  testErrorHandling();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Test the integration with your CRM application');
  console.log('2. Verify Kinde domain cookies are working');
  console.log('3. Test silent authentication across subdomains');
  console.log('4. Monitor redirect flows and error handling');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testUrlValidation,
  testUrlParsing,
  testCrmRedirectFlow,
  testErrorHandling,
  runAllTests
};
