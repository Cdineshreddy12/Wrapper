import { db, systemDbConnection } from '../../../db/index.js';
import { credits, creditTransactions } from '../../../db/schema/index.js';
import { eq, and, lte, isNotNull, gte, isNull, asc } from 'drizzle-orm';
import { seasonalCreditAllocations } from '../../../db/schema/billing/seasonal-credits.js';
import { randomUUID } from 'crypto';

type SeasonalAllocationRow = typeof seasonalCreditAllocations.$inferSelect;

/**
 * Credit Expiry Service
 * Handles credit expiry processing, notifications, and cleanup
 */
export class CreditExpiryService {
  /**
   * Process expired credits for all tenants
   * This method should be called periodically (e.g., via cron job)
   * Handles both primary org and application-specific allocations
   */
  static async processExpiredCredits() {
    const now = new Date();
    console.log(`🕐 [CreditExpiryService] Processing expired credits at ${now.toISOString()}`);

    try {
      // Find all expired seasonal credit allocations that are still active
      const expiredAllocations = await db
        .select()
        .from(seasonalCreditAllocations)
        .where(and(
          eq(seasonalCreditAllocations.isActive, true),
          eq(seasonalCreditAllocations.isExpired, false),
          isNotNull(seasonalCreditAllocations.expiresAt),
          lte(seasonalCreditAllocations.expiresAt, now)
        ));

      console.log(`📋 [CreditExpiryService] Found ${expiredAllocations.length} expired allocations`);

      let processedCount = 0;
      let errorCount = 0;
      const applicationExpiryMap: Record<string, { count: number; totalUnusedCredits: number }> = {};

      for (const allocation of expiredAllocations) {
        try {
          const result = await this.processExpiredAllocation(allocation);
          processedCount++;
          
          // Track application-specific expiry
          if (allocation.targetApplication) {
            if (!applicationExpiryMap[allocation.targetApplication]) {
              applicationExpiryMap[allocation.targetApplication] = {
                count: 0,
                totalUnusedCredits: 0
              };
            }
            applicationExpiryMap[allocation.targetApplication].count++;
            applicationExpiryMap[allocation.targetApplication].totalUnusedCredits += result.unusedCredits || 0;
          }
        } catch (error) {
          console.error(`❌ [CreditExpiryService] Error processing allocation ${allocation.allocationId}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ [CreditExpiryService] Processed ${processedCount} expired allocations, ${errorCount} errors`);
      if (Object.keys(applicationExpiryMap).length > 0) {
        console.log(`📊 [CreditExpiryService] Application-specific expiry summary:`, applicationExpiryMap);
      }

      return {
        success: true,
        processedCount,
        errorCount,
        totalExpired: expiredAllocations.length,
        applicationExpiryMap,
        timestamp: now.toISOString()
      };
    } catch (error) {
      console.error('❌ [CreditExpiryService] Error processing expired credits:', error);
      throw error;
    }
  }

  /**
   * Process a single expired allocation
   * @param allocation - The expired credit allocation
   */
  static async processExpiredAllocation(allocation: SeasonalAllocationRow): Promise<{ allocationId: string; unusedCredits: number; deducted: boolean; targetApplication: string }> {
    const allocationId = String(allocation.allocationId ?? '');
    const tenantId = String(allocation.tenantId ?? '');
    const entityId = String(allocation.entityId ?? '');
    const { allocatedCredits, usedCredits, expiresAt, targetApplication } = allocation;

    const allocationType = targetApplication ? `application-specific (${targetApplication})` : 'primary org';
    console.log(`🔄 [CreditExpiryService] Processing expired ${allocationType} allocation ${allocationId}`);

    // Calculate unused credits
    const allocated = parseFloat(String(allocatedCredits ?? 0));
    const used = parseFloat(String(usedCredits ?? 0));
    const unusedCredits = allocated - used;

    // Mark allocation as expired
    await db
      .update(seasonalCreditAllocations)
      .set({
        isExpired: true,
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(seasonalCreditAllocations.allocationId, allocationId));

    console.log(`✅ [CreditExpiryService] Marked ${allocationType} allocation ${allocationId} as expired`);

    // If there are unused credits, deduct them from the organization's credit balance
    // Note: For application-specific allocations, we still deduct from org balance
    // but track which application the credits were allocated to
    if (unusedCredits > 0) {
      const app = (typeof targetApplication === 'string' ? targetApplication : null) as string | null;
      const tId = String(tenantId);
      const eId = String(entityId);
      const aId = String(allocationId);
      await this.deductExpiredCredits(tId, eId, unusedCredits, aId, app);
    }

    // TODO: Send notification to organization admins about expired credits
    // Include targetApplication in notification if applicable
    // await this.sendExpiryNotification(tenantId, entityId, unusedCredits, expiresAt, targetApplication);

    return {
      allocationId,
      unusedCredits,
      deducted: unusedCredits > 0,
      targetApplication: typeof targetApplication === 'string' ? targetApplication : 'primary_org'
    };
  }

  /**
   * Deduct expired unused credits from organization balance
   * @param {string} tenantId - Tenant ID
   * @param {string} entityId - Entity ID (organization)
   * @param {number} expiredCredits - Amount of expired credits to deduct
   * @param {string} allocationId - Allocation ID for tracking
   * @param {string} targetApplication - Target application (null for primary org allocation)
   */
  static async deductExpiredCredits(tenantId: string, entityId: string, expiredCredits: number, allocationId: string, targetApplication: string | null = null): Promise<void> {
    try {
      // Find the credit record for this entity
      const [creditRecord] = await systemDbConnection
        .select()
        .from(credits)
        .where(and(
          eq(credits.tenantId, tenantId),
          eq(credits.entityId, entityId)
        ))
        .limit(1);

      if (!creditRecord) {
        console.warn(`⚠️ [CreditExpiryService] No credit record found for tenant ${tenantId}, entity ${entityId}`);
        return;
      }

      const currentBalance = parseFloat(String(creditRecord.availableCredits ?? 0));
      const newBalance = Math.max(0, currentBalance - expiredCredits);

      // Update credit balance
      await systemDbConnection
        .update(credits)
        .set({
          availableCredits: newBalance.toString(),
          lastUpdatedAt: new Date()
        })
        .where(eq(credits.creditId, creditRecord.creditId));

      // Create transaction record for audit trail
      // Include targetApplication in operation code for tracking
      const operationCode = targetApplication
        ? `credit_expiry:${String(targetApplication)}:${allocationId}`
        : `credit_expiry:primary_org:${allocationId}`;

      await systemDbConnection
        .insert(creditTransactions)
        .values({
          transactionId: randomUUID(),
          tenantId: tenantId,
          entityId: entityId,
          transactionType: 'expiry',
          amount: (-expiredCredits).toString(),
          previousBalance: currentBalance.toString(),
          newBalance: newBalance.toString(),
          operationCode: operationCode,
          createdAt: new Date()
        });

      const allocationType = targetApplication ? `application-specific (${targetApplication})` : 'primary org';
      console.log(`✅ [CreditExpiryService] Deducted ${expiredCredits} expired ${allocationType} credits from entity ${entityId}`);
    } catch (error) {
      console.error(`❌ [CreditExpiryService] Error deducting expired credits:`, error);
      throw error;
    }
  }

  /**
   * Get credits expiring soon (within specified days)
   * @param {number} daysAhead - Number of days to look ahead (default: 7)
   * @param {string} tenantId - Optional tenant ID to filter by
   * @param {string} entityId - Optional entity ID to filter by
   * @param {string} targetApplication - Optional application code to filter by (null for primary org)
   */
  static async getExpiringCredits(daysAhead = 7, tenantId: string | null = null, entityId: string | null = null, targetApplication: string | null = null) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const now = new Date();

    const conditions = [
      eq(seasonalCreditAllocations.isActive, true),
      eq(seasonalCreditAllocations.isExpired, false),
      isNotNull(seasonalCreditAllocations.expiresAt),
      gte(seasonalCreditAllocations.expiresAt, now),
      lte(seasonalCreditAllocations.expiresAt, futureDate)
    ];

    if (tenantId != null && tenantId !== '') {
      conditions.push(eq(seasonalCreditAllocations.tenantId, tenantId));
    }

    if (entityId != null && entityId !== '') {
      conditions.push(eq(seasonalCreditAllocations.entityId, entityId));
    }

    // Filter by target application if specified
    if (targetApplication !== undefined) {
      if (targetApplication === null) {
        // Filter for primary org allocations (targetApplication IS NULL)
        conditions.push(isNull(seasonalCreditAllocations.targetApplication));
      } else {
        // Filter for specific application
        conditions.push(eq(seasonalCreditAllocations.targetApplication, targetApplication));
      }
    }

    const expiringAllocations = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(and(...conditions))
      .orderBy(asc(seasonalCreditAllocations.expiresAt));

    return expiringAllocations.map(allocation => {
      const expiryDate = new Date(allocation.expiresAt);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const unusedCredits = parseFloat(String(allocation.allocatedCredits ?? 0)) - parseFloat(String(allocation.usedCredits ?? 0));
      const allocationType = typeof allocation.targetApplication === 'string' ? `application-specific (${allocation.targetApplication})` : 'primary org';

      return {
        ...allocation,
        daysUntilExpiry,
        unusedCredits,
        expiresAt: expiryDate.toISOString(),
        allocationType
      };
    });
  }

  /**
   * Send expiry warnings to organization admins
   * TODO: Implement notification system
   */
  static async sendExpiryWarnings(daysAhead = 7) {
    const expiringCredits = await this.getExpiringCredits(daysAhead);

    console.log(`📧 [CreditExpiryService] Sending expiry warnings for ${expiringCredits.length} allocations`);

    // Group by tenant and entity
    type GroupVal = { tenantId: string; entityId: string; allocations: unknown[] };
    const grouped = expiringCredits.reduce((acc: Record<string, GroupVal>, allocation: { tenantId: string; entityId: string }) => {
      const key = `${allocation.tenantId}:${allocation.entityId}`;
      if (!acc[key]) {
        acc[key] = {
          tenantId: allocation.tenantId,
          entityId: allocation.entityId,
          allocations: []
        };
      }
      acc[key].allocations.push(allocation);
      return acc;
    }, {} as Record<string, GroupVal>);

    // TODO: Send notifications to organization admins
    // For each group, send a notification with:
    // - Total credits expiring
    // - Expiry date
    // - Days remaining
    // - Link to purchase more credits

    return {
      warningsSent: Object.keys(grouped).length,
      totalAllocations: expiringCredits.length
    };
  }

  /**
   * Get expiry statistics for a tenant/entity
   * @param {string} tenantId - Tenant ID
   * @param {string} entityId - Entity ID (organization)
   */
  static async getExpiryStats(tenantId: string, entityId: string) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get expiring within 7 days
    const expiringSoon = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(and(
        eq(seasonalCreditAllocations.tenantId, String(tenantId)),
        eq(seasonalCreditAllocations.entityId, String(entityId)),
        eq(seasonalCreditAllocations.isActive, true),
        eq(seasonalCreditAllocations.isExpired, false),
        isNotNull(seasonalCreditAllocations.expiresAt),
        gte(seasonalCreditAllocations.expiresAt, now),
        lte(seasonalCreditAllocations.expiresAt, sevenDaysFromNow)
      ));

    // Get expiring within 30 days
    const expiringWithin30Days = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(and(
        eq(seasonalCreditAllocations.tenantId, String(tenantId)),
        eq(seasonalCreditAllocations.entityId, String(entityId)),
        eq(seasonalCreditAllocations.isActive, true),
        eq(seasonalCreditAllocations.isExpired, false),
        isNotNull(seasonalCreditAllocations.expiresAt),
        gte(seasonalCreditAllocations.expiresAt, now),
        lte(seasonalCreditAllocations.expiresAt, thirtyDaysFromNow)
      ));

    // Calculate total unused credits that will expire
    const calculateUnusedCredits = (allocations: SeasonalAllocationRow[]): number => {
      return allocations.reduce((total: number, allocation: SeasonalAllocationRow) => {
        const allocated = parseFloat(String(allocation.allocatedCredits ?? 0));
        const used = parseFloat(String(allocation.usedCredits ?? 0));
        return total + (allocated - used);
      }, 0);
    };

    return {
      expiringSoon: {
        count: expiringSoon.length,
        unusedCredits: calculateUnusedCredits(expiringSoon)
      },
      expiringWithin30Days: {
        count: expiringWithin30Days.length,
        unusedCredits: calculateUnusedCredits(expiringWithin30Days)
      }
    };
  }
}

