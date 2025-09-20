import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepConfig } from '../config/flowConfigs';
import { cn } from '@/lib/utils';

interface NavigationButtonsProps {
  currentStep: number;
  stepsConfig: StepConfig[];
  canProceed: () => boolean;
  canSubmit: () => boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export const NavigationButtons = ({ 
  currentStep, 
  stepsConfig,
  canProceed, 
  canSubmit,
  onPrev, 
  onNext,
  className
}: NavigationButtonsProps) => {
  const isLastStep = currentStep === stepsConfig.length;
  const isFirstStep = currentStep === 1;
  const canProceedValue = canProceed();
  const canSubmitValue = canSubmit();

  return (
    <div 
      className={cn(
        "flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 min-h-[80px] p-4 sm:p-0",
        className
      )}
      role="navigation"
      aria-label="Form navigation"
    >
      <Button
        type="button"
        onClick={onPrev}
        disabled={isFirstStep}
        variant="outline"
        aria-label={isFirstStep ? "Cannot go back" : "Go to previous step"}
        className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ease-out w-full sm:w-auto ${
          isFirstStep
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
        }`}
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-200 ease-out" />
        <span>Back</span>
      </Button>

      <div 
        className="text-sm text-gray-500 order-first sm:order-none"
        aria-live="polite"
        aria-label={`Step ${currentStep} of ${stepsConfig.length}`}
      >
        Step {currentStep} of {stepsConfig.length}
      </div>

      {isLastStep ? (
        <Button
          type="submit"
          disabled={!canSubmitValue}
          aria-label={canSubmitValue ? "Submit form" : "Complete all required fields to submit"}
          className={`flex items-center space-x-2 px-6 sm:px-8 py-3 rounded-lg font-medium text-sm transition-all duration-200 ease-out w-full sm:w-auto ${
            canSubmitValue
              ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-sm'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span>Submit</span>
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceedValue}
          aria-label={canProceedValue ? "Continue to next step" : "Complete current step to continue"}
          className={`flex items-center space-x-2 px-6 sm:px-8 py-3 rounded-lg font-medium text-sm transition-all duration-200 ease-out w-full sm:w-auto ${
            canProceedValue
              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-sm'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
