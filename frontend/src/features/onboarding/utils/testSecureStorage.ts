/**
 * Test script for secure storage functionality
 * This can be run in browser console for testing
 */

import { secureStore, secureRetrieve, secureClear } from './secureStorage';
import { sanitizeFormData } from './sanitization';
import { validateFormDataSecurity } from './securityValidations';

// Test data
const testFormData = {
  firstName: 'John',
  lastName: 'Doe',
  adminEmail: 'john.doe@company.com',
  adminMobile: '+91-9876543210',
  gstin: '22AAAAA0000A1Z5',
  panNumber: 'AAAPA0000A',
  businessDetails: {
    companyName: 'Test Company Ltd',
    businessType: 'Technology',
    country: 'IN'
  },
  billingStreet: '123 Business Street',
  termsAccepted: true
};

export const testSecureStorage = () => {

  try {
    // Test 1: Sanitization
    const sanitized = sanitizeFormData(testFormData);

    // Test 2: Security validation
    const validation = validateFormDataSecurity(sanitized);

    // Test 3: Secure storage
    secureStore('test_onboarding_data', sanitized);

    // Test 4: Secure retrieval
    const retrieved = secureRetrieve('test_onboarding_data');

    // Test 5: Data integrity
    const isDataIntact = JSON.stringify(sanitized) === JSON.stringify(retrieved);

    // Test 6: Secure clear
    secureClear('test_onboarding_data');
    const cleared = secureRetrieve('test_onboarding_data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Auto-run in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Uncomment to run tests automatically
  // testSecureStorage();
}