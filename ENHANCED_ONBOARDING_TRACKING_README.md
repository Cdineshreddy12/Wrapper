# Enhanced Onboarding Tracking System

## Overview
This document describes the comprehensive onboarding tracking system implemented for future scalability and analytics. The system differentiates between multiple onboarding phases and provides detailed tracking for user journey analytics, A/B testing, and performance monitoring.

## Architecture

### Database Schema Enhancements

#### Enhanced Tenants Table
```sql
-- Phase-specific onboarding tracking
trialOnboardingCompleted: boolean
trialOnboardingCompletedAt: timestamp
upgradeOnboardingCompleted: boolean
upgradeOnboardingCompletedAt: timestamp
profileOnboardingCompleted: boolean
profileOnboardingCompletedAt: timestamp

-- Flexible onboarding phases tracking
onboardingPhases: jsonb -- {
  trial: { completed: boolean, completedAt: string, skipped: boolean },
  profile: { completed: boolean, completedAt: string, skipped: boolean },
  upgrade: { completed: boolean, completedAt: string, skipped: boolean },
  team: { completed: boolean, completedAt: string, skipped: boolean },
  integration: { completed: boolean, completedAt: string, skipped: boolean }
}

-- User journey analytics
userJourney: jsonb -- Array of journey events
onboardingVariant: varchar -- For A/B testing
```

#### New Onboarding Events Table
```sql
CREATE TABLE onboarding_events (
  eventId: uuid PRIMARY KEY,
  tenantId: uuid REFERENCES tenants(tenantId),

  -- Event classification
  eventType: varchar(100), -- 'trial_onboarding_completed'
  eventPhase: varchar(50), -- 'trial', 'profile', 'upgrade'
  eventAction: varchar(50), -- 'started', 'completed', 'skipped', 'abandoned'

  -- Context tracking
  userId: uuid,
  sessionId: varchar(255),
  ipAddress: varchar(45),
  userAgent: text,

  -- Flexible data storage
  eventData: jsonb,
  metadata: jsonb,

  -- Analytics fields
  timeSpent: integer,
  completionRate: integer,
  stepNumber: integer,
  totalSteps: integer,

  -- A/B testing
  variantId: varchar(50),
  experimentId: varchar(50),

  -- Timestamps
  createdAt: timestamp,
  eventTimestamp: timestamp
);
```

## Onboarding Phases

### 1. Trial Onboarding
- **Trigger**: Initial tenant registration
- **Fields Collected**: `companyName`, `adminEmail`, `adminMobile`, `gstin`
- **Tracking**: `trialOnboardingCompleted`, `trialOnboardingCompletedAt`
- **Events**: `trial_onboarding_completed`

### 2. Profile Onboarding
- **Trigger**: First payment upgrade
- **Fields Collected**: 40+ comprehensive profile fields
- **Tracking**: `profileOnboardingCompleted`, `profileOnboardingCompletedAt`
- **Events**: `profile_onboarding_completed`

### 3. Upgrade Onboarding
- **Trigger**: Subscription creation
- **Fields Collected**: Plan selection, billing info
- **Tracking**: `upgradeOnboardingCompleted`, `upgradeOnboardingCompletedAt`
- **Events**: `upgrade_onboarding_completed`

### 4. Future Phases (Scalable)
- **Team Onboarding**: Team member invites and setup
- **Integration Onboarding**: Third-party integrations setup
- **Advanced Onboarding**: Custom workflows based on business needs

## API Endpoints

### Status and Analytics
```javascript
GET /api/onboarding/analytics/status
GET /api/onboarding/analytics/analytics
GET /api/onboarding/analytics/funnel
GET /api/onboarding/analytics/journey/:tenantId
POST /api/onboarding/analytics/assign-variant
```

### Tracking Integration
```javascript
// Core onboarding completion
await OnboardingTrackingService.trackOnboardingPhase(
  tenantId, 'trial', 'completed', {
    userId, sessionId, ipAddress, userAgent,
    eventData: { selectedPlan, subdomain, hasGstin },
    completionRate: 100
  }
);

// Profile completion during upgrade
await OnboardingTrackingService.trackOnboardingPhase(
  tenantId, 'profile', 'completed', {
    eventData: { fieldsCompleted: 25, hasBillingInfo: true }
  }
);
```

## Analytics Features

### Real-time Metrics
- **Completion Rates**: Per phase and overall
- **Time Spent**: Average time per phase
- **Abandonment Rates**: Drop-off analysis
- **Conversion Funnels**: Phase-to-phase conversion

