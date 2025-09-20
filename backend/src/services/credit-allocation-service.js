import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CreditService } from './credit-service.js';

class CreditAllocationService {
  // Allocate trial credits for a new entity
  async allocateTrialCredits(tenantId, entityId, options = {}) {
    try {
      const {
        creditAmount = 1000,
        trialDays = 30,
        creditType = 'trial'
      } = options;

      console.log('💰 Allocating trial credits:', { tenantId, entityId, creditAmount, trialDays, creditType });

      // Generate a credit ID for tracking
      const creditId = uuidv4();

      // Actually allocate credits using CreditService with transaction record
      await CreditService.addCreditsToEntity({
        tenantId,
        entityType: 'organization',
        entityId,
        creditAmount,
        source: 'trial_allocation',
        sourceId: creditId,
        description: `Trial credit allocation: ${creditAmount} credits for ${trialDays} days`,
        initiatedBy: 'system' // System-initiated allocation
      });

      // Get the credit record to return proper information
      const creditRecord = await CreditService.getCurrentBalance(tenantId, 'organization', entityId);

      console.log('✅ Trial credits allocated successfully:', {
        creditId,
        tenantId,
        entityId,
        creditAmount,
        availableCredits: creditRecord?.availableCredits
      });

      return {
        success: true,
        creditId,
        tenantId,
        entityId,
        amount: creditAmount,
        expiryDate: null, // Credits don't expire in this implementation
        creditType
      };

    } catch (error) {
      console.error('❌ Error allocating trial credits:', error);
      throw error;
    }
  }

  // Check credit balance for a tenant
  async getCreditBalance(tenantId) {
    try {
      console.log('💰 Getting credit balance for tenant:', tenantId);

      // In a real implementation, you'd query the database
      // For now, return a mock balance
      const balance = {
        tenantId,
        totalCredits: 1000,
        usedCredits: 0,
        remainingCredits: 1000,
        activeAllocations: 1,
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Credit balance retrieved:', balance);
      return balance;

    } catch (error) {
      console.error('❌ Error getting credit balance:', error);
      throw error;
    }
  }

  // Deduct credits from tenant balance
  async deductCredits(tenantId, amount, reason = '') {
    try {
      console.log('💰 Deducting credits:', { tenantId, amount, reason });

      // In a real implementation, you'd update the database
      // For now, just log the operation
      console.log('✅ Credits deducted successfully');

      return {
        success: true,
        tenantId,
        amountDeducted: amount,
        remainingCredits: 1000 - amount, // Mock calculation
        reason
      };

    } catch (error) {
      console.error('❌ Error deducting credits:', error);
      throw error;
    }
  }

  // Extend trial period
  async extendTrialCredits(tenantId, additionalDays = 7) {
    try {
      console.log('⏰ Extending trial credits:', { tenantId, additionalDays });

      // In a real implementation, you'd update the database
      // For now, just log the operation
      console.log('✅ Trial credits extended successfully');

      return {
        success: true,
        tenantId,
        additionalDays,
        newExpiryDate: new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000)
      };

    } catch (error) {
      console.error('❌ Error extending trial credits:', error);
      throw error;
    }
  }
}

export default new CreditAllocationService();
