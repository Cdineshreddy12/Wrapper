#!/usr/bin/env node

import axios from 'axios';

async function testFrontendAPI() {
  try {
    console.log('🧪 Testing Frontend API Call Simulation...');
    
    // Simulate the frontend API call
    const response = await axios.get('http://localhost:3000/api/user-sync/classification', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but let's see what happens
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Headers:', response.headers);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('  Status:', error.response.status);
      console.log('  Headers:', error.response.headers);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ No response received - server might not be running');
      console.log('  Error:', error.message);
    } else {
      console.log('❌ Request setup error:', error.message);
    }
  }
}

testFrontendAPI();
