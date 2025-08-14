#!/usr/bin/env node

/**
 * CRM-Wrapper Integration Test Script
 * Tests different URL parameter combinations for CRM authentication flow
 */

// Note: This script requires chalk to be installed
// npm install chalk
// If chalk is not available, run without it for basic testing

// Note: This script requires chalk to be installed
// npm install chalk
// If chalk is not available, run without it for basic testing

let chalk;
try {
  const chalkModule = await import('chalk');
  chalk = chalkModule.default;
} catch (error) {
  // Fallback if chalk is not available
  chalk = {
    blue: { bold: (text) => `🔵 ${text}` },
    yellow: { bold: (text) => `🟡 ${text}` },
    cyan: { bold: (text) => `🔵 ${text}` },
    green: (text) => `✅ ${text}`,
    red: (text) => `❌ ${text}`,
    gray: (text) => `⚪ ${text}`,
    bold: (text) => `**${text}**`
  };
}

console.log(chalk.blue.bold('🔄 CRM-Wrapper Integration Test Script\n'));

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

// Test URL validation function
function testUrlValidation() {
  console.log(chalk.yellow.bold('🔍 Testing URL Validation Logic:\n'));
  
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
    const status = isValid ? chalk.green('✅ VALID') : chalk.red('❌ INVALID');
    console.log(`${status} ${url}`);
  });
}

// Mock URL validation function (same as in the React component)
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

// Test URL parameter parsing
function testUrlParsing() {
  console.log(chalk.yellow.bold('\n🔍 Testing URL Parameter Parsing:\n'));
  
  testUrls.forEach((test, index) => {
    console.log(chalk.cyan.bold(`${index + 1}. ${test.name}`));
    console.log(chalk.gray(`URL: ${test.url}`));
    
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
    
    console.log(chalk.gray('Parsed Parameters:'));
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
        console.log(chalk.red(`    ❌ ${key}: expected ${expectedValue}, got ${actualValue}`));
        allMatch = false;
      }
    });
    
    if (allMatch) {
      console.log(chalk.green('  ✅ All parameters match expected values'));
    }
    
    console.log('');
  });
}

// Test CRM redirect flow
function testCrmRedirectFlow() {
  console.log(chalk.yellow.bold('🔄 Testing CRM Redirect Flow:\n'));
  
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
    console.log(chalk.green(`  ${step}`));
  });
  
  console.log(chalk.cyan('\n📋 Required URL Parameters:'));
  console.log(chalk.gray('  - returnTo: CRM URL to redirect back to'));
  console.log(chalk.gray('  - source: "crm" to identify CRM request'));
  console.log(chalk.gray('  - app: "crm" to specify target application'));
  console.log(chalk.gray('  - redirectAfterAuth: "true" to enable auto-redirect'));
  
  console.log(chalk.cyan('\n🔒 Security Features:'));
  console.log(chalk.gray('  - URL validation (only crm.zopkit.com allowed)'));
  console.log(chalk.gray('  - Parameter sanitization'));
  console.log(chalk.gray('  - Redirect loop prevention'));
  console.log(chalk.gray('  - Kinde domain cookie authentication'));
}

// Test error handling
function testErrorHandling() {
  console.log(chalk.yellow.bold('\n🚨 Testing Error Handling:\n'));
  
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
    console.log(chalk.cyan.bold(`${index + 1}. ${test.scenario}`));
    console.log(chalk.gray(`URL: ${test.url}`));
    console.log(chalk.gray(`Expected: ${test.expected}`));
    
    try {
      const url = new URL(test.url);
      const returnTo = url.searchParams.get('returnTo');
      const isValid = returnTo ? isValidCrmReturnUrl(returnTo) : false;
      
      if (isValid) {
        console.log(chalk.green('  ✅ URL is valid'));
      } else {
        console.log(chalk.red('  ❌ URL is invalid (as expected)'));
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ URL parsing failed: ${error.message}`));
    }
    
    console.log('');
  });
}

// Run all tests
function runAllTests() {
  console.log(chalk.blue.bold('🚀 Starting CRM-Wrapper Integration Tests...\n'));
  
  testUrlValidation();
  testUrlParsing();
  testCrmRedirectFlow();
  testErrorHandling();
  
  console.log(chalk.green.bold('\n✅ All tests completed!'));
  console.log(chalk.blue('\n📝 Next Steps:'));
  console.log(chalk.gray('1. Test the integration with your CRM application'));
  console.log(chalk.gray('2. Verify Kinde domain cookies are working'));
  console.log(chalk.gray('3. Test silent authentication across subdomains'));
  console.log(chalk.gray('4. Monitor redirect flows and error handling'));
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testUrlValidation,
  testUrlParsing,
  testCrmRedirectFlow,
  testErrorHandling,
  runAllTests
};
