import { db } from '../db/index.js';
import { credits, creditTransactions } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class CreditAllocationService {

  /**
   * Allocate free credits for new trial organization
   */
  async allocateTrialCredits(tenantId, options = {}) {
    const {
      creditAmount = 1000,
      trialDays = 30,
      batchId = uuidv4()
    } = options;

    console.log(`🎁 Allocating ${creditAmount} trial credits for tenant: ${tenantId}`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + trialDays);

    try {
      // Create credit record
      const creditRecord = await db.insert(credits).values({
        tenantId,
        entityType: 'organization',
        entityId: tenantId, // Organization is the entity
        availableCredits: creditAmount,
        totalCredits: creditAmount,
        creditPools: [{
          batchId,
          amount: creditAmount,
          expiryDate: expiryDate.toISOString(),
          source: 'trial_signup',
          allocatedAt: new Date().toISOString()
        }],
        creditPolicy: {
          allowOverage: false,
          expiryPolicy: {
            enabled: true,
            defaultDays: trialDays
          },
          freeTrialCredits: true
        },
        isActive: true,
        createdAt: new Date()
      }).returning();

      // Create credit transaction record
      await db.insert(creditTransactions).values({
        tenantId,
        entityType: 'organization',
        entityId: tenantId,
        transactionType: 'purchase',
        amount: creditAmount,
        previousBalance: 0,
        newBalance: creditAmount,
        operationCode: 'trial_allocation',
        description: `Free trial credits allocation (${creditAmount} credits)`,
        creditBatchId: batchId,
        processedAt: new Date(),
        createdAt: new Date()
      });

      console.log(`✅ Allocated ${creditAmount} credits to tenant: ${tenantId}`);

      return {
        success: true,
        creditId: creditRecord[0].creditId,
        batchId,
        amount: creditAmount,
        expiryDate,
        creditRecord: creditRecord[0]
      };

    } catch (error) {
      console.error('❌ Credit allocation failed:', error);
      throw new Error(`Failed to allocate trial credits: ${error.message}`);
    }
  }

  /**
   * Get credit balance for an organization
   */
  async getCreditBalance(tenantId) {
    try {
      const credits = await db
        .select({
          creditId: credits.creditId,
          availableCredits: credits.availableCredits,
          reservedCredits: credits.reservedCredits,
          totalCredits: credits.totalCredits,
          creditPools: credits.creditPools,
          creditPolicy: credits.creditPolicy
        })
        .from(credits)
        .where(eq(credits.tenantId, tenantId))
        .limit(1);

      if (credits.length === 0) {
        return {
          availableCredits: 0,
          reservedCredits: 0,
          totalCredits: 0,
          creditPools: [],
          hasCredits: false
        };
      }

      const creditRecord = credits[0];

      // Clean expired credits
      const cleanedCredits = await this.cleanExpiredCredits(tenantId, creditRecord);

      return {
        ...cleanedCredits,
        hasCredits: cleanedCredits.availableCredits > 0,
        creditPolicy: creditRecord.creditPolicy
      };

    } catch (error) {
      console.error('❌ Credit balance check failed:', error);
      throw new Error(`Failed to get credit balance: ${error.message}`);
    }
  }

  /**
   * Consume credits for an operation
   */
  async consumeCredits(tenantId, operationCode, creditAmount, options = {}) {
    const { operationId, description } = options;

    console.log(`💰 Consuming ${creditAmount} credits for ${operationCode} in tenant: ${tenantId}`);

    try {
      // Get current credit balance
      const currentCredits = await this.getCreditBalance(tenantId);

      if (currentCredits.availableCredits < creditAmount) {
        throw new Error(`Insufficient credits. Available: ${currentCredits.availableCredits}, Required: ${creditAmount}`);
      }

      // Start transaction for atomic credit consumption
      const result = await db.transaction(async (tx) => {
        // Find suitable credit batch to consume from
        const batchToUse = this.selectCreditBatch(currentCredits.creditPools, creditAmount);

        if (!batchToUse) {
          throw new Error('No suitable credit batch found for consumption');
        }

        // Update credit balance
        await tx.update(credits)
          .set({
            availableCredits: currentCredits.availableCredits - creditAmount,
            lastUpdatedAt: new Date()
          })
          .where(eq(credits.tenantId, tenantId));

        // Record consumption transaction
        const transaction = await tx.insert(creditTransactions).values({
          tenantId,
          entityType: 'organization',
          entityId: tenantId,
          transactionType: 'consumption',
          amount: -creditAmount, // Negative for consumption
          previousBalance: currentCredits.availableCredits,
          newBalance: currentCredits.availableCredits - creditAmount,
          operationCode,
          operationId,
          creditBatchId: batchToUse.batchId,
          description: description || `Credit consumption for ${operationCode}`,
          processedAt: new Date(),
          createdAt: new Date()
        }).returning();

        return {
          transactionId: transaction[0].transactionId,
          batchId: batchToUse.batchId,
          newBalance: currentCredits.availableCredits - creditAmount
        };
      });

      console.log(`✅ Consumed ${creditAmount} credits, new balance: ${result.newBalance}`);

      return {
        success: true,
        ...result,
        consumedAmount: creditAmount,
        operationCode
      };

    } catch (error) {
      console.error('❌ Credit consumption failed:', error);
      throw error;
    }
  }

  /**
   * Add credits to an organization (for purchases or bonuses)
   */
  async addCredits(tenantId, creditAmount, source, options = {}) {
    const {
      batchId = uuidv4(),
      expiryDays = 365,
      description
    } = options;

    console.log(`➕ Adding ${creditAmount} credits to tenant: ${tenantId} (${source})`);

    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Get current balance
      const currentCredits = await this.getCreditBalance(tenantId);

      // Add credits
      const result = await db.transaction(async (tx) => {
        // Update or create credit record
        let creditRecord;
        if (currentCredits.hasCredits) {
          creditRecord = await tx.update(credits)
            .set({
              availableCredits: currentCredits.availableCredits + creditAmount,
              totalCredits: currentCredits.totalCredits + creditAmount,
              creditPools: [
                ...currentCredits.creditPools,
                {
                  batchId,
                  amount: creditAmount,
                  expiryDate: expiryDate.toISOString(),
                  source,
                  allocatedAt: new Date().toISOString()
                }
              ],
              lastUpdatedAt: new Date()
            })
            .where(eq(credits.tenantId, tenantId))
            .returning();
        } else {
          creditRecord = await tx.insert(credits).values({
            tenantId,
            entityType: 'organization',
            entityId: tenantId,
            availableCredits: creditAmount,
            totalCredits: creditAmount,
            creditPools: [{
              batchId,
              amount: creditAmount,
              expiryDate: expiryDate.toISOString(),
              source,
              allocatedAt: new Date().toISOString()
            }],
            isActive: true,
            createdAt: new Date()
          }).returning();
        }

        // Record addition transaction
        const transaction = await tx.insert(creditTransactions).values({
          tenantId,
          entityType: 'organization',
          entityId: tenantId,
          transactionType: 'purchase',
          amount: creditAmount,
          previousBalance: currentCredits.availableCredits || 0,
          newBalance: (currentCredits.availableCredits || 0) + creditAmount,
          operationCode: 'credit_addition',
          creditBatchId: batchId,
          description: description || `Credit addition from ${source}`,
          processedAt: new Date(),
          createdAt: new Date()
        }).returning();

        return {
          creditId: creditRecord[0].creditId,
          transactionId: transaction[0].transactionId,
          newBalance: (currentCredits.availableCredits || 0) + creditAmount
        };
      });

      console.log(`✅ Added ${creditAmount} credits, new balance: ${result.newBalance}`);

      return {
        success: true,
        ...result,
        addedAmount: creditAmount,
        source,
        expiryDate
      };

    } catch (error) {
      console.error('❌ Credit addition failed:', error);
      throw new Error(`Failed to add credits: ${error.message}`);
    }
  }

  /**
   * Transfer credits between organizations
   */
  async transferCredits(fromTenantId, toTenantId, amount, options = {}) {
    const { description, requestedBy } = options;

    console.log(`🔄 Transferring ${amount} credits from ${fromTenantId} to ${toTenantId}`);

    try {
      // Check sender has sufficient credits
      const senderCredits = await this.getCreditBalance(fromTenantId);
      if (senderCredits.availableCredits < amount) {
        throw new Error(`Insufficient credits for transfer. Available: ${senderCredits.availableCredits}`);
      }

      // Check receiver exists
      const receiverExists = await this.organizationExists(toTenantId);
      if (!receiverExists) {
        throw new Error('Recipient organization not found');
      }

      // Perform transfer
      const result = await db.transaction(async (tx) => {
        // Debit from sender
        const senderResult = await this.consumeCredits(fromTenantId, 'credit_transfer_out', amount, {
          description: `Transfer to ${toTenantId}`,
          operationId: uuidv4()
        });

        // Credit to receiver
        const receiverResult = await this.addCredits(toTenantId, amount, 'transfer', {
          description: `Transfer from ${fromTenantId}`,
          batchId: uuidv4()
        });

        return {
          transferId: uuidv4(),
          senderResult,
          receiverResult,
          amount
        };
      });

      console.log(`✅ Transferred ${amount} credits from ${fromTenantId} to ${toTenantId}`);

      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('❌ Credit transfer failed:', error);
      throw error;
    }
  }

  /**
   * Clean expired credits from pools
   */
  async cleanExpiredCredits(tenantId, creditRecord) {
    const now = new Date();
    let totalExpired = 0;
    const activePools = [];

    // Process credit pools
    for (const pool of creditRecord.creditPools) {
      const expiryDate = new Date(pool.expiryDate);

      if (expiryDate > now) {
        activePools.push(pool);
      } else {
        totalExpired += pool.amount;
      }
    }

    // Calculate new available credits
    const newAvailableCredits = Math.max(0, creditRecord.availableCredits - totalExpired);

    // Update record if credits expired
    if (totalExpired > 0) {
      await db.update(credits)
        .set({
          availableCredits: newAvailableCredits,
          creditPools: activePools,
          lastUpdatedAt: new Date()
        })
        .where(eq(credits.tenantId, tenantId));

      // Record expiry transaction
      await db.insert(creditTransactions).values({
        tenantId,
        entityType: 'organization',
        entityId: tenantId,
        transactionType: 'expiry',
        amount: -totalExpired,
        previousBalance: creditRecord.availableCredits,
        newBalance: newAvailableCredits,
        operationCode: 'credit_expiry',
        description: `Expired ${totalExpired} credits`,
        processedAt: new Date(),
        createdAt: new Date()
      });
    }

    return {
      availableCredits: newAvailableCredits,
      reservedCredits: creditRecord.reservedCredits,
      totalCredits: creditRecord.totalCredits - totalExpired,
      creditPools: activePools
    };
  }

  /**
   * Select appropriate credit batch for consumption
   */
  selectCreditBatch(creditPools, requiredAmount) {
    // Sort by expiry date (use oldest first)
    const sortedPools = creditPools
      .filter(pool => new Date(pool.expiryDate) > new Date())
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    // Find first pool with sufficient credits
    return sortedPools.find(pool => pool.amount >= requiredAmount) || sortedPools[0];
  }

  /**
   * Check if organization exists
   */
  async organizationExists(tenantId) {
    const org = await db
      .select({ tenantId: credits.tenantId })
      .from(credits)
      .where(eq(credits.tenantId, tenantId))
      .limit(1);

    return org.length > 0;
  }

  /**
   * Get credit usage statistics
   */
  async getCreditStatistics(tenantId, period = 'month') {
    try {
      const periodStart = new Date();

      switch (period) {
        case 'day':
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'week':
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case 'year':
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
      }

      const transactions = await db
        .select({
          transactionType: creditTransactions.transactionType,
          amount: creditTransactions.amount,
          createdAt: creditTransactions.createdAt
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.tenantId, tenantId),
            // Add date filter when supported
          )
        );

      const stats = {
        period,
        periodStart,
        totalConsumed: 0,
        totalAdded: 0,
        netChange: 0,
        transactionCount: transactions.length
      };

      transactions.forEach(tx => {
        if (tx.transactionType === 'consumption') {
          stats.totalConsumed += Math.abs(tx.amount);
        } else if (tx.transactionType === 'purchase') {
          stats.totalAdded += tx.amount;
        }
      });

      stats.netChange = stats.totalAdded - stats.totalConsumed;

      return stats;

    } catch (error) {
      console.error('❌ Credit statistics retrieval failed:', error);
      throw new Error(`Failed to get credit statistics: ${error.message}`);
    }
  }
}

export default new CreditAllocationService();
