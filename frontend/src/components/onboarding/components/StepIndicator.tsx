import { cn } from '@/lib/utils';
import { StepConfig } from '../config/flowConfigs';

interface StepIndicatorProps {
  stepsConfig: StepConfig[];
  currentStep: number;
  getStepStatus: (stepNumber: number) => 'completed' | 'active' | 'error' | 'upcoming';
  onStepClick?: (stepNumber: number) => void;
  className?: string;
}

export const StepIndicator = ({ stepsConfig, getStepStatus, onStepClick, className }: StepIndicatorProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      {stepsConfig.map((step, index) => {
        const status = getStepStatus(step.number);
        const IconComponent = step.icon;
        const isLastStep = index === stepsConfig.length - 1;
        
        const isClickable = onStepClick && (status === 'completed' || status === 'active' || status === 'error' || status === 'upcoming');
        
        return (
          <div key={step.number} className="relative">
          <div 
            className={cn(
              "flex items-start space-x-4 transition-all duration-200 ease-out",
              isClickable && "cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2"
            )}
            onClick={isClickable ? () => onStepClick(step.number) : undefined}
          >
              {/* Step Circle */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ease-out",
              status === 'completed' 
                    ? 'bg-green-500 text-white' 
                : status === 'active' 
                      ? (step.color === 'green' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white')
                  : status === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-500 border border-gray-300'
                )}>
                  <span className="text-xs">
                {status === 'completed' ? '✓' : status === 'error' ? '!' : step.number}
              </span>
            </div>
                
                {/* Progress line */}
                {!isLastStep && (
                  <div className={cn(
                    "absolute top-8 left-1/2 w-px h-6 -translate-x-1/2",
                    status === 'completed' 
                      ? 'bg-green-300' 
                      : 'bg-gray-200'
                  )} />
                )}
              </div>

              {/* Step Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center space-x-2">
                {IconComponent && step.ui?.showStepNumber !== false && (
                  <IconComponent className="w-4 h-4 text-gray-500" />
                )}
                  <h3 className={cn(
                    "text-sm font-medium",
                  status === 'active' 
                      ? (step.color === 'green' ? 'text-green-700' : 'text-blue-700')
                    : status === 'completed'
                      ? 'text-gray-700'
                        : status === 'error'
                          ? 'text-red-700'
                          : 'text-gray-600'
                  )}>
                  {step.title}
                  </h3>
                {step.isOptional && (
                  <span className="text-xs text-gray-500">(Optional)</span>
                )}
              </div>
              {step.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{step.subtitle}</p>
              )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
