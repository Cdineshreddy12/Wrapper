# Onboarding Feature

Multi-step onboarding flow that guides new users through organization setup, business details, tax verification, and initial configuration.

## Directory Structure

```
onboarding/
├── index.ts                        # Standard exports
├── indexOptimized.ts               # Optimized (lazy-loaded) exports
├── config/
│   ├── index.ts
│   ├── flowConfigs.ts              # Step flow definitions per onboarding type
│   └── countryConfig.ts            # Country/region-specific configuration
├── schemas/
│   ├── index.ts
│   └── onboardingValidation.ts     # Zod validation schemas and shared types
├── hooks/
│   ├── index.ts
│   ├── useFormPersistence.ts       # Persist form data across sessions
│   ├── useFormPersistenceOptimized.ts
│   └── useRateLimit.ts             # Rate-limit form submissions
├── utils/
│   ├── secureStorage.ts            # Encrypted localStorage wrapper
│   ├── testSecureStorage.ts        # Storage testing utility
│   ├── sanitization.ts             # Input sanitization
│   ├── securityValidations.ts      # Security-focused validations
│   ├── onboardingLogger.ts         # Onboarding-specific logging
│   └── validationHelpers.ts        # Shared validation helpers
├── pages/
│   ├── Onboarding.tsx              # Standard onboarding entry page
│   └── OnboardingOptimized.tsx     # Performance-optimized entry page
└── components/
    ├── OnboardingForm.tsx           # Standard form orchestrator
    ├── OnboardingFormOptimized.tsx   # Optimized form orchestrator
    ├── OnboardingLayout.tsx         # Page layout wrapper
    ├── OnboardingLayoutOptimized.tsx
    ├── MultiStepForm.tsx            # Multi-step form state machine
    ├── MultiStepFormOptimized.tsx
    ├── FlowSelector.tsx             # Onboarding flow type selector
    ├── FlowHeader.tsx               # Flow header with progress info
    ├── StepIndicator.tsx            # Step progress indicator
    ├── StepRenderer.tsx             # Renders the correct step component
    ├── NavigationButtons.tsx        # Back/Next/Submit buttons
    ├── OnboardingGuard.tsx          # Route guard (redirect if already onboarded)
    ├── OnboardingPageGuard.tsx      # Page-level guard
    ├── OnboardingTour.tsx           # Interactive onboarding tour
    ├── OnboardingWelcomeSuccess.tsx  # Success/welcome screen
    ├── SuccessMessage.tsx           # Completion message
    ├── ErrorBoundary.tsx            # Onboarding-specific error boundary
    ├── Toast.tsx                    # Custom toast component
    ├── LoadingSpinner.tsx           # Onboarding loading spinner
    └── steps/
        ├── BusinessDetailsStep.tsx       # Company name, type, industry
        ├── TaxDetailsStep.tsx            # PAN/GSTIN verification
        ├── AdminDetailsStep.tsx          # Admin contact details
        ├── ReviewStep.tsx                # Review all entered data
        ├── CompanyTypeStep.tsx           # Company type selection
        ├── PersonalDetailsStep.tsx       # Personal info
        ├── TeamStep.tsx                  # Team size and invitations
        ├── PreferencesStep.tsx           # App preferences
        ├── StateStep.tsx                 # State/region selection
        ├── OrganizationHierarchyStep.tsx # Org structure setup
        ├── CreditPackagesStep.tsx        # Initial credit package selection
        └── SettingsOverviewStep.tsx      # Settings review
```

## Onboarding Flow

1. **Flow selection** — Choose onboarding type (business, individual, etc.)
2. **Step-by-step form** — Dynamic steps based on selected flow (configured in `flowConfigs.ts`)
3. **Verification** — PAN/GSTIN verification for Indian businesses
4. **Credit packages** — Select initial credit package
5. **Review & submit** — Review all data and submit
6. **Welcome** — Success screen with next steps

Form data is persisted to encrypted localStorage between sessions via `useFormPersistence`.

## Key APIs

| Action | Endpoint |
|--------|----------|
| Submit onboarding | `POST /onboarding/onboard-frontend` |
| Check status | `GET /onboarding/status` |
| Verify PAN | `POST /onboarding/verify-pan` |
| Verify GSTIN | `POST /onboarding/verify-gstin` |
| Credit packages | `GET /credits/packages` |
| Update step | `POST /onboarding/update-step` |
| Mark complete | `POST /onboarding/mark-complete` |

## Dependencies

- `react-hook-form` — Form state management
- `zod` — Schema validation (via `onboardingValidation.ts`)
- `@tanstack/react-query` — API queries and mutations
- `framer-motion` — Step transition animations
- `@/lib/api` — `onboardingAPI`, `creditAPI`
- `sonner` — Toast notifications
