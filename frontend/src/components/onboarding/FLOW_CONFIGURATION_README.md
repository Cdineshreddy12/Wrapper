# Onboarding Flow Configuration System

This document explains how to use the new flow-based onboarding system that allows for separate step configurations for different business flows.

## Overview

The onboarding system now supports multiple flows with different step configurations:

- **New Business Flow**: For creating a new company from scratch
- **Existing Business Flow**: For onboarding an existing business with additional compliance details

## Key Components

### 1. Flow Configuration (`config/flowConfigs.ts`)

Defines step configurations for each flow:

```typescript
import { newBusinessSteps, existingBusinessSteps, getFlowConfig } from './config/flowConfigs';

// Get configuration for a specific flow
const flowConfig = getFlowConfig('newBusiness');
console.log(flowConfig.steps); // Array of step configurations
```

### 2. Flow Selector (`components/FlowSelector.tsx`)

Allows users to choose between available flows:

```typescript
import { FlowSelector } from './components/FlowSelector';

<FlowSelector
  onFlowSelect={(flowId) => console.log('Selected:', flowId)}
  selectedFlow="newBusiness" // Optional
/>
```

### 3. Multi-Step Form (`components/MultiStepForm.tsx`)

Reusable form component that accepts step configuration:

```typescript
import { MultiStepForm } from './components/MultiStepForm';

<MultiStepForm
  form={form}
  stepsConfig={stepsConfig}
  onSubmit={(data) => console.log('Submitted:', data)}
/>
```

### 4. Complete Onboarding Form (`OnboardingForm.tsx`)

Main component that combines flow selection and multi-step form:

```typescript
import { OnboardingForm } from './OnboardingForm';

// This handles everything: flow selection + form
<OnboardingForm />
```

## Usage Examples

### Example 1: Complete Onboarding with Flow Selection

```typescript
import { OnboardingForm } from './OnboardingForm';

function App() {
  return <OnboardingForm />;
}
```

This will:
1. Show flow selection screen first
2. After flow selection, show the appropriate multi-step form
3. Handle form submission with flow context

### Example 2: Direct Multi-Step Form Usage

```typescript
import { MultiStepForm } from './components/MultiStepForm';
import { useOnboardingForm } from './hooks';
import { newBusinessSteps } from './config/flowConfigs';

function NewBusinessForm() {
  const form = useOnboardingForm('newBusiness');
  
  const handleSubmit = (data) => {
    console.log('New business data:', data);
  };

  return (
    <MultiStepForm
      form={form}
      stepsConfig={newBusinessSteps}
      onSubmit={handleSubmit}
    />
  );
}
```

### Example 3: Custom Step Configuration

```typescript
import { MultiStepForm } from './components/MultiStepForm';
import { existingBusinessSteps } from './config/flowConfigs';

function CustomForm() {
  const form = useOnboardingForm('existingBusiness');
  
  // Customize step configuration
  const customSteps = existingBusinessSteps.map(step => ({
    ...step,
    color: 'purple',
    title: step.title.replace('DETAILS', 'INFO')
  }));

  return (
    <MultiStepForm
      form={form}
      stepsConfig={customSteps}
      onSubmit={(data) => console.log(data)}
    />
  );
}
```

### Example 4: Programmatic Flow Switching

```typescript
import { useState } from 'react';
import { MultiStepForm } from './components/MultiStepForm';
import { getFlowConfig } from './config/flowConfigs';

function DynamicForm() {
  const [currentFlow, setCurrentFlow] = useState('newBusiness');
  const form = useOnboardingForm(currentFlow);
  const flowConfig = getFlowConfig(currentFlow);

  const switchFlow = () => {
    setCurrentFlow(currentFlow === 'newBusiness' ? 'existingBusiness' : 'newBusiness');
  };

  return (
    <div>
      <button onClick={switchFlow}>
        Switch to {currentFlow === 'newBusiness' ? 'Existing Business' : 'New Business'}
      </button>
      
      {flowConfig && (
        <MultiStepForm
          form={form}
          stepsConfig={flowConfig.steps}
          onSubmit={(data) => console.log(data)}
        />
      )}
    </div>
  );
}
```

## Step Configuration Structure

Each step configuration includes:

```typescript
interface StepConfig {
  id: string;                    // Unique identifier
  number: number;                // Step number
  title: string;                 // Display title
  subtitle?: string;             // Optional subtitle
  description?: string;          // Optional description
  key: string;                   // Form field key
  icon?: React.ComponentType;    // Optional icon component
  color?: string;                // Theme color
  isOptional?: boolean;          // Whether step is optional
  validation?: {                 // Validation rules
    required?: boolean;
    customValidator?: (values: any) => boolean;
  };
  navigation?: {                 // Navigation rules
    canSkip?: boolean;
    canGoBack?: boolean;
    nextStepCondition?: (values: any) => boolean;
  };
  ui?: {                        // UI configuration
    showProgress?: boolean;
    showStepNumber?: boolean;
    className?: string;
  };
}
```

## Flow Configuration Structure

```typescript
interface FlowConfig {
  id: 'newBusiness' | 'existingBusiness';
  title: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  steps: StepConfig[];
}
```

## Available Flows

### New Business Flow
- **Steps**: 6 steps
- **Color**: Blue
- **Steps**: Company Type → State → Business Details → Team → Personal Details → Review

### Existing Business Flow
- **Steps**: 8 steps
- **Color**: Green
- **Steps**: Company Type → State → Business Details → Tax Details → Team → Admin Details → Personal Details → Review

## Hooks

### `useStepNavigation(form, stepsConfig)`

Enhanced hook that works with dynamic step configurations:

```typescript
const {
  currentStep,
  nextStep,
  prevStep,
  canProceed,
  getStepStatus,
  getCurrentStepConfig,
  canGoBack,
  canSkip,
  isLastStep,
  isFirstStep
} = useStepNavigation(form, stepsConfig);
```

### `useOnboardingForm(flowType)`

Creates form instance for specific flow type:

```typescript
const form = useOnboardingForm('newBusiness'); // or 'existingBusiness'
```

## Benefits

1. **Flexibility**: Easy to add new flows or modify existing ones
2. **Reusability**: Components can be used independently
3. **Maintainability**: Clear separation of concerns
4. **Extensibility**: Simple to add new step types or validation rules
5. **Type Safety**: Full TypeScript support with proper typing

## Migration from Old System

The old hardcoded system is still supported for backward compatibility, but the new flow-based system provides:

- Better organization
- More flexibility
- Easier testing
- Better user experience with flow selection

## Testing

Use the provided examples in `examples/OnboardingUsageExample.tsx` to test different configurations and flows.
