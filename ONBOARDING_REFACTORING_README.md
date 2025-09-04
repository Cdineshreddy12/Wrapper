# Onboarding Flow Refactoring Plan

## Overview

This document outlines the comprehensive refactoring plan to transform the current multi-step onboarding flow into an integrated onboarding system that happens only once during the first payment upgrade from free trial. The new system will integrate organization creation directly into the Kinde login flow, similar to how Zoho and Salesforce handle user onboarding.

## Current State vs. Target State

### Current State
- **Organization Creation** → **Immediate Onboarding** → **Trial Start**
- Multi-step onboarding process (company info, plan selection, team invites)
- Onboarding completion required before trial access
- Complex onboarding state tracking and progress management

### Target State
- **Kinde Login** → **Organization Creation** → **Immediate Trial** → **Onboarding During First Payment**
- Single integrated flow during login
- Trial starts immediately after organization creation
- Onboarding completed only when user upgrades from trial

## Architecture Changes

### Database Schema Updates
- New fields to track integrated onboarding flow
- Onboarding completion tracking by trigger type
- Integrated onboarding session management

### Service Layer Refactoring
- New integrated onboarding service
- Refactored subscription service
- New integrated authentication service

### API Route Updates
- New integrated onboarding endpoints
- Refactored existing onboarding routes
- Updated authentication flow

### Frontend Component Changes
- Simplified landing page flow
- New onboarding components
- Updated state management

## Implementation Phases

### Phase 1: Foundation & Database Schema Updates (Week 1-2)

#### Database Schema Refactoring
```sql
-- Add new fields to track the new flow
ALTER TABLE tenants ADD COLUMN onboarding_triggered_at timestamp;
ALTER TABLE tenants ADD COLUMN onboarding_triggered_by varchar(50); -- 'trial_start' or 'first_payment'
ALTER TABLE tenants ADD COLUMN onboarding_flow_type varchar(50); -- 'legacy' or 'integrated'
ALTER TABLE tenants ADD COLUMN first_payment_onboarding_completed boolean DEFAULT false;

-- Add new fields to subscriptions table
ALTER TABLE subscriptions ADD COLUMN onboarding_completed_during_upgrade boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN upgrade_onboarding_data jsonb;
```

#### New Database Tables
```sql
-- Table to track onboarding completion by trigger type
CREATE TABLE onboarding_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id),
  user_id uuid REFERENCES tenant_users(user_id),
  completion_type varchar(50) NOT NULL, -- 'legacy_onboarding' or 'upgrade_onboarding'
  completed_at timestamp DEFAULT NOW(),
  completion_data jsonb,
  created_at timestamp DEFAULT NOW()
);

-- Table to track the new integrated flow
CREATE TABLE integrated_onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id),
  kinde_org_id varchar(255),
  session_status varchar(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at timestamp DEFAULT NOW(),
  completed_at timestamp,
  failure_reason text
);
```

### Phase 2: Backend Service Layer Refactoring (Week 2-3)

#### New Onboarding Service
Create `backend/src/services/integrated-onboarding-service.js`:
```javascript
export class IntegratedOnboardingService {
  // Handle organization creation during Kinde login
  static async createOrganizationDuringLogin(kindeUser, kindeOrg) {
    // Create tenant with minimal data
    // Start trial immediately
    // Mark onboarding as pending
  }
  
  // Handle onboarding completion during first payment
  static async completeOnboardingDuringUpgrade(tenantId, paymentData, onboardingData) {
    // Complete onboarding steps
    // Update tenant with full information
    // Mark onboarding as completed
  }
  
  // Check if user needs onboarding
  static async needsOnboarding(tenantId) {
    // Check if onboarding was completed during upgrade
    // Return appropriate onboarding state
  }
}
```

#### Refactor Subscription Service
Update `backend/src/services/subscription-service.js`:
```javascript
// Modify createTrialSubscription to not require onboarding completion
static async createTrialSubscription(tenantId, planData = {}) {
  // Remove onboarding dependency
  // Start trial immediately after organization creation
}

// Add new method for handling first payment onboarding
static async handleFirstPaymentOnboarding(tenantId, paymentData) {
  // Trigger onboarding completion
  // Update subscription with onboarding data
}
```

