import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, X, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MotionDiv } from "@/components/ui/motion"

interface Step {
  number: number
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  isOptional?: boolean
  color?: 'primary' | 'success' | 'warning' | 'destructive'
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepNumber: number) => void
  className?: string
  variant?: 'default' | 'compact' | 'vertical'
  showConnectors?: boolean
  animated?: boolean
}

type StepStatus = 'completed' | 'active' | 'error' | 'upcoming' | 'disabled'

const getStepStatus = (stepNumber: number, currentStep: number): StepStatus => {
  if (stepNumber < currentStep) return 'completed'
  if (stepNumber === currentStep) return 'active'
  if (stepNumber > currentStep) return 'upcoming'
  return 'disabled'
}

const getStepIcon = (status: StepStatus, step: Step) => {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4" />
    case 'error':
      return <X className="h-4 w-4" />
    case 'active':
      return step.icon ? <step.icon className="h-4 w-4" /> : null
    default:
      return step.icon ? <step.icon className="h-4 w-4" /> : null
  }
}

const getStepNumber = (status: StepStatus, step: Step) => {
  if (status === 'completed' || status === 'error') return null
  return (
    <span className="text-xs font-semibold">
      {step.number}
    </span>
  )
}

const StepIndicator = React.forwardRef<HTMLDivElement, StepIndicatorProps>(
  ({ 
    steps, 
    currentStep, 
    onStepClick, 
    className,
    variant = 'default',
    showConnectors = true,
    animated = true
  }, ref) => {
    const isVertical = variant === 'vertical'
    const isCompact = variant === 'compact'

    const StepContent = ({ step, index }: { step: Step; index: number }) => {
      const status = getStepStatus(step.number, currentStep)
      const isLastStep = index === steps.length - 1
      const isClickable = onStepClick && status !== 'disabled'

      const stepContent = (
        <div className={cn(
          "flex items-start space-x-4 transition-all duration-200",
          isClickable && "cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2",
          isVertical && "flex-col space-x-0 space-y-3",
          isCompact && "space-x-3"
        )}>
          {/* Step Circle */}
          <div className={cn(
            "relative flex-shrink-0",
            isVertical && "self-center"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
              status === 'completed' && "bg-primary text-primary-foreground",
              status === 'active' && "bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-sm",
              status === 'error' && "bg-destructive text-destructive-foreground",
              status === 'upcoming' && "bg-muted text-muted-foreground border border-border",
              status === 'disabled' && "bg-muted/50 text-muted-foreground/50 border border-border/50",
              isCompact && "w-6 h-6 text-xs"
            )}>
              {getStepIcon(status, step)}
              {getStepNumber(status, step)}
            </div>
            
            {/* Progress line */}
            {showConnectors && !isLastStep && (
              <div className={cn(
                "absolute transition-colors duration-200",
                isVertical 
                  ? "top-8 left-1/2 w-px h-6 -translate-x-1/2"
                  : "top-1/2 left-8 w-6 h-px -translate-y-1/2",
                status === 'completed' ? "bg-primary/30" : "bg-border"
              )} />
            )}
          </div>

          {/* Step Content */}
          <div className={cn(
            "flex-1 min-w-0",
            isVertical ? "text-center" : "pt-1",
            isCompact && "pt-0"
          )}>
            <div className={cn(
              "flex items-center space-x-2",
              isVertical && "flex-col space-x-0 space-y-1",
              isCompact && "space-x-1"
            )}>
              {!isVertical && step.icon && status !== 'active' && (
                <step.icon className="h-4 w-4 text-muted-foreground" />
              )}
              
              <h3 className={cn(
                "text-sm font-medium transition-colors",
                status === 'active' && "text-primary",
                status === 'completed' && "text-foreground",
                status === 'error' && "text-destructive",
                status === 'upcoming' && "text-muted-foreground",
                status === 'disabled' && "text-muted-foreground/50",
                isCompact && "text-xs",
                isVertical && "text-center"
              )}>
                {step.title}
              </h3>
              
              {step.isOptional && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    isCompact && "text-[10px] px-1.5 py-0.5"
                  )}
                >
                  Optional
                </Badge>
              )}
            </div>
            
            {step.description && !isCompact && (
              <p className={cn(
                "text-xs text-muted-foreground mt-1",
                isVertical && "text-center"
              )}>
                {step.description}
              </p>
            )}
          </div>
        </div>
      )

      if (animated && status === 'active') {
        return (
          <MotionDiv
            key={step.number}
            variant="slideUp"
            delay={index * 0.1}
            className="w-full"
          >
            {stepContent}
          </MotionDiv>
        )
      }

      return stepContent
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full",
          isVertical ? "space-y-6" : "space-y-6",
          isCompact && "space-y-4",
          className
        )}
      >
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            {onStepClick && getStepStatus(step.number, currentStep) !== 'disabled' ? (
              <button
                onClick={() => onStepClick(step.number)}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 rounded-lg"
                aria-label={`Go to step ${step.number}: ${step.title}`}
              >
                <StepContent step={step} index={index} />
              </button>
            ) : (
              <StepContent step={step} index={index} />
            )}
          </div>
        ))}
      </div>
    )
  }
)
StepIndicator.displayName = "StepIndicator"

export { StepIndicator, type Step, type StepStatus }
