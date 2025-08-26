// Test script to check frontend API configuration
console.log('🧪 Testing Frontend API Configuration...');

// Check environment variables
console.log('🔍 Environment Variables:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

// Check the actual API base URL that would be used
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
console.log('📡 Final API_BASE_URL:', API_BASE_URL);

// Test URL construction
const testEndpoint = '/user-sync/classification';
const fullUrl = API_BASE_URL + testEndpoint;
console.log('🔗 Test endpoint:', testEndpoint);
console.log('🌐 Full URL:', fullUrl);

// Check if it's relative or absolute
if (fullUrl.startsWith('http')) {
  console.log('❌ PROBLEM: Using absolute URL (bypasses Vite proxy)');
  console.log('💡 SOLUTION: Change VITE_API_URL to /api in .env file');
} else {
  console.log('✅ GOOD: Using relative URL (works with Vite proxy)');
}

console.log('\n📋 Summary:');
console.log('Current VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('Should be:', '/api');
console.log('Status:', import.meta.env.VITE_API_URL === '/api' ? '✅ Correct' : '❌ Wrong');
