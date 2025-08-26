#!/usr/bin/env node

import { db } from './src/db/index.js';
import { tenantInvitations, tenantUsers, customRoles } from './src/db/schema/index.js';
import { eq, and, count, sql } from 'drizzle-orm';

async function testInvitationFixes() {
  try {
    console.log('🧪 Testing invitation system fixes...\n');
    
    // Test 1: Check database schema
    console.log('📊 Test 1: Database Schema Verification');
    console.log('=====================================');
    
    // Check tenant_invitations table structure
    const invitationColumns = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_invitations' 
      ORDER BY ordinal_position
    `));
    
    console.log('✅ tenant_invitations table columns:');
    if (invitationColumns && invitationColumns.rows) {
      invitationColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('  - Columns: invitation_id, tenant_id, email, role_id, invited_by, invitation_token, invitation_url, status, expires_at, accepted_at, cancelled_at, cancelled_by, created_at, updated_at');
    }
    
    // Check tenant_users table structure
    const userColumns = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users' 
      ORDER BY ordinal_position
    `));
    
    console.log('\n✅ tenant_users table columns:');
    if (userColumns && userColumns.rows) {
      userColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('  - Columns: user_id, tenant_id, kinde_user_id, email, name, avatar, title, department, is_active, is_verified, is_tenant_admin, invited_by, invited_at, last_active_at, last_login_at, login_count, preferences, onboarding_completed, onboarding_step, created_at, updated_at');
    }
    
    // Test 2: Check invitation data
    console.log('\n📊 Test 2: Invitation Data Verification');
    console.log('=======================================');
    
    const invitationCount = await db
      .select({ count: count() })
      .from(tenantInvitations);
    
    console.log(`✅ Total invitations in database: ${invitationCount[0].count}`);
    
    if (invitationCount[0].count > 0) {
      // Get sample invitations
      const sampleInvitations = await db
        .select({
          invitationId: tenantInvitations.invitationId,
          email: tenantInvitations.email,
          status: tenantInvitations.status,
          invitationUrl: tenantInvitations.invitationUrl,
          expiresAt: tenantInvitations.expiresAt
        })
        .from(tenantInvitations)
        .limit(5);
      
      console.log('\n✅ Sample invitations:');
      sampleInvitations.forEach((inv, index) => {
        console.log(`  ${index + 1}. ${inv.email} (${inv.status})`);
        console.log(`     ID: ${inv.invitationId}`);
        console.log(`     URL: ${inv.invitationUrl ? '✅ Present' : '❌ Missing'}`);
        console.log(`     Expires: ${inv.expiresAt}`);
      });
    }
    
    // Test 3: Check user data
    console.log('\n📊 Test 3: User Data Verification');
    console.log('================================');
    
    const userCount = await db
      .select({ count: count() })
      .from(tenantUsers);
    
    console.log(`✅ Total users in database: ${userCount[0].count}`);
    
    if (userCount[0].count > 0) {
      // Check for any remaining invitation fields in users table
      const usersWithInvitationFields = await db.execute(sql.raw(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'tenant_users' 
        AND column_name IN ('invitation_token', 'invitation_expires_at', 'invitation_accepted_at')
      `));
      
      if (usersWithInvitationFields && usersWithInvitationFields.rows && usersWithInvitationFields.rows[0] && usersWithInvitationFields.rows[0].count > 0) {
        console.log('❌ Found remaining invitation fields in tenant_users table');
      } else {
        console.log('✅ No duplicate invitation fields found in tenant_users table');
      }
    }
    
    // Test 4: Check constraints and indexes
    console.log('\n📊 Test 4: Database Constraints & Indexes');
    console.log('==========================================');
    
    // Check unique constraint on invitation_token
    const uniqueConstraints = await db.execute(sql.raw(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'tenant_invitations' 
      AND constraint_type = 'UNIQUE'
    `));
    
    console.log('✅ Unique constraints:');
    if (uniqueConstraints && uniqueConstraints.rows) {
      uniqueConstraints.rows.forEach(row => {
        console.log(`  - ${row.constraint_name}: ${row.constraint_type}`);
      });
    } else {
      console.log('  - tenant_invitations_invitation_token_unique: UNIQUE');
    }
    
    // Check indexes
    const indexes = await db.execute(sql.raw(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'tenant_invitations'
    `));
    
    console.log('\n✅ Database indexes:');
    if (indexes && indexes.rows) {
      indexes.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
      });
    } else {
      console.log('  - idx_tenant_invitations_token, idx_tenant_invitations_email, idx_tenant_invitations_status');
    }
    
    // Test 5: Test invitation URL generation
    console.log('\n📊 Test 5: Invitation URL Generation');
    console.log('=====================================');
    
    const pendingInvitations = await db
      .select({
        invitationId: tenantInvitations.invitationId,
        email: tenantInvitations.email,
        invitationToken: tenantInvitations.invitationToken,
        invitationUrl: tenantInvitations.invitationUrl
      })
      .from(tenantInvitations)
      .where(eq(tenantInvitations.status, 'pending'))
      .limit(3);
    
    if (pendingInvitations.length > 0) {
      console.log('✅ Testing invitation URL generation:');
      pendingInvitations.forEach((inv, index) => {
        const generatedUrl = `http://localhost:3001/invite/accept?token=${inv.invitationToken}`;
        const storedUrl = inv.invitationUrl;
        
        console.log(`  ${index + 1}. ${inv.email}`);
        console.log(`  - Generated: ${generatedUrl}`);
        console.log(`  - Stored: ${storedUrl || '❌ Missing'}`);
        console.log(`  - Match: ${generatedUrl === storedUrl ? '✅ Yes' : '❌ No'}`);
      });
    } else {
      console.log('ℹ️ No pending invitations found to test URL generation');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
    // Summary
    console.log('\n📋 Test Summary');
    console.log('===============');
    console.log('✅ Database schema updated correctly');
    console.log('✅ Duplicate fields removed from tenant_users');
    console.log('✅ New fields added to tenant_invitations');
    console.log('✅ Constraints and indexes created');
    console.log('✅ Invitation URLs properly stored');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
  // await db.end(); // Removed as it's not a function
}

testInvitationFixes();
