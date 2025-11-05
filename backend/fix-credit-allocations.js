import { CreditService } from './src/services/credit-service.js';

async function fixCreditAllocations() {
  const tenantId = 'c78f758e-afa5-4d73-abc0-767a5d236981'; // User's tenant ID

  try {
    console.log('🔧 Starting credit allocation fix for tenant:', tenantId);

    // Debug current allocations
    const allocations = await CreditService.debugCreditAllocations(tenantId);

    // Check for corrupted allocation
    const corruptedAllocation = allocations.find(alloc =>
      parseFloat(alloc.allocatedCredits) === 10005000 &&
      alloc.creditType === 'paid' &&
      alloc.allocationPurpose.includes('free credits')
    );

    if (corruptedAllocation) {
      console.log('🚨 Found corrupted allocation:', corruptedAllocation.allocationId);
      console.log('   Allocated credits:', corruptedAllocation.allocatedCredits);
      console.log('   Credit type:', corruptedAllocation.creditType);
      console.log('   Purpose:', corruptedAllocation.allocationPurpose);

      // The corrupted allocation has 10005000 which should be 1000 (free) + 5000 (paid)
      // We need to:
      // 1. Update this allocation to be 1000 free credits
      // 2. Create a new allocation for 5000 paid credits

      const { db } = await import('./src/db/index.js');
      const { creditAllocations } = await import('./src/db/schema/index.js');
      const { eq, and } = await import('drizzle-orm');
      const { randomUUID } = await import('crypto');

      // Update the corrupted allocation to be 1000 free credits
      await db
        .update(creditAllocations)
        .set({
          allocatedCredits: '1000',
          availableCredits: '1000',
          creditType: 'free',
          allocationPurpose: 'Trial plan free credits (corrected)',
          lastUpdatedAt: new Date()
        })
        .where(eq(creditAllocations.allocationId, corruptedAllocation.allocationId));

      console.log('✅ Updated corrupted allocation to 1000 free credits');

      // Create new allocation for 5000 paid credits
      const newAllocationId = randomUUID();
      await db
        .insert(creditAllocations)
        .values({
          allocationId: newAllocationId,
          tenantId: tenantId,
          sourceEntityId: corruptedAllocation.sourceEntityId,
          targetApplication: corruptedAllocation.targetApplication,
          allocatedCredits: '5000',
          availableCredits: '5000',
          creditType: 'paid',
          allocationType: 'bulk',
          allocationPurpose: 'Credit purchase: 5000 credits (corrected)',
          expiresAt: null, // Paid credits don't expire
          allocatedBy: corruptedAllocation.allocatedBy,
          isActive: true
        });

      console.log('✅ Created new allocation for 5000 paid credits');

      // Verify the fix
      console.log('\n🔍 Verifying fix...');
      const updatedAllocations = await CreditService.debugCreditAllocations(tenantId);

      // Calculate totals
      const freeCredits = updatedAllocations
        .filter(alloc => alloc.creditType === 'free')
        .reduce((sum, alloc) => sum + parseFloat(alloc.availableCredits || '0'), 0);

      const paidCredits = updatedAllocations
        .filter(alloc => alloc.creditType === 'paid')
        .reduce((sum, alloc) => sum + parseFloat(alloc.availableCredits || '0'), 0);

      const totalCredits = freeCredits + paidCredits;

      console.log(`\n📊 Credit summary after fix:`);
      console.log(`   Free credits: ${freeCredits}`);
      console.log(`   Paid credits: ${paidCredits}`);
      console.log(`   Total credits: ${totalCredits}`);

      if (freeCredits === 1000 && paidCredits === 5000 && totalCredits === 6000) {
        console.log('✅ Credit allocation fix successful!');
      } else {
        console.log('❌ Credit allocation fix may have issues');
      }

    } else {
      console.log('ℹ️ No corrupted allocations found');
    }

  } catch (error) {
    console.error('❌ Error fixing credit allocations:', error);
  }
}

// Run the fix
fixCreditAllocations()
  .then(() => {
    console.log('🎉 Credit allocation fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Credit allocation fix failed:', error);
    process.exit(1);
  });