### User Journey Tracking
```javascript
// User journey array structure
[
  {
    event: 'trial_onboarding_completed',
    timestamp: '2024-01-01T10:00:00Z',
    metadata: { selectedPlan: 'starter' }
  },
  {
    event: 'profile_onboarding_completed',
    timestamp: '2024-01-15T14:30:00Z',
    metadata: { fieldsCompleted: 25 }
  }
]
```

### A/B Testing Support
```javascript
// Variant assignment
await OnboardingTrackingService.assignOnboardingVariant(
  tenantId, 'variant_a', 'experiment_1'
);

// Track with variant context
trackOnboardingPhase(tenantId, 'trial', 'completed', {
  variantId: 'variant_a',
  experimentId: 'experiment_1'
});
```

## Future Scalability

### Adding New Phases
```javascript
// 1. Update onboardingPhases JSON structure
const newPhases = {
  ...existingPhases,
  newPhase: { completed: false, completedAt: null, skipped: false }
};

// 2. Add phase-specific tracking fields
newPhaseOnboardingCompleted: boolean
newPhaseOnboardingCompletedAt: timestamp

// 3. Update tracking service
await OnboardingTrackingService.trackOnboardingPhase(
  tenantId, 'newPhase', 'completed', metadata
);
```

### Custom Analytics
```javascript
// Query custom metrics
const customMetrics = await db
  .select({
    phase: onboardingEvents.eventPhase,
    action: onboardingEvents.eventAction,
    count: sql`count(*)`
  })
  .from(onboardingEvents)
  .where(sql`event_timestamp >= ${startDate}`)
  .groupBy(onboardingEvents.eventPhase, onboardingEvents.eventAction);
```

### Integration with External Tools
- **Analytics Platforms**: Mixpanel, Amplitude, Google Analytics
- **CRM Systems**: Salesforce, HubSpot integration
- **Marketing Automation**: Personalized onboarding emails based on phase completion

## Migration Strategy

### Database Migration
```sql
-- Add new columns to existing tenants table
ALTER TABLE tenants
ADD COLUMN trial_onboarding_completed boolean DEFAULT false,
ADD COLUMN trial_onboarding_completed_at timestamp,
ADD COLUMN upgrade_onboarding_completed boolean DEFAULT false,
ADD COLUMN upgrade_onboarding_completed_at timestamp,
ADD COLUMN profile_onboarding_completed boolean DEFAULT false,
ADD COLUMN profile_onboarding_completed_at timestamp,
ADD COLUMN onboarding_phases jsonb DEFAULT '{
  "trial": {"completed": false, "completedAt": null, "skipped": false},
  "profile": {"completed": false, "completedAt": null, "skipped": false},
  "upgrade": {"completed": false, "completedAt": null, "skipped": false}
}'::jsonb,
ADD COLUMN user_journey jsonb DEFAULT '[]'::jsonb,
ADD COLUMN onboarding_variant varchar(50);

-- Create new onboarding_events table
CREATE TABLE onboarding_events (...);
```

### Backwards Compatibility
- Existing `onboardingCompleted` field remains functional
- New phase-specific fields provide enhanced tracking
- Old and new systems can coexist during transition

## Benefits

### For Product Teams
- **Data-Driven Decisions**: Comprehensive analytics for optimization
- **A/B Testing**: Test different onboarding flows
- **Performance Monitoring**: Identify bottlenecks and drop-off points
- **User Segmentation**: Target users based on onboarding completion

### For Business Teams
- **Conversion Optimization**: Improve trial-to-paid conversion
- **Churn Prevention**: Identify at-risk users early
- **Revenue Attribution**: Track onboarding impact on revenue
- **Customer Success**: Proactive support based on journey stage

### For Engineering Teams
- **Scalable Architecture**: Easy addition of new phases
- **Flexible Schema**: JSONB storage for custom data
- **Performance Optimized**: Efficient queries and indexing
- **Maintainable Code**: Clean service layer abstraction

## Implementation Checklist

- [x] Enhanced database schema with phase tracking
- [x] OnboardingTrackingService implementation
- [x] Integration with core onboarding routes
- [x] Integration with payment upgrade routes
- [x] Analytics API endpoints
- [x] A/B testing support
- [x] Comprehensive test suite
- [x] Documentation and migration guide
- [ ] Frontend analytics integration
- [ ] Admin dashboard for analytics
- [ ] Automated reporting and alerts

## Next Steps

1. **Frontend Integration**: Add client-side tracking
2. **Admin Dashboard**: Build analytics visualization
3. **Automated Reports**: Set up scheduled analytics reports
4. **Alert System**: Configure performance monitoring alerts
5. **A/B Testing Framework**: Implement variant distribution logic

This enhanced tracking system provides a solid foundation for understanding user behavior, optimizing conversion rates, and scaling the onboarding process as the product grows.