#### New Auth Flow Service
Create `backend/src/services/integrated-auth-service.js`:
```javascript
export class IntegratedAuthService {
  // Handle Kinde login with organization creation
  static async handleKindeLogin(kindeUser, kindeOrg) {
    // Create or find organization
    // Start trial immediately
    // Return onboarding status
  }
  
  // Handle organization switching
  static async switchOrganization(userId, orgCode) {
    // Switch user to different organization
    // Check onboarding status for new org
  }
}
```

### Phase 3: API Routes Refactoring (Week 3-4)

#### New Integrated Routes
Create `backend/src/routes/integrated-onboarding.js`:
```javascript
export default async function integratedOnboardingRoutes(fastify, options) {
  // POST /api/integrated-onboarding/complete
  // Complete onboarding during first payment
  
  // GET /api/integrated-onboarding/status
  // Get current onboarding status
  
  // POST /api/integrated-onboarding/update
  // Update onboarding progress
}
```

#### Refactor Existing Onboarding Routes
Update `backend/src/routes/onboarding.js`:
```javascript
// Add compatibility layer
// Mark routes as deprecated
// Add redirects to new integrated flow
```

#### Update Auth Routes
Modify `backend/src/routes/auth.js`:
```javascript
// Integrate organization creation into login flow
// Handle Kinde webhooks for organization creation
// Manage onboarding state transitions
```

### Phase 4: Frontend Component Refactoring (Week 4-5)

#### New Landing Page Flow
Update `frontend/src/pages/Landing.tsx`:
```typescript
// Replace dual-path approach with single "Get Started" flow
// Integrate Kinde login directly
// Remove onboarding choice complexity
```

#### New Onboarding Components
Create `frontend/src/components/integrated-onboarding/`:
```typescript
// OnboardingModal.tsx - Modal for completing onboarding during upgrade
// OnboardingProgress.tsx - Progress indicator for new flow
// OnboardingForm.tsx - Unified form for all onboarding data
```

#### Refactor Existing Onboarding Components
Update existing components in `frontend/src/components/onboarding/`:
```typescript
// Mark as deprecated
// Add compatibility wrappers
// Gradually remove unused code
```

### Phase 5: State Management & Hooks Refactoring (Week 5-6)

#### New Onboarding Hook
Create `frontend/src/hooks/useIntegratedOnboarding.ts`:
```typescript
export function useIntegratedOnboarding() {
  // Track onboarding state
  // Handle onboarding completion
  // Manage onboarding data
}
```

#### Update Existing Hooks
Modify `frontend/src/hooks/useOrganizationAuth.ts`:
```typescript
// Add onboarding status checking
// Integrate with new onboarding flow
// Maintain backward compatibility
```

#### New Store for Onboarding State
Create `frontend/src/stores/onboardingStore.ts`:
```typescript
// Centralized onboarding state management
// Handle onboarding data persistence
// Manage onboarding flow transitions
```

### Phase 6: Payment Integration & Onboarding Trigger (Week 6-7)

#### Update Billing Component
Modify `frontend/src/pages/Billing.tsx`:
```typescript
// Add onboarding completion during first payment
// Integrate onboarding forms with payment flow
// Handle onboarding state transitions
```

#### Payment Webhook Updates
Update `backend/src/services/subscription-service.js`:
```javascript
// Detect first payment
// Trigger onboarding completion
// Update subscription and tenant records
```

#### Onboarding Completion Flow
Create onboarding completion workflow:
```javascript
// Collect all required onboarding data
// Update tenant and subscription records
// Mark onboarding as permanently completed
```

### Phase 7: Migration & Compatibility Layer (Week 7-8)

#### Data Migration Scripts
Create migration scripts:
```javascript
// Migrate existing onboarding data
// Update legacy records
// Ensure data consistency
```

#### Backward Compatibility
Implement compatibility layer:
```javascript
// Handle legacy onboarding requests
// Redirect to new flow
// Maintain API compatibility
```

#### Feature Flags
Implement feature flags:
```javascript
// Enable/disable new flow
// A/B testing capability
// Gradual rollout support
```

### Phase 8: Testing & Validation (Week 8-9)

#### Unit Tests
```javascript
// Test new services
// Test updated components
// Test migration scripts
```

#### Integration Tests
```javascript
// Test complete user flows
// Test payment integration
// Test data consistency
```

#### User Acceptance Testing
```javascript
// Test new user experience
// Test existing user migration
// Test edge cases
```

### Phase 9: Deployment & Rollout (Week 9-10)

#### Staged Rollout
```javascript
// Deploy to staging
// Test with internal users
// Gradual production rollout
```

