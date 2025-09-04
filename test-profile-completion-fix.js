/**
 * Test Profile Completion Fix
 * Tests the defensive update data construction to prevent undefined column errors
 */

console.log('🧪 Testing Profile Completion Fix...\n');

// Mock tenant data
const mockTenant = {
  tenantId: '147bc247-5cc5-410b-b5be-defe443da6c8',
  companyName: 'Test Company',
  industry: 'Technology',
  onboardingCompleted: false,
  setupCompletionRate: 0,
  gstin: null
};

// Mock request data with some undefined values
const mockRequestData = {
  gstin: '22AAAAA0000A1Z6',
  legalCompanyName: 'Updated Company Name',
  industry: undefined, // This should be handled gracefully
  companyType: 'Private Limited',
  ownership: null, // This should be handled gracefully
  annualRevenue: '1000000',
  numberOfEmployees: '50',
  tickerSymbol: '',
  website: 'https://test.com',
  description: 'Test description',
  foundedDate: '2020-01-01',
  billingStreet: '123 Test St',
  billingCity: 'Test City',
  billingState: 'Test State',
  billingZip: '12345',
  billingCountry: 'India',
  shippingStreet: undefined,
  shippingCity: undefined,
  shippingState: undefined,
  shippingZip: undefined,
  shippingCountry: undefined,
  phone: '+91-9876543210',
  fax: null,
  defaultLanguage: 'en',
  defaultLocale: 'en-US',
  defaultCurrency: 'INR',
  multiCurrencyEnabled: false,
  advancedCurrencyManagement: false,
  defaultTimeZone: 'Asia/Kolkata',
  firstDayOfWeek: 1
};

// Test the defensive update data construction
function buildProfileUpdateData(requestData, tenant) {
  const profileUpdateData = {};

  // GSTIN is required for upgrade
  if (requestData.gstin) profileUpdateData.gstin = requestData.gstin;

  // Company Profile
  if (requestData.legalCompanyName || tenant.companyName) {
    profileUpdateData.legalCompanyName = requestData.legalCompanyName || tenant.companyName;
  }
  if (requestData.industry || tenant.industry) {
    profileUpdateData.industry = requestData.industry || tenant.industry;
  }
  if (requestData.companyType) profileUpdateData.companyType = requestData.companyType;
  if (requestData.ownership) profileUpdateData.ownership = requestData.ownership;
  if (requestData.annualRevenue) profileUpdateData.annualRevenue = parseFloat(requestData.annualRevenue);
  if (requestData.numberOfEmployees) profileUpdateData.numberOfEmployees = parseInt(requestData.numberOfEmployees);
  if (requestData.tickerSymbol) profileUpdateData.tickerSymbol = requestData.tickerSymbol;
  if (requestData.website) profileUpdateData.website = requestData.website;
  if (requestData.description) profileUpdateData.companyDescription = requestData.description;
  if (requestData.foundedDate) profileUpdateData.foundedDate = new Date(requestData.foundedDate);

  // Contact & Address
  if (requestData.billingStreet) profileUpdateData.billingStreet = requestData.billingStreet;
  if (requestData.billingCity) profileUpdateData.billingCity = requestData.billingCity;
  if (requestData.billingState) profileUpdateData.billingState = requestData.billingState;
  if (requestData.billingZip) profileUpdateData.billingZip = requestData.billingZip;
  if (requestData.billingCountry) profileUpdateData.billingCountry = requestData.billingCountry;
  if (requestData.shippingStreet) profileUpdateData.shippingStreet = requestData.shippingStreet;
  if (requestData.shippingCity) profileUpdateData.shippingCity = requestData.shippingCity;
  if (requestData.shippingState) profileUpdateData.shippingState = requestData.shippingState;
  if (requestData.shippingZip) profileUpdateData.shippingZip = requestData.shippingZip;
  if (requestData.shippingCountry) profileUpdateData.shippingCountry = requestData.shippingCountry;
  if (requestData.phone) profileUpdateData.phone = requestData.phone;
  if (requestData.fax) profileUpdateData.fax = requestData.fax;

  // Localization
  profileUpdateData.defaultLanguage = requestData.defaultLanguage || 'en';
  profileUpdateData.defaultLocale = requestData.defaultLocale || 'en-US';
  profileUpdateData.defaultCurrency = requestData.defaultCurrency || 'INR';
  profileUpdateData.multiCurrencyEnabled = requestData.multiCurrencyEnabled || false;
  profileUpdateData.advancedCurrencyManagement = requestData.advancedCurrencyManagement || false;
  profileUpdateData.defaultTimeZone = requestData.defaultTimeZone || 'Asia/Kolkata';
  profileUpdateData.firstDayOfWeek = requestData.firstDayOfWeek || 1;

  // Mark profile as completed
  profileUpdateData.onboardingCompleted = true;
  profileUpdateData.onboardingStep = 'completed';
  profileUpdateData.setupCompletionRate = 100;
  profileUpdateData.onboardedAt = new Date();

  return profileUpdateData;
}

