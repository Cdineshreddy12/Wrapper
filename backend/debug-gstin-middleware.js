// Test middleware GSTIN validation
const { validateGSTIN } = require('./src/middleware/validation.js');

const testGstins = [
  '37AAAAA0000A1Z0', // Should be valid
  '37BBBB0000B1Z0', // Should be valid
  'INVALID_GSTIN',  // Should be invalid
  '',               // Should be valid (empty)
  null,             // Should be valid (null)
  undefined         // Should be valid (undefined)
];

console.log('🧪 TESTING MIDDLEWARE GSTIN VALIDATION\n');

testGstins.forEach((gstin, index) => {
  const result = validateGSTIN(gstin);
  console.log(`${index + 1}. "${gstin}": ${result.valid ? '✅' : '❌'} ${result.message}`);
});
