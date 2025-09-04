// Test syntax fix - try to import location service
try {
  console.log('🧪 TESTING SYNTAX FIX...');

  // Try to require the location service
  const LocationService = require('./src/services/location-service.js');

  console.log('✅ Location service imported successfully!');
  console.log('✅ Syntax error fixed!');

  // Test that the class exists
  if (LocationService && LocationService.LocationService) {
    console.log('✅ LocationService class found!');
  } else {
    console.log('⚠️ LocationService class not found, but import succeeded');
  }

} catch (error) {
  console.log('❌ Syntax error still exists:');
  console.log('Error:', error.message);
  console.log('Stack:', error.stack);
}
