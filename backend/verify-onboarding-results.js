import { db } from './src/db/index.js';
import { tenants, tenantUsers, subscriptions, credits, creditTransactions, userRoleAssignments, customRoles } from './src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

async function verifyOnboardingResults(tenantId) {
  console.log('🔍 Verifying Onboarding Results for Tenant:', tenantId);
  console.log('=' .repeat(60));

  try {
    // 1. Check Tenant
    console.log('\n1️⃣ Tenant Information:');
    const tenantData = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (tenantData.length > 0) {
      console.log('✅ Tenant found:', {
        tenantId: tenantData[0].tenantId,
        name: tenantData[0].name,
        domain: tenantData[0].domain,
        status: tenantData[0].status,
        gstin: tenantData[0].gstin,
        adminMobile: tenantData[0].adminMobile,
        createdAt: tenantData[0].createdAt
      });
    } else {
      console.log('❌ Tenant not found');
      return;
    }

    // 2. Check Tenant Users
    console.log('\n2️⃣ Tenant Users:');
    const tenantUserData = await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));

    if (tenantUserData.length > 0) {
      tenantUserData.forEach((user, index) => {
        console.log(`✅ User ${index + 1}:`, {
          userId: user.userId,
          internalUserId: user.internalUserId,
          email: user.email,
          isActive: user.isActive,
          role: user.role,
          createdAt: user.createdAt
        });
      });
    } else {
      console.log('❌ No tenant users found');
    }

    // 3. Check Subscriptions
    console.log('\n3️⃣ Subscription Information:');
    const subscriptionData = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId));

    if (subscriptionData.length > 0) {
      subscriptionData.forEach((sub, index) => {
        console.log(`✅ Subscription ${index + 1}:`, {
          subscriptionId: sub.subscriptionId,
          plan: sub.plan,
          status: sub.status,
          isTrialUser: sub.isTrialUser,
          trialStart: sub.trialStart,
          trialEnd: sub.trialEnd,
          monthlyPrice: sub.monthlyPrice,
          createdAt: sub.createdAt
        });
      });
    } else {
      console.log('❌ No subscriptions found');
    }

    // 4. Check Credit Allocation
    console.log('\n4️⃣ Credit Information:');
    const creditData = await db
      .select()
      .from(credits)
      .where(eq(credits.tenantId, tenantId));

    if (creditData.length > 0) {
      creditData.forEach((credit, index) => {
        console.log(`✅ Credit Record ${index + 1}:`, {
          creditId: credit.creditId,
          availableCredits: credit.availableCredits,
          totalCredits: credit.totalCredits,
          creditPools: credit.creditPools?.length || 0,
          isActive: credit.isActive,
          createdAt: credit.createdAt
        });

        // Check credit transactions
        console.log('   💰 Credit Transactions:');
        db.select()
          .from(creditTransactions)
          .where(eq(creditTransactions.tenantId, tenantId))
          .then(transactions => {
            if (transactions.length > 0) {
              transactions.forEach((tx, txIndex) => {
                console.log(`   ✅ Transaction ${txIndex + 1}:`, {
                  transactionType: tx.transactionType,
                  amount: tx.amount,
                  description: tx.description,
                  createdAt: tx.createdAt
                });
              });
            } else {
              console.log('   ⚠️ No credit transactions found');
            }
          });
      });
    } else {
      console.log('❌ No credit records found - CREDIT ALLOCATION FAILED!');
    }

    // 5. Check User Role Assignments
    console.log('\n5️⃣ User Role Assignments:');
    const roleAssignments = await db
      .select({
        assignmentId: userRoleAssignments.assignmentId,
        userId: userRoleAssignments.userId,
        roleId: userRoleAssignments.roleId,
        assignedAt: userRoleAssignments.assignedAt,
        isActive: userRoleAssignments.isActive,
        roleName: customRoles.roleName,
        roleDescription: customRoles.description
      })
      .from(userRoleAssignments)
      .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
      .where(eq(userRoleAssignments.tenantId, tenantId));

    if (roleAssignments.length > 0) {
      roleAssignments.forEach((assignment, index) => {
        console.log(`✅ Role Assignment ${index + 1}:`, {
          userId: assignment.userId,
          roleName: assignment.roleName || 'Unknown',
          roleDescription: assignment.roleDescription,
          assignedAt: assignment.assignedAt,
          isActive: assignment.isActive
        });
      });
    } else {
      console.log('❌ No role assignments found');
    }

    // 6. Summary
    console.log('\n🎯 Onboarding Verification Summary:');
    console.log('=' .repeat(60));
    console.log(`✅ Tenant Created: ${tenantData.length > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Users Created: ${tenantUserData.length > 0 ? 'YES' : 'NO'} (${tenantUserData.length})`);
    console.log(`✅ Subscription Created: ${subscriptionData.length > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Credits Allocated: ${creditData.length > 0 ? 'YES' : 'NO'} (${creditData.length})`);
    console.log(`✅ Roles Assigned: ${roleAssignments.length > 0 ? 'YES' : 'NO'} (${roleAssignments.length})`);

    const allStepsCompleted = tenantData.length > 0 &&
                             tenantUserData.length > 0 &&
                             subscriptionData.length > 0 &&
                             creditData.length > 0 &&
                             roleAssignments.length > 0;

    console.log(`\n🎉 Overall Status: ${allStepsCompleted ? '✅ COMPLETE SUCCESS' : '⚠️ PARTIAL SUCCESS'}`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
  }
}

// Get tenant ID from command line arguments or use a recent test tenant
const tenantId = process.argv[2] || '0b57b12e-08ff-461c-8e56-dba5b18f1ee4'; // Use the tenant ID from our test
verifyOnboardingResults(tenantId).catch(console.error);
