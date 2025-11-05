import { db } from '../db/index.js';
import { eq, and, sql, gte, desc, sum } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CreditService } from './credit-service.js';
import { creditAllocations, creditAllocationTransactions, entities, creditTransactions, credits } from '../db/schema/index.js';
import { crmSyncStreams } from '../utils/redis.js';
import { EventTrackingService } from './event-tracking-service.js';

class CreditAllocationService {
  // Supported applications that can have credit allocations
  static SUPPORTED_APPLICATIONS = ['crm', 'hr', 'affiliate', 'system'];

  /**
   * Allocate operational credits for tenant operations (free or paid)
   * Free credits: From plans, expire based on plan cycle
   * Paid credits: Top-ups, expire when plan expires
   */
  async allocateOperationalCredits({
    tenantId,
    sourceEntityId,
    creditAmount,
    creditType = 'free',        // 'free' or 'paid'
    allocationType = 'subscription', // 'subscription' for free, 'bulk'/'manual' for paid
    planId = null,              // Required for free credits to determine expiry
    expiresAt = null,           // Explicit expiry for paid credits
    allocatedBy,
    purpose = ''
  }) {
    try {
      console.log('💰 Allocating operational credits:', {
        tenantId,
        creditAmount,
        creditType,
        allocationType,
        planId,
        allocatedBy
      });

      // Validate inputs
      if (!['free', 'paid'].includes(creditType)) {
        throw new Error(`Invalid credit type: ${creditType}`);
      }

      if (creditType === 'free' && !planId) {
        throw new Error('planId is required for free credits');
      }

      // Determine expiry date based on credit type
      let finalExpiresAt = expiresAt;

      if (creditType === 'free') {
        // Free credits expire based on plan cycle
        const { PermissionMatrixUtils } = await import('../data/permission-matrix.js');
        const planCredits = PermissionMatrixUtils.getPlanCredits(planId);
        const expiryDays = planCredits.expiryDays || 30;

        if (planId === 'trial') {
          // Trial credits expire at trial end
          finalExpiresAt = new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000));
        } else {
          // Monthly/annual plan credits expire at next billing cycle
          // For now, use the configured days - this will be updated during renewals
          finalExpiresAt = new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000));
        }

        purpose = purpose || `${planId.charAt(0).toUpperCase() + planId.slice(1)} plan free credits`;
      } else {
        // Paid credits: if no explicit expiry, they don't expire automatically
        // They will be set to expire when the plan they were purchased under expires
        purpose = purpose || 'Paid credit top-up';
      }

      // Allocate credits to the 'system' application (operational credits)
      return await this.allocateCreditsToApplication({
        tenantId,
        sourceEntityId,
        targetApplication: 'system',
        creditAmount: parseFloat(creditAmount.toString()), // Ensure it's a number
        allocationPurpose: purpose,
        expiresAt: finalExpiresAt,
        allocatedBy,
        allocationType,
        creditType
      });

    } catch (error) {
      console.error('Error allocating operational credits:', error);
      throw error;
    }
  }

  /**
   * Process credit expiries based on rules
   * Free credits: Expire after configured period
   * Paid credits: Expire when their plan expires (handled separately)
   */
  async processCreditExpiries() {
    try {
      console.log('⏰ Processing credit expiries...');

      const now = new Date();

      // Find expired free credits
      const expiredFreeCredits = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.creditType, 'free'),
          eq(creditAllocations.isActive, true),
          sql`${creditAllocations.expiresAt} <= ${now}`
        ));

      console.log(`📅 Found ${expiredFreeCredits.length} expired free credit allocations`);

      // Expire each allocation
      for (const allocation of expiredFreeCredits) {
        try {
          console.log(`⏰ Expiring free credits allocation ${allocation.allocationId} (${allocation.allocatedCredits} credits)`);

          // Mark allocation as inactive
          await db
            .update(creditAllocations)
            .set({
              isActive: false,
              lastUpdatedAt: new Date()
            })
            .where(eq(creditAllocations.allocationId, allocation.allocationId));

          // Record expiry transaction
          await db.insert(creditAllocationTransactions).values({
            allocationId: allocation.allocationId,
            tenantId: allocation.tenantId,
            transactionType: 'expiry',
            amount: parseFloat(allocation.usedCredits),
            previousAllocated: parseFloat(allocation.allocatedCredits),
            newAllocated: 0,
            previousUsed: parseFloat(allocation.usedCredits),
            newUsed: parseFloat(allocation.usedCredits),
            description: `Free credits expired: ${allocation.allocationPurpose}`,
            createdAt: new Date()
          });

          console.log(`✅ Expired free credits allocation ${allocation.allocationId}`);
        } catch (allocationError) {
          console.error(`❌ Failed to expire allocation ${allocation.allocationId}:`, allocationError.message);
        }
      }

      // Handle paid credits expiry (when their plan expires)
      // This would be called when subscriptions expire/cancel
      await this.processPaidCreditsExpiry();

      console.log('✅ Credit expiry processing completed');

    } catch (error) {
      console.error('Error processing credit expiries:', error);
      throw error;
    }
  }

  /**
   * Process paid credits expiry when their associated plan expires
   */
  async processPaidCreditsExpiry() {
    try {
      console.log('💳 Processing paid credits expiry...');

      // This method would be called when subscriptions expire
      // For now, paid credits expiry is handled reactively when subscriptions change
      // Future: Add proactive expiry checking for paid credits

      console.log('✅ Paid credits expiry processing completed');

    } catch (error) {
      console.error('Error processing paid credits expiry:', error);
      throw error;
    }
  }

  /**
   * Expire all credits for a tenant (when subscription is cancelled)
   */
  async expireAllCreditsForTenant(tenantId, reason = 'subscription_cancelled') {
    try {
      console.log(`🚫 Expiring all credits for tenant ${tenantId}: ${reason}`);

      // Find all active credit allocations for the tenant
      const activeAllocations = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.isActive, true)
        ));

      console.log(`📋 Found ${activeAllocations.length} active credit allocations to expire`);

      // Expire each allocation
      for (const allocation of activeAllocations) {
        try {
          await db
            .update(creditAllocations)
            .set({
              isActive: false,
              lastUpdatedAt: new Date()
            })
            .where(eq(creditAllocations.allocationId, allocation.allocationId));

          // Record expiry transaction
          await db.insert(creditAllocationTransactions).values({
            allocationId: allocation.allocationId,
            tenantId: allocation.tenantId,
            transactionType: 'expiry',
            amount: parseFloat(allocation.usedCredits),
            previousAllocated: parseFloat(allocation.allocatedCredits),
            newAllocated: 0,
            previousUsed: parseFloat(allocation.usedCredits),
            newUsed: parseFloat(allocation.usedCredits),
            description: `${reason}: ${allocation.allocationPurpose}`,
            createdAt: new Date()
          });

          console.log(`✅ Expired allocation ${allocation.allocationId} (${allocation.allocatedCredits} credits)`);
        } catch (allocationError) {
          console.error(`❌ Failed to expire allocation ${allocation.allocationId}:`, allocationError.message);
        }
      }

      console.log(`✅ All credits expired for tenant ${tenantId}`);

    } catch (error) {
      console.error('Error expiring all credits for tenant:', error);
      throw error;
    }
  }

  /**
   * Allocate credits from organization pool to a specific application
   */
  async allocateCreditsToApplication({
    tenantId,
    sourceEntityId,
    targetApplication,
    creditAmount,
    allocationPurpose = '',
    allocatedBy,
    expiresAt = null,
    autoReplenish = false,
    allocationType = 'manual',
    creditType = 'free',
    additionalData = {} // Support for seasonal credit metadata
  }) {
    try {
      console.log('💰 Allocating credits to application:', {
        tenantId,
        sourceEntityId,
        targetApplication,
        creditAmount,
        allocatedBy
      });

      // Validate target application
      if (!this.constructor.SUPPORTED_APPLICATIONS.includes(targetApplication)) {
        throw new Error(`Unsupported application: ${targetApplication}`);
      }

      // Check if source entity has enough available credits
      // Skip this check for credit purchases (paid credits), bulk allocations, or seasonal credits
      if (creditType !== 'paid' && allocationType !== 'bulk' && !['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'].includes(creditType)) {
        const sourceBalance = await CreditService.getCurrentBalance(tenantId, 'organization', sourceEntityId);
        if (!sourceBalance || sourceBalance.availableCredits < creditAmount) {
          throw new Error(`Insufficient credits in source entity. Available: ${sourceBalance?.availableCredits || 0}, Required: ${creditAmount}`);
        }
      }

      // Check if allocation already exists for this application and credit type
      const existingAllocation = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.sourceEntityId, sourceEntityId),
          eq(creditAllocations.targetApplication, targetApplication),
          eq(creditAllocations.creditType, creditType),
          eq(creditAllocations.isActive, true)
        ))
        .limit(1);

      const allocationId = existingAllocation.length > 0 ? existingAllocation[0].allocationId : uuidv4();

      // Start transaction
      const result = await db.transaction(async (tx) => {
        let allocationRecord;

        if (existingAllocation.length > 0) {
          // Update existing allocation
          const currentAllocation = existingAllocation[0];
          const newAllocatedCredits = parseFloat(currentAllocation.allocatedCredits) + creditAmount;

          [allocationRecord] = await tx
            .update(creditAllocations)
            .set({
              allocatedCredits: newAllocatedCredits.toString(),
              availableCredits: (newAllocatedCredits - parseFloat(currentAllocation.usedCredits || '0')).toString(),
              allocationType,
              creditType,
              updatedBy: allocatedBy,
              lastUpdatedAt: new Date(),
              // Include seasonal credit metadata - explicit assignment
              campaignId: additionalData?.campaignId || null,
              campaignName: additionalData?.campaignName || null,
              creditMetadata: additionalData?.creditMetadata || null,
              expiryRule: additionalData?.expiryRule || 'fixed_date',
              expiryWarningDays: additionalData?.expiryWarningDays || '7'
            })
            .where(eq(creditAllocations.allocationId, allocationId))
            .returning();

            console.log('💾 Updating existing allocation with campaign data:', {
              allocationId,
              campaignId: additionalData?.campaignId,
              campaignName: additionalData?.campaignName,
              hasCreditMetadata: !!additionalData?.creditMetadata
            });
        } else {
          // Create new allocation
          [allocationRecord] = await tx
            .insert(creditAllocations)
            .values({
              allocationId,
              tenantId,
              sourceEntityId,
              targetApplication,
              allocatedCredits: creditAmount.toString(),
              availableCredits: creditAmount.toString(),
              allocationPurpose,
              allocationType,
              creditType,
              expiresAt,
              autoReplenish,
              allocatedBy,
              // Include seasonal credit metadata - explicit assignment
              campaignId: additionalData?.campaignId || null,
              campaignName: additionalData?.campaignName || null,
              creditMetadata: additionalData?.creditMetadata || null,
              expiryRule: additionalData?.expiryRule || 'fixed_date',
              expiryWarningDays: additionalData?.expiryWarningDays || '7'
            })
            .returning();

            console.log('💾 Creating new allocation with campaign data:', {
              allocationId,
              campaignId: additionalData?.campaignId,
              campaignName: additionalData?.campaignName,
              hasCreditMetadata: !!additionalData?.creditMetadata
            });
        }

        // Handle credit balance update based on allocation type
        // For bulk allocations (initial grants) and paid credits, ADD to balance; for other free credits, DEDUCT from balance
        let currentBalance = await CreditService.getCurrentBalance(tenantId, 'organization', sourceEntityId);

        // Create balance if it doesn't exist (for initial allocations)
        if (!currentBalance) {
          console.log('Creating initial credit balance for entity');
          await tx
            .insert(credits)
            .values({
              creditId: uuidv4(),
              tenantId,
              entityId: sourceEntityId,
              availableCredits: '0',
              isActive: true,
              lastUpdatedAt: new Date(),
              createdAt: new Date()
            });
          currentBalance = { availableCredits: 0 };
        }

        // Ensure creditAmount is a number and within safe limits
        const numericCreditAmount = typeof creditAmount === 'string' ? parseFloat(creditAmount) : creditAmount;
        const numericCurrentBalance = typeof currentBalance.availableCredits === 'string'
          ? parseFloat(currentBalance.availableCredits)
          : currentBalance.availableCredits;

        // Validate values are within decimal(15,4) limits (max ~10^11)
        const MAX_CREDITS = 99999999999.9999; // Just under 10^11
        if (numericCreditAmount > MAX_CREDITS || numericCurrentBalance > MAX_CREDITS) {
          throw new Error(`Credit amount exceeds maximum allowed value. Current: ${numericCurrentBalance}, Adding: ${numericCreditAmount}`);
        }

        let newAvailableCredits;
        let transactionAmount;

        // For bulk allocations (initial grants), paid credits, and seasonal credits, ADD to the balance
        if (creditType === 'paid' || allocationType === 'bulk' || ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'].includes(creditType)) {
          newAvailableCredits = numericCurrentBalance + numericCreditAmount;
          transactionAmount = numericCreditAmount.toString(); // Positive for addition
        } else {
          // For other free credits (application allocations), DEDUCT from the balance
          newAvailableCredits = numericCurrentBalance - numericCreditAmount;
          if (newAvailableCredits < 0) {
            throw new Error(`Insufficient credits. Available: ${numericCurrentBalance}, Required: ${numericCreditAmount}`);
          }
          transactionAmount = (-numericCreditAmount).toString(); // Negative for deduction
        }

        // Final validation of result
        if (newAvailableCredits > MAX_CREDITS) {
          throw new Error(`Resulting credit balance exceeds maximum allowed value: ${newAvailableCredits}`);
        }

        // Update entity's credit balance in credits table
        await tx
          .update(credits)
          .set({
            availableCredits: newAvailableCredits.toString(),
            lastUpdatedAt: new Date()
          })
          .where(and(
            eq(credits.tenantId, tenantId),
            eq(credits.entityId, sourceEntityId)
          ));

        // Create credit transaction record
        await tx
          .insert(creditTransactions)
          .values({
            transactionId: uuidv4(),
            tenantId,
            entityId: sourceEntityId,
            transactionType: creditType === 'paid' ? 'purchase' :
                          ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'].includes(creditType) ? 'seasonal_allocation' :
                          'allocation',
            amount: transactionAmount,
            previousBalance: currentBalance.availableCredits.toString(),
            newBalance: newAvailableCredits.toString(),
            initiatedBy: (allocatedBy && allocatedBy !== 'system') ? allocatedBy : null
          });

        // Create allocation transaction record
        await tx
          .insert(creditAllocationTransactions)
          .values({
            tenantId,
            allocationId,
            transactionType: 'allocation',
            amount: creditAmount.toString(),
            previousAllocated: existingAllocation.length > 0 ? existingAllocation[0].allocatedCredits : '0',
            newAllocated: allocationRecord.allocatedCredits,
            previousUsed: existingAllocation.length > 0 ? existingAllocation[0].usedCredits : '0',
            newUsed: allocationRecord.usedCredits,
            description: `Allocated ${creditAmount} credits to ${targetApplication}`,
            initiatedBy: (allocatedBy && allocatedBy !== 'system') ? allocatedBy : null
          });

        return allocationRecord;
      });

      console.log('✅ Credits allocated to application successfully:', {
        allocationId,
        targetApplication,
        allocatedCredits: result.allocatedCredits,
        availableCredits: result.availableCredits
      });

      // Publish credit application allocation event to Redis streams
      let publishedEventId = null;
      try {
        const publishResult = await crmSyncStreams.publishCreditAllocation(tenantId, sourceEntityId, creditAmount, {
          allocationId,
          reason: allocationPurpose || 'application_allocation',
          entityType: 'organization',
          targetApplication,
          allocatedBy,
          availableCredits: parseFloat(result.availableCredits)
        });

        // Track the published event
        if (publishResult) {
          publishedEventId = publishResult.eventId;
          await EventTrackingService.trackPublishedEvent({
            eventId: publishedEventId,
            eventType: 'credit.allocated',
            tenantId,
            entityId: sourceEntityId,
            streamKey: 'credit-events',
            sourceApplication: 'wrapper',
            targetApplication: targetApplication, // crm, hr, affiliate, system
            eventData: {
              allocationId,
              amount: creditAmount,
              targetApplication,
              allocatedBy,
              availableCredits: parseFloat(result.availableCredits)
            },
            publishedBy: allocatedBy,
            metadata: {
              operation: 'credit_allocation_to_application',
              allocationPurpose
            }
          });
        }
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit application allocation event:', streamError.message);
        // Still track the attempt even if publishing failed
        if (publishedEventId) {
          await EventTrackingService.markEventFailed(publishedEventId, streamError.message, false);
        }
      }

      return {
        success: true,
        allocationId,
        tenantId,
        sourceEntityId,
        targetApplication,
        allocatedCredits: parseFloat(result.allocatedCredits),
        availableCredits: parseFloat(result.availableCredits),
        allocationPurpose,
        expiresAt,
        autoReplenish
      };

    } catch (error) {
      console.error('❌ Error allocating credits to application:', error);
      throw error;
    }
  }

  /**
   * Consume credits from application allocation
   */
  async consumeApplicationCredits({
    tenantId,
    sourceEntityId, // The organization/entity that allocated the credits
    application,
    creditAmount,
    operationCode,
    operationId,
    description,
    initiatedBy
  }) {
    try {
      console.log('💰 Consuming application credits:', {
        tenantId,
        application,
        creditAmount,
        operationCode
      });

      // Find active allocation for this application and organization
      const [allocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          sourceEntityId ? eq(creditAllocations.sourceEntityId, sourceEntityId) : undefined,
          eq(creditAllocations.targetApplication, application),
          eq(creditAllocations.isActive, true),
          gte(creditAllocations.availableCredits, creditAmount.toString())
        ).filter(Boolean)) // Remove undefined conditions
        .limit(1);

      if (!allocation) {
        const entityInfo = sourceEntityId ? ` for organization ${sourceEntityId}` : '';
        return {
          success: false,
          message: `No active credit allocation found for application ${application}${entityInfo} with sufficient credits`,
          data: {
            application,
            sourceEntityId,
            requiredCredits: creditAmount,
            availableCredits: 0
          }
        };
      }

      // Start transaction to consume credits
      const result = await db.transaction(async (tx) => {
        const newUsedCredits = parseFloat(allocation.usedCredits) + creditAmount;
        const newAvailableCredits = parseFloat(allocation.allocatedCredits) - newUsedCredits;

        // Update allocation
        const [updatedAllocation] = await tx
          .update(creditAllocations)
          .set({
            usedCredits: newUsedCredits.toString(),
            availableCredits: newAvailableCredits.toString(),
            lastUpdatedAt: new Date()
          })
          .where(eq(creditAllocations.allocationId, allocation.allocationId))
          .returning();

        // Create consumption transaction record
        await tx
          .insert(creditAllocationTransactions)
          .values({
            tenantId,
            allocationId: allocation.allocationId,
            transactionType: 'consumption',
            amount: (-creditAmount).toString(),
            previousAllocated: allocation.allocatedCredits,
            newAllocated: allocation.allocatedCredits,
            previousUsed: allocation.usedCredits,
            newUsed: updatedAllocation.usedCredits,
            operationCode,
            description,
            initiatedBy
          });

        return updatedAllocation;
      });

      console.log('✅ Application credits consumed successfully:', {
        application,
        consumedCredits: creditAmount,
        remainingCredits: parseFloat(result.availableCredits)
      });

      // Publish credit consumption event to Redis streams
      let publishedEventId = null;
      try {
        const publishResult = await crmSyncStreams.publishCreditConsumption(
          tenantId,
          sourceEntityId || allocation.sourceEntityId,
          initiatedBy,
          creditAmount,
          operationCode,
          operationId,
          {
            resourceType: description ? 'operation' : 'application',
            resourceId: operationId || application,
            remainingCredits: parseFloat(result.availableCredits),
            allocationId: allocation.allocationId
          }
        );

        // Track the published event
        if (publishResult) {
          publishedEventId = publishResult.eventId;
          await EventTrackingService.trackPublishedEvent({
            eventId: publishedEventId,
            eventType: 'credit.consumed',
            tenantId,
            entityId: sourceEntityId || allocation.sourceEntityId,
            streamKey: 'credit-events',
            sourceApplication: 'wrapper',
            targetApplication: application, // crm, hr, affiliate, system
            eventData: {
              amount: creditAmount,
              operationCode,
              operationId,
              application,
              remainingCredits: parseFloat(result.availableCredits),
              allocationId: allocation.allocationId
            },
            publishedBy: initiatedBy,
            metadata: {
              operation: 'credit_consumption_from_application',
              resourceType: description ? 'operation' : 'application'
            }
          });
        }
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit consumption event:', streamError.message);
        // Still track the attempt even if publishing failed
        if (publishedEventId) {
          await EventTrackingService.markEventFailed(publishedEventId, streamError.message, false);
        }
      }

      return {
        success: true,
        allocationId: allocation.allocationId,
        application,
        consumedCredits: creditAmount,
        remainingCredits: parseFloat(result.availableCredits)
      };

    } catch (error) {
      console.error('❌ Error consuming application credits:', error);
      throw error;
    }
  }

  /**
   * Get credit allocation summary for a tenant
   */
  async getApplicationAllocations(tenantId, sourceEntityId = null) {
    try {
      console.log('💰 Getting application credit allocations:', { tenantId, sourceEntityId });

      let whereConditions = [eq(creditAllocations.tenantId, tenantId), eq(creditAllocations.isActive, true)];

      if (sourceEntityId) {
        whereConditions.push(eq(creditAllocations.sourceEntityId, sourceEntityId));
      }

      const allocations = await db
        .select({
          allocationId: creditAllocations.allocationId,
          tenantId: creditAllocations.tenantId,
          sourceEntityId: creditAllocations.sourceEntityId,
          targetApplication: creditAllocations.targetApplication,
          allocatedCredits: creditAllocations.allocatedCredits,
          usedCredits: creditAllocations.usedCredits,
          availableCredits: creditAllocations.availableCredits,
          allocationType: creditAllocations.allocationType,
          allocationPurpose: creditAllocations.allocationPurpose,
          allocatedAt: creditAllocations.allocatedAt,
          expiresAt: creditAllocations.expiresAt,
          autoReplenish: creditAllocations.autoReplenish
        })
        .from(creditAllocations)
        .where(and(...whereConditions))
        .orderBy(desc(creditAllocations.allocatedAt));

      // Calculate totals
      const totals = allocations.reduce((acc, allocation) => {
        acc.totalAllocated += parseFloat(allocation.allocatedCredits);
        acc.totalUsed += parseFloat(allocation.usedCredits);
        acc.totalAvailable += parseFloat(allocation.availableCredits);
        return acc;
      }, { totalAllocated: 0, totalUsed: 0, totalAvailable: 0 });

      return {
        success: true,
        data: {
          allocations: allocations.map(allocation => ({
            ...allocation,
            allocatedCredits: parseFloat(allocation.allocatedCredits),
            usedCredits: parseFloat(allocation.usedCredits),
            availableCredits: parseFloat(allocation.availableCredits)
          })),
          summary: totals
        }
      };

    } catch (error) {
      console.error('❌ Error getting application allocations:', error);
      throw error;
    }
  }

  /**
   * Get credit balance for a specific application
   */
  async getApplicationCreditBalance(tenantId, application) {
    try {
      console.log('💰 Getting application credit balance:', { tenantId, application });

      const [allocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.targetApplication, application),
          eq(creditAllocations.isActive, true)
        ))
        .limit(1);

      if (!allocation) {
        return {
          success: true,
          data: {
            tenantId,
            application,
            allocatedCredits: 0,
            usedCredits: 0,
            availableCredits: 0,
            hasAllocation: false
          }
        };
      }

      return {
        success: true,
        data: {
          tenantId,
          application,
          allocationId: allocation.allocationId,
          allocatedCredits: parseFloat(allocation.allocatedCredits),
          usedCredits: parseFloat(allocation.usedCredits),
          availableCredits: parseFloat(allocation.availableCredits),
          allocationPurpose: allocation.allocationPurpose,
          allocatedAt: allocation.allocatedAt,
          expiresAt: allocation.expiresAt,
          autoReplenish: allocation.autoReplenish,
          hasAllocation: true
        }
      };

    } catch (error) {
      console.error('❌ Error getting application credit balance:', error);
      throw error;
    }
  }

  /**
   * Transfer credits between applications
   */
  async transferCreditsBetweenApplications({
    tenantId,
    fromApplication,
    toApplication,
    creditAmount,
    transferReason = '',
    initiatedBy
  }) {
    try {
      console.log('💰 Transferring credits between applications:', {
        tenantId,
        fromApplication,
        toApplication,
        creditAmount
      });

      // Get allocations for both applications
      const [fromAllocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.targetApplication, fromApplication),
          eq(creditAllocations.isActive, true),
          gte(creditAllocations.availableCredits, creditAmount.toString())
        ))
        .limit(1);

      if (!fromAllocation) {
        throw new Error(`Insufficient credits in ${fromApplication} allocation`);
      }

      const [toAllocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.targetApplication, toApplication),
          eq(creditAllocations.isActive, true)
        ))
        .limit(1);

      if (!toAllocation) {
        throw new Error(`No active allocation found for ${toApplication}`);
      }

      // Start transaction
      await db.transaction(async (tx) => {
        // Decrease from allocation
        const fromNewUsed = parseFloat(fromAllocation.usedCredits) + creditAmount;
        const fromNewAvailable = parseFloat(fromAllocation.allocatedCredits) - fromNewUsed;

        await tx
          .update(creditAllocations)
          .set({
            usedCredits: fromNewUsed.toString(),
            availableCredits: fromNewAvailable.toString(),
            lastUpdatedAt: new Date()
          })
          .where(eq(creditAllocations.allocationId, fromAllocation.allocationId));

        // Increase to allocation
        const toNewAllocated = parseFloat(toAllocation.allocatedCredits) + creditAmount;
        const toNewAvailable = toNewAllocated - parseFloat(toAllocation.usedCredits);

        await tx
          .update(creditAllocations)
          .set({
            allocatedCredits: toNewAllocated.toString(),
            availableCredits: toNewAvailable.toString(),
            lastUpdatedAt: new Date()
          })
          .where(eq(creditAllocations.allocationId, toAllocation.allocationId));

        // Create transfer transaction records
        await tx
          .insert(creditAllocationTransactions)
          .values([
            {
              tenantId,
              allocationId: fromAllocation.allocationId,
              transactionType: 'transfer_out',
              amount: (-creditAmount).toString(),
              previousAllocated: fromAllocation.allocatedCredits,
              newAllocated: fromAllocation.allocatedCredits,
              previousUsed: fromAllocation.usedCredits,
              newUsed: fromNewUsed.toString(),
              description: `Transferred ${creditAmount} credits to ${toApplication}: ${transferReason}`,
              initiatedBy
            },
            {
              tenantId,
              allocationId: toAllocation.allocationId,
              transactionType: 'transfer_in',
              amount: creditAmount.toString(),
              previousAllocated: toAllocation.allocatedCredits,
              newAllocated: toNewAllocated.toString(),
              previousUsed: toAllocation.usedCredits,
              newUsed: toAllocation.usedCredits,
              description: `Received ${creditAmount} credits from ${fromApplication}: ${transferReason}`,
              initiatedBy
            }
          ]);
      });

      console.log('✅ Credits transferred between applications successfully');

      return {
        success: true,
        fromApplication,
        toApplication,
        transferredCredits: creditAmount,
        transferReason
      };

    } catch (error) {
      console.error('❌ Error transferring credits between applications:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility

  async allocateTrialCredits(tenantId, entityId, options = {}) {
    const {
      creditAmount = 1000,
      trialDays = 30,
      creditType = 'trial'
    } = options;

    return await CreditService.addCreditsToEntity({
      tenantId,
      entityType: 'organization',
      entityId,
      creditAmount,
      source: 'trial_allocation',
      sourceId: uuidv4(),
      description: `Trial credit allocation: ${creditAmount} credits for ${trialDays} days`,
      initiatedBy: 'system'
    });
  }

  async getCreditBalance(tenantId) {
    return await CreditService.getCurrentBalance(tenantId);
  }

  async deductCredits(tenantId, amount, reason = '') {
    // This is now handled by consumeCredits in CreditService
    console.warn('CreditAllocationService.deductCredits is deprecated. Use CreditService.consumeCredits instead.');
    return { success: false, message: 'Method deprecated' };
  }

  async extendTrialCredits(tenantId, additionalDays = 7) {
    console.warn('CreditAllocationService.extendTrialCredits is deprecated.');
    return { success: false, message: 'Method deprecated' };
  }
}

export { CreditAllocationService };
export default new CreditAllocationService();