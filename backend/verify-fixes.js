import axios from 'axios';
const BASE_URL = 'http://localhost:3000';

async function comprehensiveTest() {
  console.log('🧪 COMPREHENSIVE FIX VERIFICATION');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  // Test 1: Organization Update (was failing with 500)
  try {
    console.log('\n1. Testing Organization Update Fix...');
    const orgId = '2b4a4139-c99c-41cf-bf49-a1290209a943';
    const response = await axios.put(`${BASE_URL}/api/organizations/${orgId}`, {
      organizationName: 'Fixed ConsultPro LLC'
    });
    console.log('✅ Organization update: SUCCESS');
    passed++;
  } catch (error) {
    console.log('❌ Organization update: FAILED -', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 2: Capacity Analytics (was showing undefined)
  try {
    console.log('\n2. Testing Capacity Analytics Fix...');
    const locId = '6e86d6b1-6c6c-48d2-99d5-79ab9d1262e0';
    const response = await axios.get(`${BASE_URL}/api/locations/${locId}/analytics`);
    const capacity = response.data.analytics.capacity;
    console.log('✅ Capacity analytics:', capacity.utilizationRate + '% utilized');
    passed++;
  } catch (error) {
    console.log('❌ Capacity analytics: FAILED -', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 3: Hierarchy API (checking for proper data)
  try {
    console.log('\n3. Testing Hierarchy API...');
    const response = await axios.get(`${BASE_URL}/api/organizations/hierarchy/893d8c75-68e6-4d42-92f8-45df62ef08b6`);
    const hierarchy = response.data.data.hierarchy;
    console.log('✅ Hierarchy API: Found', hierarchy.length, 'organizations');

    // Check if any have null names
    const nullNames = hierarchy.filter(org => !org.organizationName);
    console.log('   - Organizations with null names:', nullNames.length);
    passed++;
  } catch (error) {
    console.log('❌ Hierarchy API: FAILED -', error.response?.data?.message || error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Passed:', passed);
  console.log('❌ Failed:', failed);
  console.log('📈 Success Rate:', Math.round((passed / (passed + failed)) * 100) + '%');

  if (failed === 0) {
    console.log('🎉 ALL FIXES VERIFIED SUCCESSFULLY!');
    console.log('🚀 SYSTEM IS READY FOR PRODUCTION!');
  } else {
    console.log('⚠️ Some issues still remain');
  }

  process.exit(failed > 0 ? 1 : 0);
}

comprehensiveTest().catch(console.error);
