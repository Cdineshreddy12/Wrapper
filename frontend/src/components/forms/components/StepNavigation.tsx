import React from 'react';
import { Button } from '@/components/ui/button';
import { StepNavigationProps } from '../types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/**
 * Enhanced step navigation component matching reference design
 */
export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  isCurrentStepValid,
  isSubmitting,
  allowBack,
  onNext,
  onPrev,
  onSubmit,
  className
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Back button */}
      <div>
        {!isFirstStep && allowBack && (
          <button
            type="button"
            onClick={onPrev}
            disabled={isSubmitting}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            PREVIOUS STEP
          </button>
        )}
      </div>

      {/* Next/Submit button */}
      <div>
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!isCurrentStepValid || isSubmitting}
            className={cn(
              'bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-sm transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center space-x-2'
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!isCurrentStepValid || isSubmitting}
            className={cn(
              'bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-sm transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center space-x-2'
            )}
          >
            <span>NEXT</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