#### Monitoring & Analytics
```javascript
// Track onboarding completion rates
// Monitor user experience metrics
// Alert on failures
```

#### Rollback Plan
```javascript
// Feature flag rollback
// Database rollback procedures
// Service rollback procedures
```

## User Experience Changes

### New User Flow
1. **Landing Page**: Single "Get Started" button
2. **Kinde Login**: Authenticate and create organization
3. **Immediate Access**: Start using the platform with trial features
4. **First Payment**: Complete onboarding during upgrade process
5. **Full Access**: Unlock all features after onboarding completion

### Existing User Impact
- Users who completed legacy onboarding: No change
- Users with incomplete onboarding: Redirected to new flow
- Trial users: Can complete onboarding during first payment

## Technical Benefits

### Performance Improvements
- Faster time-to-value for new users
- Reduced initial page load complexity
- Streamlined authentication flow

### Code Maintainability
- Simplified onboarding logic
- Centralized onboarding state management
- Reduced component complexity

### User Experience
- Industry-standard onboarding flow
- Reduced friction for new users
- Better trial-to-paid conversion potential

## Risk Mitigation

### Data Integrity
- Comprehensive migration scripts
- Data validation at each step
- Rollback procedures for failed migrations

### User Experience
- Feature flags for gradual rollout
- A/B testing before full deployment
- Comprehensive user acceptance testing

### System Stability
- Backward compatibility layer
- Comprehensive testing at each phase
- Real-time monitoring during rollout

## Success Metrics

### User Experience Metrics
- Time to first value (TTFV)
- Trial-to-paid conversion rate
- Onboarding completion rate
- User satisfaction scores

### Technical Metrics
- API response times
- Error rates
- System uptime
- Performance benchmarks

### Business Metrics
- User acquisition rate
- Customer lifetime value
- Churn rate reduction
- Support ticket volume

## Rollback Procedures

### Feature Flag Rollback
```javascript
// Disable new onboarding flow
FEATURE_FLAGS.INTEGRATED_ONBOARDING = false;

// Re-enable legacy onboarding
FEATURE_FLAGS.LEGACY_ONBOARDING = true;
```

### Database Rollback
```sql
-- Restore original schema
ALTER TABLE tenants DROP COLUMN onboarding_triggered_at;
ALTER TABLE tenants DROP COLUMN onboarding_triggered_by;
-- ... additional rollback statements
```

### Service Rollback
```javascript
// Restore original service implementations
// Revert to legacy onboarding flow
// Maintain data consistency
```

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1 | Week 1-2 | Database schema updates, new tables |
| 2 | Week 2-3 | Backend service layer refactoring |
| 3 | Week 3-4 | API routes refactoring |
| 4 | Week 4-5 | Frontend component refactoring |
| 5 | Week 5-6 | State management and hooks refactoring |
| 6 | Week 6-7 | Payment integration and onboarding trigger |
| 7 | Week 7-8 | Migration and compatibility layer |
| 8 | Week 8-9 | Testing and validation |
| 9 | Week 9-10 | Deployment and rollout |

## Dependencies

### External Dependencies
- Kinde authentication service
- Stripe payment processing
- Database migration tools

### Internal Dependencies
- Existing onboarding system
- Current authentication flow
- Payment processing system

### Team Dependencies
- Frontend developers (React/TypeScript)
- Backend developers (Node.js/Fastify)
- DevOps engineers (deployment)
- QA engineers (testing)
- Product managers (user experience)

## Communication Plan

### Stakeholder Updates
- Weekly progress reports
- Phase completion notifications
- Risk and issue escalation
- Success metric updates

### Team Communication
- Daily standups during active development
- Weekly technical reviews
- Code review sessions
- Knowledge sharing sessions

### User Communication
- Feature announcement blog post
- In-app notifications
- Email communications
- Support documentation updates

## Conclusion

This refactoring plan represents a significant architectural change that will modernize the onboarding experience and align it with industry best practices. The phased approach ensures minimal risk while delivering maximum value to users and the business.

The new integrated onboarding flow will provide:
- Faster time-to-value for new users
- Improved user experience and satisfaction
- Better trial-to-paid conversion rates
- Reduced system complexity and maintenance overhead

Success depends on careful execution of each phase, comprehensive testing, and effective communication with all stakeholders. The investment in this refactoring will pay dividends in improved user experience and business metrics.
