#!/usr/bin/env node

/**
 * Validate Enhanced Onboarding Completion
 *
 * This script validates the data created during enhanced onboarding
 * and shows the next steps for the user.
 */

import { config } from 'dotenv';
import { db } from './src/db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments } from './src/db/schema/index.js';
import { credits, creditTransactions } from './src/db/schema/credits.js';
import { subscriptions } from './src/db/schema/subscriptions.js';
import { eq, and } from 'drizzle-orm';

// Load environment variables
config();

async function validateOnboardingCompletion(tenantId) {
  console.log('🔍 Validating Enhanced Onboarding Completion');
  console.log('=' .repeat(60));
  console.log('Tenant ID:', tenantId);
  console.log('=' .repeat(60));

  try {
    // 1. Validate Tenant Data
    console.log('\n🏢 1. VALIDATING TENANT DATA...');
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (tenant.length === 0) {
      throw new Error('❌ Tenant not found');
    }

    const tenantData = tenant[0];
    console.log('✅ Tenant found:', {
      tenantId: tenantData.tenantId,
      companyName: tenantData.companyName,
      gstin: tenantData.gstin,
      subdomain: tenantData.subdomain,
      kindeOrgId: tenantData.kindeOrgId,
      onboardingStatus: tenantData.onboardingStatus,
      trialStatus: tenantData.trialStatus,
      isActive: tenantData.isActive,
      isVerified: tenantData.isVerified
    });

    // 2. Validate Admin User
    console.log('\n👤 2. VALIDATING ADMIN USER...');
    const adminUser = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.isTenantAdmin, true)
      ))
      .limit(1);

    if (adminUser.length === 0) {
      throw new Error('❌ Admin user not found');
    }

    const userData = adminUser[0];
    console.log('✅ Admin user found:', {
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      isTenantAdmin: userData.isTenantAdmin,
      isActive: userData.isActive,
      onboardingCompleted: userData.onboardingCompleted
    });

    // 3. Validate Roles
    console.log('\n🔐 3. VALIDATING ROLES...');
    const roles = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.tenantId, tenantId));

    console.log(`✅ Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`  - ${role.roleName} (${role.roleCode}) - Priority: ${role.priority}`);
    });

    // 4. Validate User Role Assignments
    console.log('\n🔗 4. VALIDATING USER ROLE ASSIGNMENTS...');
    const roleAssignments = await db
      .select()
      .from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, userData.userId),
        eq(userRoleAssignments.organizationId, tenantId)
      ));

    console.log(`✅ Found ${roleAssignments.length} role assignments:`);
    roleAssignments.forEach(assignment => {
      const role = roles.find(r => r.roleId === assignment.roleId);
      console.log(`  - ${role?.roleName || 'Unknown Role'} (Responsible: ${assignment.isResponsiblePerson})`);
    });

    // 5. Validate Credits
    console.log('\n💰 5. VALIDATING CREDITS...');
    const creditData = await db
      .select()
      .from(credits)
      .where(and(
        eq(credits.tenantId, tenantId),
        eq(credits.entityType, 'organization'),
        eq(credits.entityId, tenantId)
      ))
      .limit(1);

    if (creditData.length === 0) {
      console.log('⚠️ No credit data found');
    } else {
      const creditsInfo = creditData[0];
      console.log('✅ Credit balance found:', {
        availableCredits: creditsInfo.availableCredits,
        totalCredits: creditsInfo.totalCredits,
        isActive: creditsInfo.isActive
      });
    }

    // 6. Validate Credit Transactions
    console.log('\n📊 6. VALIDATING CREDIT TRANSACTIONS...');
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.tenantId, tenantId),
        eq(creditTransactions.entityType, 'organization'),
        eq(creditTransactions.entityId, tenantId)
      ));

    console.log(`✅ Found ${transactions.length} credit transactions:`);
    transactions.forEach(tx => {
      console.log(`  - ${tx.transactionType}: ${tx.amount} credits (${tx.description})`);
    });

    // 7. Validate Subscription
    console.log('\n📋 7. VALIDATING SUBSCRIPTION...');
    const subscriptionData = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (subscriptionData.length === 0) {
      console.log('⚠️ No subscription data found');
    } else {
      const subInfo = subscriptionData[0];
      console.log('✅ Subscription found:', {
        plan: subInfo.plan,
        status: subInfo.status,
        trialStart: subInfo.trialStart,
        trialEnd: subInfo.trialEnd,
        isTrialUser: subInfo.isTrialUser
      });
    }

    // 8. Overall Validation Summary
    console.log('\n🎯 8. VALIDATION SUMMARY');
    console.log('=' .repeat(40));

    const validationResults = {
      tenant: tenant.length > 0,
      adminUser: adminUser.length > 0,
      roles: roles.length >= 3,
      roleAssignments: roleAssignments.length > 0,
      credits: creditData.length > 0,
      transactions: transactions.length > 0,
      subscription: subscriptionData.length > 0,
      subdomain: tenantData.subdomain !== null,
      kindeOrg: tenantData.kindeOrgId !== null
    };

    const passedValidations = Object.values(validationResults).filter(Boolean).length;
    const totalValidations = Object.keys(validationResults).length;

    console.log(`✅ Passed: ${passedValidations}/${totalValidations} validations`);

    Object.entries(validationResults).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${check.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    });

    // 9. Next Steps
    console.log('\n🚀 NEXT STEPS FOR USER');
    console.log('=' .repeat(40));

    if (tenantData.onboardingStatus === 'trial_active') {
      console.log('📅 Current Status: Trial Active');
      console.log('');
      console.log('🔹 Immediate Next Steps:');
      console.log('  1. User logs in with admin credentials');
      console.log('  2. Complete company profile setup');
      console.log('  3. Explore CRM features with trial credits');
      console.log('  4. Set up additional users and roles');
      console.log('');
      console.log('🔹 Trial Information:');
      console.log(`  - Trial ends: ${subscriptionData[0]?.trialEnd || 'Unknown'}`);
      console.log(`  - Available credits: ${creditData[0]?.availableCredits || 0}`);
      console.log('  - Features: CRM module access');
      console.log('');
      console.log('🔹 Before Trial Expires:');
      console.log('  1. Complete billing information');
      console.log('  2. Add payment method');
      console.log('  3. Choose subscription plan');
      console.log('  4. Upgrade to paid plan');
    }

    console.log('\n🎉 VALIDATION COMPLETED SUCCESSFULLY!');
    console.log(`\nTenant ID: ${tenantId}`);
    console.log(`Admin Email: ${userData.email}`);
    console.log(`Subdomain: ${tenantData.subdomain || 'Not created yet'}`);

    return {
      success: true,
      tenant: tenantData,
      user: userData,
      validationResults,
      nextSteps: getNextSteps(tenantData, userData)
    };

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
}

function getNextSteps(tenant, user) {
  const steps = [];

  if (tenant.onboardingStatus === 'trial_active') {
    steps.push({
      priority: 'high',
      action: 'user_login',
      description: 'Admin user should log in to the system',
      details: `Login URL: https://${tenant.subdomain || 'app'}.zopkit.com/login`
    });

    steps.push({
      priority: 'high',
      action: 'complete_profile',
      description: 'Complete company profile and billing information',
      details: 'Add company details, billing address, tax information'
    });

    steps.push({
      priority: 'medium',
      action: 'explore_crm',
      description: 'Explore CRM features with trial credits',
      details: 'Add leads, contacts, create opportunities'
    });

    steps.push({
      priority: 'medium',
      action: 'setup_users',
      description: 'Set up additional users and assign roles',
      details: 'Invite team members and assign appropriate permissions'
    });

    steps.push({
      priority: 'low',
      action: 'upgrade_plan',
      description: 'Upgrade to paid plan before trial expires',
      details: `Trial expires: ${tenant.trialEndsAt || '30 days from signup'}`
    });
  }

  return steps;
}

// Get tenant ID from command line or use a recent one
const tenantId = process.argv[2];

if (!tenantId) {
  console.error('❌ Please provide a tenant ID as argument');
  console.log('Usage: node validate-onboarding-completion.js <tenant-id>');
  process.exit(1);
}

validateOnboardingCompletion(tenantId).then(result => {
  if (result.success) {
    console.log('\n✅ Validation completed successfully');
    process.exit(0);
  } else {
    console.log('\n❌ Validation failed');
    process.exit(1);
  }
});
