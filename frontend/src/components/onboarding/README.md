# Onboarding Component - Composition Pattern

This directory contains a refactored onboarding component using React composition pattern for better maintainability, reusability, and testability.

## Structure

```
onboarding/
├── schemas.ts                    # Zod schemas and type definitions
├── hooks/                        # Custom hooks for business logic
│   ├── useOnboardingForm.ts     # Form management hook
│   ├── useStepNavigation.ts     # Step navigation logic
│   └── useTeamManagement.ts     # Team member management
├── components/                   # Shared UI components
│   ├── OnboardingHeader.tsx     # Header component
│   ├── StepIndicator.tsx        # Step progress indicator
│   ├── NavigationButtons.tsx    # Navigation controls
│   ├── StepRenderer.tsx         # Step content renderer
│   ├── OnboardingLayout.tsx     # Main layout component
│   └── index.ts                 # Component exports
├── steps/                       # Individual step components
│   ├── CompanyTypeStep.tsx      # Step 1: Company type selection
│   ├── StateStep.tsx            # Step 2: State selection
│   ├── BusinessDetailsStep.tsx  # Step 3: Business information
│   ├── TeamStep.tsx             # Step 4: Team members
│   ├── PersonalDetailsStep.tsx  # Step 5: Personal information
│   └── index.ts                 # Step exports
├── OnboardingForm.tsx           # Main composition component
└── index.tsx                    # Public API exports
```

## Key Benefits

### 1. **Separation of Concerns**
- **Schemas**: Centralized validation logic and type definitions
- **Hooks**: Reusable business logic separated from UI
- **Components**: Pure UI components with clear responsibilities
- **Steps**: Individual step implementations

### 2. **Reusability**
- Hooks can be reused across different onboarding flows
- Step components can be used independently
- Shared components can be used in other parts of the application

### 3. **Testability**
- Each component can be tested in isolation
- Hooks can be tested independently
- Business logic is separated from UI logic

### 4. **Maintainability**
- Clear file structure makes it easy to find and modify code
- Single responsibility principle applied throughout
- Easy to add new steps or modify existing ones

## Usage

```tsx
import { OnboardingForm } from '@/components/onboarding';

function App() {
  return <OnboardingForm />;
}
```

## Customization

### Adding a New Step

1. Create a new step component in `steps/`
2. Add the step to `STEPS` array in `schemas.ts`
3. Update `StepRenderer` to handle the new step
4. Add validation logic to `useStepNavigation` hook

### Modifying Form Logic

- Update schemas in `schemas.ts`
- Modify form logic in `useOnboardingForm.ts`
- Update validation in `useStepNavigation.ts`

### Styling Changes

- Modify individual step components for step-specific styling
- Update shared components for global styling changes
- All components maintain the same visual design

## Architecture Principles

1. **Composition over Inheritance**: Components are composed together rather than inherited
2. **Single Responsibility**: Each file has one clear purpose
3. **Dependency Injection**: Props are passed down to child components
4. **Separation of Concerns**: Business logic, UI logic, and data are separated
5. **Type Safety**: Full TypeScript support with inferred types from Zod schemas

This refactored structure makes the onboarding component much more maintainable and follows React best practices for component composition.
