// Test GSTIN fix
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const testGstins = [
  '37AAAAA0000A1Z0', // Should be valid
  '37BBBBB0000B1Z0', // Should be valid
  '37CCCCC0000C1Z0', // Should be valid
  '37DDDDD0000D1Z0', // Should be valid
  'INVALID_GSTIN',  // Should be invalid
];

console.log('🧪 VERIFYING GSTIN FIX\n');

testGstins.forEach((gstin, index) => {
  const isValid = gstinRegex.test(gstin);
  console.log(`${index + 1}. "${gstin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});
