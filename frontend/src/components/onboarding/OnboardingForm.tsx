import { useState, useCallback } from 'react';
import { useOnboardingForm } from './hooks';
import { FlowSelector } from './components/FlowSelector';
import { FlowHeader } from './components/FlowHeader';
import { MultiStepForm } from './components/MultiStepForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SuccessMessage } from './components/SuccessMessage';
import { useToast } from './components/Toast';
import { useFormPersistence } from './hooks/useFormPersistence';
import { useRateLimit } from './hooks/useRateLimit';
import { sanitizeFormData } from './utils/sanitization';
import { existingBusinessData, newBusinessData } from './schemas';
import { getFlowConfig } from './config/flowConfigs';

export const OnboardingForm = () => {
  const [selectedFlow, setSelectedFlow] = useState<'newBusiness' | 'existingBusiness' | null>(null);
  const [isFlowSelected, setIsFlowSelected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useOnboardingForm(selectedFlow || 'newBusiness');
  const { addToast } = useToast();
  const { isRateLimited, recordAttempt, getTimeUntilReset } = useRateLimit({
    maxAttempts: 3,
    windowMs: 60000 // 1 minute
  });
  
  const flowConfig = selectedFlow ? getFlowConfig(selectedFlow) : null;

  // Form persistence
  const { clearFormData, hasPersistedData } = useFormPersistence(
    form, 
    selectedFlow || 'newBusiness', 
    currentStep
  );

  const handleFlowSelect = useCallback((flowId: 'newBusiness' | 'existingBusiness') => {
    setSelectedFlow(flowId);
    setIsFlowSelected(true);
    setCurrentStep(1);
    setIsSubmitted(false); // Reset success state
    form.reset(); // Reset form when changing flows
  }, [form]);

  const handleSubmit = useCallback(async (data: newBusinessData | existingBusinessData) => {
    // Check rate limiting
    if (isRateLimited()) {
      const remainingTime = Math.ceil(getTimeUntilReset() / 1000);
      addToast({
        type: 'error',
        title: 'Too Many Attempts',
        description: `Please wait ${remainingTime} seconds before trying again.`,
        duration: 5000
      });
      return;
    }

    setIsSubmitting(true);
    recordAttempt();
    
    try {
      // Sanitize form data before submission
      const sanitizedData = sanitizeFormData(data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear persisted data on successful submission
      clearFormData();
      
      // Set success state to show success message
      setIsSubmitted(true);
      
      addToast({
        type: 'success',
        title: 'Company Created Successfully!',
        description: `Your ${selectedFlow} company has been created and is ready to use.`,
        duration: 5000
      });

      console.log('Form submitted:', sanitizedData);
      console.log('Selected flow:', selectedFlow);
      
    } catch (error) {
      console.error('Submission error:', error);
      addToast({
        type: 'error',
        title: 'Submission Failed',
        description: 'There was an error submitting your form. Please try again.',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(data)
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFlow, addToast, clearFormData, form, setIsSubmitting, isRateLimited, recordAttempt, getTimeUntilReset]);

  const handleBackToFlowSelection = useCallback(() => {
    setIsFlowSelected(false);
    setSelectedFlow(null);
    setCurrentStep(1);
    form.reset();
  }, [form, setIsFlowSelected, setSelectedFlow, setCurrentStep]);

  const handleError = useCallback((error: Error, errorInfo: any) => {
    console.error('Onboarding Error:', error, errorInfo);
    addToast({
      type: 'error',
      title: 'Application Error',
      description: 'An unexpected error occurred. Please refresh the page and try again.',
      duration: 10000
    });
  }, [addToast]);

  // Show success message after company creation
  if (isSubmitted) {
    return (
      <SuccessMessage />
    );
  }

  if (!isFlowSelected) {
    return (
      <ErrorBoundary onError={handleError}>
        <FlowSelector
          onFlowSelect={handleFlowSelect}
          selectedFlow={selectedFlow || undefined}
        />
        {hasPersistedData && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              You have unsaved progress. Your form data will be restored when you select a flow.
            </p>
          </div>
        )}
      </ErrorBoundary>
    );
  }

  if (!flowConfig) {
    return (
      <ErrorBoundary onError={handleError}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Configuration Error</h2>
            <p className="text-gray-600 mb-4">Flow configuration not found</p>
            <button
              onClick={handleBackToFlowSelection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Flow Selection
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text="Submitting your form..." 
          className="text-center"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <div className="relative">
        <FlowHeader
          flowConfig={flowConfig}
          onBackToFlowSelection={handleBackToFlowSelection}
        />

        <MultiStepForm
          form={form}
          stepsConfig={flowConfig.steps}
          onSubmit={handleSubmit}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
        />
      </div>
    </ErrorBoundary>
  );
};
