import React from 'react';
import { OnboardingForm } from '../OnboardingForm';
import { MultiStepForm, FlowSelector } from '../components';
import { useOnboardingForm } from '../hooks';
import { getFlowConfig, newBusinessSteps, existingBusinessSteps } from '../config/flowConfigs';
import { newBusinessData, existingBusinessData } from '../schemas';

// Example 1: Using the complete OnboardingForm with flow selection
export const CompleteOnboardingExample = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Complete Onboarding with Flow Selection</h2>
      <OnboardingForm />
    </div>
  );
};

// Example 2: Using MultiStepForm directly with a specific flow
export const DirectMultiStepExample = () => {
  const form = useOnboardingForm('newBusiness');
  const stepsConfig = newBusinessSteps;

  const handleSubmit = (data: newBusinessData) => {
    console.log('New business form submitted:', data);
    alert('New business form submitted!');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Direct MultiStepForm - New Business</h2>
      <MultiStepForm
        form={form}
        stepsConfig={stepsConfig}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

// Example 3: Using FlowSelector only
export const FlowSelectorExample = () => {
  const handleFlowSelect = (flowId: 'newBusiness' | 'existingBusiness') => {
    console.log('Selected flow:', flowId);
    alert(`You selected: ${flowId}`);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Flow Selector Only</h2>
      <FlowSelector
        onFlowSelect={handleFlowSelect}
      />
    </div>
  );
};

// Example 4: Custom flow configuration
export const CustomFlowExample = () => {
  const form = useOnboardingForm('existingBusiness');
  
  // Custom steps configuration
  const customSteps = existingBusinessSteps.map((step, index) => ({
    ...step,
    number: index + 1,
    color: 'purple', // Custom color
    title: step.title.replace('DETAILS', 'INFO'), // Custom title
  }));

  const handleSubmit = (data: existingBusinessData) => {
    console.log('Custom flow form submitted:', data);
    alert('Custom flow form submitted!');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Custom Flow Configuration</h2>
      <MultiStepForm
        form={form}
        stepsConfig={customSteps}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

// Example 5: Programmatic flow switching
export const ProgrammaticFlowExample = () => {
  const [currentFlow, setCurrentFlow] = React.useState<'newBusiness' | 'existingBusiness'>('newBusiness');
  const form = useOnboardingForm(currentFlow);
  const flowConfig = getFlowConfig(currentFlow);

  const handleSubmit = (data: newBusinessData | existingBusinessData) => {
    console.log('Form submitted for flow:', currentFlow, data);
    alert(`Form submitted for ${currentFlow} flow!`);
  };

  const switchFlow = () => {
    setCurrentFlow(currentFlow === 'newBusiness' ? 'existingBusiness' : 'newBusiness');
  };

  if (!flowConfig) return <div>Error: Flow configuration not found</div>;

  return (
    <div>
      <div className="mb-4 flex items-center space-x-4">
        <h2 className="text-2xl font-bold">Programmatic Flow Switching</h2>
        <button
          onClick={switchFlow}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Switch to {currentFlow === 'newBusiness' ? 'Existing Business' : 'New Business'}
        </button>
      </div>
      
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <p><strong>Current Flow:</strong> {flowConfig.title}</p>
        <p><strong>Steps:</strong> {flowConfig.steps.length}</p>
        <p><strong>Color:</strong> {flowConfig.color}</p>
      </div>

      <MultiStepForm
        form={form}
        stepsConfig={flowConfig.steps}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

// Main example component that shows all examples
export const OnboardingUsageExample = () => {
  const [activeExample, setActiveExample] = React.useState('complete');

  const examples = [
    { id: 'complete', title: 'Complete Onboarding', component: CompleteOnboardingExample },
    { id: 'direct', title: 'Direct MultiStepForm', component: DirectMultiStepExample },
    { id: 'selector', title: 'Flow Selector Only', component: FlowSelectorExample },
    { id: 'custom', title: 'Custom Flow Config', component: CustomFlowExample },
    { id: 'programmatic', title: 'Programmatic Switching', component: ProgrammaticFlowExample },
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || CompleteOnboardingExample;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Onboarding System Usage Examples</h1>
      
      <div className="mb-8">
        <div className="flex space-x-2 flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeExample === example.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {example.title}
            </button>
          ))}
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <ActiveComponent />
      </div>
    </div>
  );
};
