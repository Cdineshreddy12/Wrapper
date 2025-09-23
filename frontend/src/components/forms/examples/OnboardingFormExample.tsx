import React from 'react';
import { MultiStepForm } from '../MultiStepForm';
import { onboardingFormConfig } from './onboardingConfig';
import { CompleteOnboardingData } from './validationSchemas';
import { toast } from 'sonner';

/**
 * Example usage of the MultiStepForm component
 * This demonstrates a 3-step onboarding form
 */
export const OnboardingFormExample: React.FC = () => {
  const handleSubmit = async (values: CompleteOnboardingData) => {
    try {
      // Simulate API call
      console.log('Form submitted with values:', values);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      toast.success('Welcome! Your account has been created successfully.');
      
      // Here you would typically:
      // 1. Send data to your API
      // 2. Redirect to dashboard
      // 3. Update user state
      // 4. Show success message
      
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <MultiStepForm
          config={onboardingFormConfig}
          onSubmit={handleSubmit}
          debug={true} // Set to true to see debug information
        />
      </div>
    </div>
  );
};

/**
 * Example with custom styling and components
 */
export const CustomStyledOnboardingForm: React.FC = () => {
  const handleSubmit = async (values: CompleteOnboardingData) => {
    console.log('Custom form submitted:', values);
    toast.success('Custom form submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Join Our Platform
            </h1>
            <p className="text-lg text-gray-600">
              Create your account in just a few simple steps
            </p>
          </div>
          
          <MultiStepForm
            config={onboardingFormConfig}
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Example with custom field components
 */
export const CustomFieldComponentsExample: React.FC = () => {
  const handleSubmit = async (values: CompleteOnboardingData) => {
    console.log('Custom field components form submitted:', values);
    toast.success('Form with custom components submitted!');
  };

  // You can override specific field components here
  const customFieldComponents = {
    // Example: Override the text field with a custom component
    // text: CustomTextField,
    // email: CustomEmailField,
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <MultiStepForm
          config={onboardingFormConfig}
          onSubmit={handleSubmit}
          fieldComponents={customFieldComponents}
          debug={true}
        />
      </div>
    </div>
  );
};
