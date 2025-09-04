// Test GSTIN validation
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const testGstins = [
  '37AAAAA0000A1Z0', // Should match
  '37BBBB0000B1Z0', // Should match
  '37CCCC0000C1Z0', // Should match
  '37DDDD0000D1Z0', // Should match
  'INVALID',        // Should not match
  '',               // Empty string
  null,             // Null value
  undefined         // Undefined value
];

console.log('🧪 TESTING GSTIN VALIDATION\n');

testGstins.forEach((gstin, index) => {
  if (gstin === null || gstin === undefined) {
    console.log(`${index + 1}. ${gstin}: Skipped (null/undefined)`);
    return;
  }

  const isValid = gstinRegex.test(gstin);
  console.log(`${index + 1}. "${gstin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});
