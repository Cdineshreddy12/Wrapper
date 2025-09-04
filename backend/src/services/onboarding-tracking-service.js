import { db } from '../db/index.js';
import { tenants, onboardingEvents } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';

export class OnboardingTrackingService {
  /**
   * Track onboarding phase completion with enhanced analytics
   */
  static async trackOnboardingPhase(tenantId, phase, action, metadata = {}) {
    try {
      const now = new Date();
      const userId = metadata.userId || null;
      const sessionId = metadata.sessionId || null;

      // Record the event in onboarding_events table
      const [eventRecord] = await db.insert(onboardingEvents).values({
        tenantId,
        eventType: `${phase}_onboarding_${action}`,
        eventPhase: phase,
        eventAction: action,
        userId,
        sessionId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        eventData: metadata.eventData || {},
        metadata: metadata.metadata || {},
        timeSpent: metadata.timeSpent,
        completionRate: metadata.completionRate,
        stepNumber: metadata.stepNumber,
        totalSteps: metadata.totalSteps,
        variantId: metadata.variantId,
        experimentId: metadata.experimentId,
        eventTimestamp: now
      }).returning();

      // Update tenant's onboarding phases tracking
      const phaseUpdate = {};
      phaseUpdate[`${phase}OnboardingCompleted`] = action === 'completed';
      if (action === 'completed') {
        phaseUpdate[`${phase}OnboardingCompletedAt`] = now;
      }

      // Update onboarding phases JSON
      const currentTenant = await db
        .select({
          onboardingPhases: tenants.onboardingPhases,
          userJourney: tenants.userJourney
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (currentTenant.length > 0) {
        const phases = currentTenant[0].onboardingPhases || {};
        const journey = currentTenant[0].userJourney || [];

        // Update phase status
        if (!phases[phase]) {
          phases[phase] = { completed: false, completedAt: null, skipped: false };
        }

        phases[phase].completed = action === 'completed';
        if (action === 'completed') {
          phases[phase].completedAt = now.toISOString();
        }
        phases[phase].skipped = action === 'skipped';

        // Add journey event
        journey.push({
          event: `${phase}_onboarding_${action}`,
          timestamp: now.toISOString(),
          metadata: metadata
        });

        await db
          .update(tenants)
          .set({
            ...phaseUpdate,
            onboardingPhases: phases,
            userJourney: journey.slice(-50), // Keep last 50 events
            updatedAt: now
          })
          .where(eq(tenants.tenantId, tenantId));
      }

      console.log(`✅ Tracked ${phase} onboarding ${action} for tenant ${tenantId}`);
      return eventRecord;

    } catch (error) {
      console.error(`❌ Failed to track ${phase} onboarding ${action}:`, error);
      throw error;
    }
  }

  /**
   * Get onboarding analytics for a tenant
   */
  static async getOnboardingAnalytics(tenantId) {
    try {
      const events = await db
        .select()
        .from(onboardingEvents)
        .where(eq(onboardingEvents.tenantId, tenantId))
        .orderBy(desc(onboardingEvents.eventTimestamp));

      const [tenant] = await db
        .select({
          onboardingPhases: tenants.onboardingPhases,
          userJourney: tenants.userJourney,
          trialOnboardingCompleted: tenants.trialOnboardingCompleted,
          upgradeOnboardingCompleted: tenants.upgradeOnboardingCompleted,
          profileOnboardingCompleted: tenants.profileOnboardingCompleted
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return null;
      }

      // Calculate analytics
      const analytics = {
        tenantId,
        phases: tenant.onboardingPhases || {},
        journey: tenant.userJourney || [],
        events: events,
        summary: {
          trialCompleted: tenant.trialOnboardingCompleted,
          upgradeCompleted: tenant.upgradeOnboardingCompleted,
          profileCompleted: tenant.profileOnboardingCompleted,
          totalEvents: events.length,
          completionRate: this.calculateCompletionRate(tenant.onboardingPhases),
          averageTimeSpent: this.calculateAverageTime(events),
          abandonmentRate: this.calculateAbandonmentRate(events)
        }
      };

      return analytics;

    } catch (error) {
      console.error('❌ Failed to get onboarding analytics:', error);
      throw error;
    }
  }

  /**
   * Get onboarding funnel analytics across all tenants
   */
  static async getOnboardingFunnelAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;

      let whereClause = [];
      if (startDate) whereClause.push(`event_timestamp >= '${startDate}'`);
      if (endDate) whereClause.push(`event_timestamp <= '${endDate}'`);

      const events = await db
        .select({
          eventPhase: onboardingEvents.eventPhase,
          eventAction: onboardingEvents.eventAction,
          count: onboardingEvents.eventId
        })
        .from(onboardingEvents)
        .where(whereClause.length > 0 ? whereClause.join(' AND ') : '1=1')
        .groupBy(onboardingEvents.eventPhase, onboardingEvents.eventAction);

      // Aggregate funnel data
      const funnel = {
        trial: {
          started: 0,
          completed: 0,
          skipped: 0,
          abandoned: 0
        },
        profile: {
          started: 0,
          completed: 0,
          skipped: 0,
          abandoned: 0
        },
        upgrade: {
          started: 0,
          completed: 0,
          skipped: 0,
          abandoned: 0
        }
      };

      events.forEach(event => {
        if (funnel[event.eventPhase]) {
          funnel[event.eventPhase][event.eventAction] = parseInt(event.count);
        }
      });

      // Calculate conversion rates
      const conversionRates = {};
      Object.keys(funnel).forEach(phase => {
        const phaseData = funnel[phase];
        conversionRates[phase] = {
          completionRate: phaseData.started > 0 ? (phaseData.completed / phaseData.started) * 100 : 0,
          skipRate: phaseData.started > 0 ? (phaseData.skipped / phaseData.started) * 100 : 0,
          abandonmentRate: phaseData.started > 0 ? (phaseData.abandoned / phaseData.started) * 100 : 0
        };
      });

      return {
        funnel,
        conversionRates,
        dateRange
      };

    } catch (error) {
      console.error('❌ Failed to get onboarding funnel analytics:', error);
      throw error;
    }
  }

  /**
   * Track A/B test variant assignment
   */
  static async assignOnboardingVariant(tenantId, variantId, experimentId) {
    try {
      await db
        .update(tenants)
        .set({
          onboardingVariant: variantId,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Record variant assignment event
      await this.trackOnboardingPhase(tenantId, 'experiment', 'assigned', {
        variantId,
        experimentId,
        eventData: { variant: variantId, experiment: experimentId }
      });

      console.log(`✅ Assigned variant ${variantId} for experiment ${experimentId} to tenant ${tenantId}`);
      return { variantId, experimentId };

    } catch (error) {
      console.error('❌ Failed to assign onboarding variant:', error);
      throw error;
    }
  }

  /**
   * Get tenant's current onboarding status
   */
  static async getOnboardingStatus(tenantId) {
    try {
      const [tenant] = await db
        .select({
          onboardingCompleted: tenants.onboardingCompleted,
          trialOnboardingCompleted: tenants.trialOnboardingCompleted,
          upgradeOnboardingCompleted: tenants.upgradeOnboardingCompleted,
          profileOnboardingCompleted: tenants.profileOnboardingCompleted,
          onboardingPhases: tenants.onboardingPhases,
          setupCompletionRate: tenants.setupCompletionRate,
          onboardingVariant: tenants.onboardingVariant
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return null;
      }

      return {
        tenantId,
        overallCompleted: tenant.onboardingCompleted,
        phases: {
          trial: tenant.trialOnboardingCompleted,
          profile: tenant.profileOnboardingCompleted,
          upgrade: tenant.upgradeOnboardingCompleted
        },
        completionRate: tenant.setupCompletionRate,
        variant: tenant.onboardingVariant,
        nextPhase: this.determineNextPhase(tenant.onboardingPhases)
      };

    } catch (error) {
      console.error('❌ Failed to get onboarding status:', error);
      throw error;
    }
  }

  // Helper methods
  static calculateCompletionRate(phases) {
    if (!phases) return 0;

    const phaseKeys = Object.keys(phases);
    if (phaseKeys.length === 0) return 0;

    const completedPhases = phaseKeys.filter(phase => phases[phase]?.completed).length;
    return Math.round((completedPhases / phaseKeys.length) * 100);
  }

  static calculateAverageTime(events) {
    const timeEvents = events.filter(e => e.timeSpent && e.timeSpent > 0);
    if (timeEvents.length === 0) return 0;

    const totalTime = timeEvents.reduce((sum, e) => sum + e.timeSpent, 0);
    return Math.round(totalTime / timeEvents.length);
  }

  static calculateAbandonmentRate(events) {
    const startedEvents = events.filter(e => e.eventAction === 'started').length;
    const abandonedEvents = events.filter(e => e.eventAction === 'abandoned').length;

    if (startedEvents === 0) return 0;
    return Math.round((abandonedEvents / startedEvents) * 100);
  }

  static determineNextPhase(phases) {
    const phaseOrder = ['trial', 'profile', 'upgrade', 'team', 'integration'];

    for (const phase of phaseOrder) {
      if (!phases[phase] || (!phases[phase].completed && !phases[phase].skipped)) {
        return phase;
      }
    }

    return 'completed';
  }
}
