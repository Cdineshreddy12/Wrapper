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
          <Button
            type="button"
            onClick={onPrev}
            disabled={isSubmitting}
            variant="ghost"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>PREVIOUS</span>
          </Button>
        )}
      </div>

      {/* Next/Submit button */}
      <div>
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!isCurrentStepValid || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!isCurrentStepValid || isSubmitting}
          >
            <span>NEXT</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
