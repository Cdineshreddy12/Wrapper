// Debug GSTIN validation issue
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

console.log('🧪 DEBUGGING GSTIN VALIDATION ISSUE\n');

// Test the GSTIN values from the test suite
const testGstins = [
  '37AAAAA0000A1Z0',
  '37BBBB0000B1Z0',
  '37CCCC0000C1Z0',
  '37DDDD0000D1Z0'
];

testGstins.forEach((gstin, index) => {
  const isValid = gstinRegex.test(gstin);
  console.log(`${index + 1}. "${gstin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);

  // Test each character position
  if (!isValid) {
    console.log(`   Length: ${gstin.length} (should be 15)`);
    console.log(`   Pattern analysis:`);
    console.log(`   - First 2 digits: ${gstin.substring(0, 2)} - ${/^[0-9]{2}$/.test(gstin.substring(0, 2)) ? '✅' : '❌'}`);
    console.log(`   - Next 5 letters: ${gstin.substring(2, 7)} - ${/^[A-Z]{5}$/.test(gstin.substring(2, 7)) ? '✅' : '❌'}`);
    console.log(`   - Next 4 digits: ${gstin.substring(7, 11)} - ${/^[0-9]{4}$/.test(gstin.substring(7, 11)) ? '✅' : '❌'}`);
    console.log(`   - Next letter: ${gstin.charAt(11)} - ${/^[A-Z]{1}$/.test(gstin.charAt(11)) ? '✅' : '❌'}`);
    console.log(`   - Next alphanumeric: ${gstin.charAt(12)} - ${/^[1-9A-Z]{1}$/.test(gstin.charAt(12)) ? '✅' : '❌'}`);
    console.log(`   - Z: ${gstin.charAt(13)} - ${gstin.charAt(13) === 'Z' ? '✅' : '❌'}`);
    console.log(`   - Last alphanumeric: ${gstin.charAt(14)} - ${/^[0-9A-Z]{1}$/.test(gstin.charAt(14)) ? '✅' : '❌'}`);
  }
});
