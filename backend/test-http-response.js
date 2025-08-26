#!/usr/bin/env node

import axios from 'axios';

async function testHTTPResponse() {
  try {
    console.log('🧪 Testing HTTP Response from Running Server...');
    
    // Test the health endpoint first to see if server is responding
    try {
      const healthResponse = await axios.get('http://localhost:3000/health');
      console.log('✅ Health endpoint working:', healthResponse.status);
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.message);
    }
    
    // Test the classification endpoint with a fake token to see the response structure
    try {
      const response = await axios.get('http://localhost:3000/api/user-sync/classification', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token-for-testing'
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('✅ API Response Headers:', response.headers);
      console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.log('📊 API Error Response (Expected 401):');
        console.log('  Status:', error.response.status);
        console.log('  Headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('  Data:', JSON.stringify(error.response.data, null, 2));
        
        // Check if the response structure is correct even for errors
        console.log('\n🔍 Response Structure Analysis:');
        console.log('  Has error field:', !!error.response.data.error);
        console.log('  Has message field:', !!error.response.data.message);
        console.log('  Has statusCode field:', !!error.response.data.statusCode);
        console.log('  Response data type:', typeof error.response.data);
        console.log('  Response data keys:', Object.keys(error.response.data));
      } else {
        console.log('❌ No response received:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHTTPResponse();
