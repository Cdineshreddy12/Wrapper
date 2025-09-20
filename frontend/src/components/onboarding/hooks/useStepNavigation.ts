import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig, canGoBackFromStep, canSkipStep, getStepByNumber } from '../config/flowConfigs';

export const useStepNavigation = (
  form: UseFormReturn<newBusinessData | existingBusinessData>, 
  stepsConfig: StepConfig[]
) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { formState } = form;
  const [, forceUpdate] = useState({});

  // Force re-render when form state changes
  useEffect(() => {
    const subscription = form.watch(() => {
      forceUpdate({});
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Helper function to check if step fields have errors
  const hasStepErrors = (step: StepConfig): boolean => {
    const { errors } = formState;
    
    // Type-safe error checking for common fields
    const hasCommonFieldError = (fieldName: keyof typeof errors) => {
      return !!errors[fieldName];
    };
    
    // Type-safe error checking for existing business fields
    const hasExistingBusinessFieldError = (fieldName: string) => {
      return !!(errors as any)[fieldName];
    };
    
    switch (step.key) {
      case 'companyType':
        return hasCommonFieldError('companyType');
      case 'state':
        return hasCommonFieldError('state');
      case 'businessDetails':
        return !!(errors.businessDetails?.companyName || errors.businessDetails?.businessType);
      case 'team':
        // Team step is optional, only show errors if there are invalid team members
        const team = form.getValues('team');
        if (!Array.isArray(team) || team.length === 0) return false; // Empty team is valid
        // Check if any team member has validation errors
        return team.some(member => 
          !member.name?.trim() || 
          !member.role?.trim() || 
          !member.email?.trim() || 
          !member.email?.includes('@')
        );
      case 'personalDetails':
        return !!(errors.personalDetails?.firstName || errors.personalDetails?.lastName || 
                 errors.personalDetails?.email || errors.personalDetails?.phone || 
                 errors.personalDetails?.address);
      case 'gstin':
        return hasExistingBusinessFieldError('gstin');
      case 'taxDetails':
        return hasExistingBusinessFieldError('gstin') || 
               hasExistingBusinessFieldError('taxDetails') || 
               hasExistingBusinessFieldError('billingAddress');
      case 'adminDetails':
        return hasExistingBusinessFieldError('adminEmail') || 
               hasExistingBusinessFieldError('adminMobile') || 
               hasExistingBusinessFieldError('website');
      case 'incorporationState':
        return hasExistingBusinessFieldError('incorporationState');
      default:
        return false;
    }
  };

  // Helper function to check if step has valid data (not just no errors)
  const hasStepValidData = (step: StepConfig): boolean => {
    const values = form.getValues();
    
    switch (step.key) {
      case 'companyType':
        return !!(values.companyType && values.companyType.trim() !== '');
      case 'state':
        return !!(values.state && values.state.trim() !== '');
      case 'businessDetails':
        return !!(values.businessDetails?.companyName?.trim() && values.businessDetails?.businessType?.trim());
      case 'team':
        // Team step is optional, so it's always valid (empty or with members)
        return true;
      case 'personalDetails':
        return !!(values.personalDetails?.firstName?.trim() && 
                 values.personalDetails?.lastName?.trim() && 
                 values.personalDetails?.email?.trim() && 
                 values.personalDetails?.phone?.trim() && 
                 values.personalDetails?.address?.trim());
      case 'gstin':
        return !!(values as any).gstin && (values as any).gstin.trim() !== '';
      case 'taxDetails':
        return !!((values as any).gstin?.trim() && 
                 (values as any).taxDetails?.trim() && 
                 (values as any).billingAddress?.trim());
      case 'adminDetails':
        return !!((values as any).adminEmail?.trim() && 
                 (values as any).adminMobile?.trim() && 
                 (values as any).website?.trim());
      case 'incorporationState':
        return !!(values as any).incorporationState && (values as any).incorporationState.trim() !== '';
      default:
        return false;
    }
  };

  const validateCurrentStep = async () => {
    const currentStepConfig = getStepByNumber(stepsConfig, currentStep);
    
    if (!currentStepConfig) return false;
    
    // For onSubmit mode, only check if step has valid data
    // Don't check for errors since they won't show until submit
    return hasStepValidData(currentStepConfig);
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    
    if (currentStep < stepsConfig.length && isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    const currentStepConfig = getStepByNumber(stepsConfig, currentStep);
    
    if (currentStep > 1 && canGoBackFromStep(currentStepConfig!)) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepNumber: number) => {
    // Allow navigation to any step within bounds
    if (stepNumber >= 1 && stepNumber <= stepsConfig.length) {
      // Only allow navigation to previous steps or current step without validation
      // For future steps, require validation
      if (stepNumber <= currentStep) {
        setCurrentStep(stepNumber);
      } else {
        // For future steps, check if current step is valid first
        const currentStepConfig = getStepByNumber(stepsConfig, currentStep);
        if (currentStepConfig && hasStepValidData(currentStepConfig)) {
          setCurrentStep(stepNumber);
        }
      }
    }
  };

  const canProceed = () => {
    const currentStepConfig = getStepByNumber(stepsConfig, currentStep);
    
    if (!currentStepConfig) return false;
    
    // For onSubmit mode, only check if step has valid data
    return hasStepValidData(currentStepConfig);
  };

  const canSubmit = () => {
    // Check if all required steps have valid data
    const requiredSteps = stepsConfig.filter(step => step.validation?.required !== false);
    
    return requiredSteps.every(step => {
      const hasValidData = hasStepValidData(step);
      const hasErrors = hasStepErrors(step);
      return hasValidData && !hasErrors;
    });
  };

  const getStepStatus = (stepNumber: number) => {
    const step = getStepByNumber(stepsConfig, stepNumber);
    
    if (!step) return 'upcoming';
    
    // Check if step has valid data
    const hasValidData = hasStepValidData(step);
    
    if (stepNumber < currentStep) {
      // For previous steps, show completed only if it has valid data
      if (hasValidData) return 'completed';
      return 'upcoming'; // If no valid data, show as upcoming (not completed)
    } else if (stepNumber === currentStep) {
      // For current step, show active
      return 'active';
    } else {
      return 'upcoming';
    }
  };

  return {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    goToStep,
    canProceed,
    canSubmit,
    getStepStatus,
    validateCurrentStep,
    // Additional helper methods
    getCurrentStepConfig: () => getStepByNumber(stepsConfig, currentStep),
    canGoBack: () => {
      const currentStepConfig = getStepByNumber(stepsConfig, currentStep);
      return currentStep > 1 && canGoBackFromStep(currentStepConfig!);
    },
    canSkip: () => {
      const currentStepConfig = getStepByNumber(stepsConfig, currentStep);
      return canSkipStep(currentStepConfig!);
    },
    isLastStep: () => currentStep === stepsConfig.length,
    isFirstStep: () => currentStep === 1
  };
};