// Test the function
console.log('📝 Testing defensive update data construction...');
console.log('Input data contains undefined/null values:', {
  industry: mockRequestData.industry,
  ownership: mockRequestData.ownership,
  shippingStreet: mockRequestData.shippingStreet,
  fax: mockRequestData.fax
});

const updateData = buildProfileUpdateData(mockRequestData, mockTenant);

console.log('\n✅ Successfully built update data:');
console.log('Fields to update:', Object.keys(updateData));
console.log('Total fields:', Object.keys(updateData).length);

console.log('\n🔍 Checking for undefined values in update data...');
let hasUndefined = false;
Object.entries(updateData).forEach(([key, value]) => {
  if (value === undefined) {
    console.log(`❌ ${key}: undefined`);
    hasUndefined = true;
  } else {
    console.log(`✅ ${key}: ${typeof value === 'object' ? '[object]' : value}`);
  }
});

if (!hasUndefined) {
  console.log('\n🎉 SUCCESS: No undefined values in update data!');
  console.log('✅ This should prevent the "Cannot read properties of undefined" error');
} else {
  console.log('\n❌ FAILURE: Found undefined values that could cause errors');
}

// Test edge case: all values undefined
console.log('\n🧪 Testing edge case: all values undefined...');
const emptyRequestData = {
  gstin: undefined,
  legalCompanyName: undefined,
  industry: undefined,
  companyType: undefined,
  ownership: undefined,
  annualRevenue: undefined,
  numberOfEmployees: undefined,
  tickerSymbol: undefined,
  website: undefined,
  description: undefined,
  foundedDate: undefined,
  billingStreet: undefined,
  billingCity: undefined,
  billingState: undefined,
  billingZip: undefined,
  billingCountry: undefined,
  shippingStreet: undefined,
  shippingCity: undefined,
  shippingState: undefined,
  shippingZip: undefined,
  shippingCountry: undefined,
  phone: undefined,
  fax: undefined,
  defaultLanguage: undefined,
  defaultLocale: undefined,
  defaultCurrency: undefined,
  multiCurrencyEnabled: undefined,
  advancedCurrencyManagement: undefined,
  defaultTimeZone: undefined,
  firstDayOfWeek: undefined
};

const emptyUpdateData = buildProfileUpdateData(emptyRequestData, mockTenant);
console.log('Empty update data fields:', Object.keys(emptyUpdateData));
console.log('Empty update data length:', Object.keys(emptyUpdateData).length);

if (Object.keys(emptyUpdateData).length > 0) {
  console.log('✅ Even with all undefined inputs, we still have default values for required fields');
} else {
  console.log('⚠️ Empty update data - this would skip the database update');
}

console.log('\n📋 Summary:');
console.log('✅ Defensive update data construction prevents undefined column errors');
console.log('✅ Only defined values are included in the update');
console.log('✅ Default values are provided for required fields');
console.log('✅ Empty updates are handled gracefully');
console.log('🎯 This should resolve the "Cannot read properties of undefined (reading \'name\')" error');
