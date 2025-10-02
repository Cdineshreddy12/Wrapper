/**
 * Test script for multi-entity invitation functionality
 * Run with: node test-multi-entity-invitations.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust based on your backend port

async function testMultiEntityInvitationFlow() {
  console.log('🧪 Testing Multi-Entity Invitation Flow\n');

  try {
    // Test 1: Create multi-entity invitation
    console.log('1️⃣ Testing multi-entity invitation creation...');

    const createResponse = await fetch(`${BASE_URL}/api/invitations/create-multi-entity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers as needed
        'Authorization': 'Bearer YOUR_TEST_TOKEN'
      },
      body: JSON.stringify({
        email: 'test-user@example.com',
        entities: [
          {
            entityId: 'org-1', // Replace with actual entity IDs
            roleId: 'role-1',   // Replace with actual role IDs
            entityType: 'organization',
            membershipType: 'direct'
          },
          {
            entityId: 'loc-1', // Replace with actual entity IDs
            roleId: 'role-2',   // Replace with actual role IDs
            entityType: 'location',
            membershipType: 'direct'
          }
        ],
        primaryEntityId: 'org-1',
        message: 'Welcome to our organization and location!'
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.log('❌ Create invitation failed:', errorData);
      return;
    }

    const createResult = await createResponse.json();
    console.log('✅ Create invitation result:', createResult);

    if (!createResult.success) {
      console.log('❌ Create invitation failed:', createResult.message);
      return;
    }

    const invitationToken = createResult.invitation.token;

    // Test 2: Get invitation details
    console.log('\n2️⃣ Testing invitation details retrieval...');

    const detailsResponse = await fetch(`${BASE_URL}/api/invitations/details-by-token?token=${invitationToken}`);

    if (!detailsResponse.ok) {
      const errorData = await detailsResponse.json();
      console.log('❌ Get details failed:', errorData);
      return;
    }

    const detailsResult = await detailsResponse.json();
    console.log('✅ Get details result:', JSON.stringify(detailsResult, null, 2));

    // Test 3: Accept invitation (requires valid Kinde user ID)
    console.log('\n3️⃣ Testing invitation acceptance...');

    const acceptResponse = await fetch(`${BASE_URL}/api/invitations/accept-by-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: invitationToken,
        kindeUserId: 'test-kinde-user-id' // Replace with actual Kinde user ID
      })
    });

    if (!acceptResponse.ok) {
      const errorData = await acceptResponse.json();
      console.log('❌ Accept invitation failed:', errorData);
      return;
    }

    const acceptResult = await acceptResponse.json();
    console.log('✅ Accept invitation result:', JSON.stringify(acceptResult, null, 2));

    console.log('\n🎉 Multi-entity invitation flow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testMultiEntityInvitationFlow();
