import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useMemo, ReactNode } from "react";
import { useForm, UseFormReturn, FieldValues, Path, DefaultValues } from "react-hook-form";
import { z } from "zod";
import OnboardingFlowLayout from "../layout/OnboardingFlowLayout";
import { Form } from "../ui";
import { NavigationFooter } from "./NavigationFooter";
import { VerticalStepIndicator } from "./VerticalStepIndicator";
import { HorizontalStepIndicator } from "./HorizontalStepIndicator";
import { ProgressIndicator } from "./ProgressIndicator";

/**
 * Configuration for form validation behavior
 */
export interface ValidationConfig {
  /** Whether to validate fields when changing steps */
  validateOnStepChange?: boolean;
  /** Whether to validate fields on blur */
  validateOnBlur?: boolean;
  /** Whether to validate all fields on form submission */
  validateOnSubmit?: boolean;
  /** Whether to stop validation on first error */
  stopOnFirstError?: boolean;
  /** Custom validation function */
  customValidator?: (data: any, stepIndex: number) => Promise<boolean> | boolean;
}

/**
 * Configuration for navigation behavior
 */
export interface NavigationConfig {
  /** Whether to allow navigation to previous steps */
  allowBackNavigation?: boolean;
  /** Whether to allow navigation to future steps */
  allowForwardNavigation?: boolean;
  /** Whether to allow jumping to any step */
  allowStepJumping?: boolean;
  /** Whether to allow skipping steps */
  allowSkipping?: boolean;
  /** Whether to require step completion before navigation */
  requireStepCompletion?: boolean;
  /** Custom navigation rules function */
  customNavigationRules?: (fromStep: number, toStep: number) => boolean;
}

/**
 * Configuration for UI display options
 */
export interface UIConfig {
  /** Whether to show progress indicator */
  showProgress?: boolean;
  /** Whether to show step numbers */
  showStepNumbers?: boolean;
  /** Whether to show step titles */
  showStepTitles?: boolean;
  /** Whether to show step descriptions */
  showStepDescriptions?: boolean;
  /** Whether to show step icons */
  showStepIcons?: boolean;
  /** Whether to show navigation buttons */
  showNavigationButtons?: boolean;
  /** Whether to show skip button */
  showSkipButton?: boolean;
  /** Whether to show reset button */
  showResetButton?: boolean;
  /** Style of progress bar: linear, circular, or steps */
  progressBarStyle?: "linear" | "circular" | "steps";
  /** Style of step indicator: numbers, dots, or custom */
  stepIndicatorStyle?: "numbers" | "dots" | "custom";
  /** Orientation of step indicator: vertical or horizontal */
  stepIndicatorOrientation?: "vertical" | "horizontal";
  /** Theme variant: default, minimal, card, or wizard */
  theme?: "default" | "minimal" | "card" | "wizard";
}

/**
 * Configuration for form reset behavior
 */
export interface ResetConfig {
  /** Whether reset functionality is enabled */
  enabled?: boolean;
  /** Whether to show reset button */
  showButton?: boolean;
  /** Whether to require confirmation before reset */
  requireConfirmation?: boolean;
  /** Custom confirmation message */
  confirmationMessage?: string;
  /** Whether to allow reset on first step */
  allowResetOnFirstStep?: boolean;
  /** Whether to allow reset on last step */
  allowResetOnLastStep?: boolean;
  /** Additional reset conditions */
  resetConditions?: {
    /** Minimum number of steps that must be completed */
    minStepsCompleted?: number;
    /** Maximum number of steps that can be completed */
    maxStepsCompleted?: number;
    /** Whether to allow reset after form submission */
    allowResetAfterSubmission?: boolean;
  };
}

/**
 * Configuration for layout options
 */
export interface LayoutConfig {
  /** Layout type: default, custom, or none */
  type?: "default" | "custom" | "none";
  /** Whether to show sidebar */
  sidebar?: boolean;
  /** Width of the sidebar */
  sidebarWidth?: string;
  /** Padding for content area */
  contentPadding?: string;
  /** Height of the header */
  headerHeight?: string;
  /** Custom layout component */
  customLayout?: React.ComponentType<{
    sidebar: React.ReactNode;
    children: React.ReactNode;
  }>;
}

/**
 * Main configuration object for MultiStepForm
 */
export interface MultiStepFormConfig {
  /** Form title */
  title?: string;
  /** Form description */
  description?: string;
  /** Submit button text */
  submitButtonText?: string;
  /** Next button text */
  nextButtonText?: string;
  /** Back button text */
  backButtonText?: string;
  /** Skip button text */
  skipButtonText?: string;
  /** Reset button text */
  resetButtonText?: string;
  /** Support text */
  supportText?: string;
  /** Validation configuration */
  validation?: ValidationConfig;
  /** Navigation configuration */
  navigation?: NavigationConfig;
  /** UI configuration */
  ui?: UIConfig;
  /** Reset configuration */
  reset?: ResetConfig;
  /** Layout configuration */
  layout?: LayoutConfig;
}

/**
 * Represents a single step in the multi-step form
 */
export interface Step<TFormData extends FieldValues = FieldValues> {
  id: string | number;
  title: string;
  subtitle?: string;
  hint?: string;
  description?: string;
  validation?: z.ZodSchema<TFormData>;
  isOptional?: boolean;
  isDisabled?: boolean;
  icon?: ReactNode;
  metadata?: Record<string, any>;
}

/**
 * Props passed to each step component
 */
export interface StepComponentProps<TFormData extends FieldValues = FieldValues> {
  form: UseFormReturn<TFormData>;
  step: Step<TFormData>;
  stepIndex: number;
  isActive: boolean;
  isCompleted: boolean;
  isVisited: boolean;
  hasErrors: boolean;
  canNavigate: boolean;
  canReset?: boolean;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  onReset?: () => void;
}


/**
 * Props for the MultiStepForm component
 */
export interface MultiStepFormProps<TFormData extends FieldValues = FieldValues> {
  steps: Step<TFormData>[];
  schema: z.ZodSchema<TFormData>;
  defaultValues: DefaultValues<TFormData>;
  getFieldsForStep: (stepIndex: number) => (keyof TFormData)[];
  renderStep: (props: StepComponentProps<TFormData>) => ReactNode;
  onSubmit: (data: TFormData) => void | Promise<void>;
  onStepChange?: (stepIndex: number, direction: "forward" | "backward" | "jump") => void;
  onValidationError?: (stepIndex: number, errors: Record<string, any>) => void;
  onStepComplete?: (stepIndex: number, data: Partial<TFormData>) => void;
  onStepSkip?: (stepIndex: number) => void;
  onFormReset?: () => void;
  config?: MultiStepFormConfig;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
  supportAction?: () => void;
  customHeader?: ReactNode;
  customFooter?: ReactNode;
  isLoading?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
}

// Enhanced hook for managing step state with more features
/**
 * Custom hook for managing multi-step form state
 * 
 * @param totalSteps - Total number of steps in the form
 * @param config - Configuration options for the hook
 * @param config.initialStep - Initial step index (default: 0)
 * @param config.persistState - Whether to persist state to localStorage (default: false)
 * @param config.storageKey - Key for localStorage storage (default: "multistep-form")
 * @returns Object containing step management functions and state
 * 
 * @example
 * ```tsx
 * const {
 *   currentIndex,
 *   goNext,
 *   goBack,
 *   isStepCompleted,
 *   markStepCompleted
 * } = useMultiStepForm(5, {
 *   persistState: true,
 *   storageKey: "my-form"
 * });
 * ```
 */
export const useMultiStepForm = <TFormData extends FieldValues = FieldValues>(
  totalSteps: number,
  config?: {
    initialStep?: number;
    persistState?: boolean;
    storageKey?: string;
  }
) => {
  const { initialStep = 0, persistState = false, storageKey = "multistep-form" } = config || {};
  
  const [currentIndex, setCurrentIndex] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([initialStep]));
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [stepData, setStepData] = useState<Map<number, Partial<TFormData>>>(new Map());

  // Persist state to localStorage if enabled
  const saveState = useCallback(() => {
    if (persistState) {
      const state = {
        currentIndex,
        completedSteps: Array.from(completedSteps),
        visitedSteps: Array.from(visitedSteps),
        skippedSteps: Array.from(skippedSteps),
        stepData: Object.fromEntries(stepData),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [currentIndex, completedSteps, visitedSteps, skippedSteps, stepData, persistState, storageKey]);

  const loadState = useCallback(() => {
    if (persistState) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const state = JSON.parse(saved);
          setCurrentIndex(state.currentIndex || 0);
          setCompletedSteps(new Set(state.completedSteps || []));
          setVisitedSteps(new Set(state.visitedSteps || [0]));
          setSkippedSteps(new Set(state.skippedSteps || []));
          setStepData(new Map(Object.entries(state.stepData || {}).map(([k, v]) => [Number(k), v as Partial<TFormData>])));
        }
      } catch (error) {
        console.warn("Failed to load form state:", error);
      }
    }
  }, [persistState, storageKey]);

  // Load state on mount
  useState(() => {
    loadState();
  });

  // Save state when it changes
  useState(() => {
    saveState();
  });

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < totalSteps) {
        setCurrentIndex(stepIndex);
        setVisitedSteps((prev) => new Set(prev).add(stepIndex));
      }
    },
    [totalSteps]
  );

  const goNext = useCallback(() => {
    if (currentIndex < totalSteps - 1) {
      const nextStep = currentIndex + 1;
      setCurrentIndex(nextStep);
      setVisitedSteps((prev) => new Set(prev).add(nextStep));
    }
  }, [currentIndex, totalSteps]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const skipStep = useCallback((stepIndex: number) => {
    setSkippedSteps((prev) => new Set(prev).add(stepIndex));
    if (stepIndex === currentIndex) {
      goNext();
    }
  }, [currentIndex, goNext]);

  const markStepCompleted = useCallback((stepIndex: number, data?: Partial<TFormData>) => {
    setCompletedSteps((prev) => new Set(prev).add(stepIndex));
    if (data) {
      setStepData((prev) => new Map(prev).set(stepIndex, data));
    }
  }, []);

  const markStepIncomplete = useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepIndex);
      return newSet;
    });
    setStepData((prev) => {
      const newMap = new Map(prev);
      newMap.delete(stepIndex);
      return newMap;
    });
  }, []);

  const isStepCompleted = useCallback(
    (stepIndex: number) => {
      return completedSteps.has(stepIndex);
    },
    [completedSteps]
  );

  const isStepVisited = useCallback(
    (stepIndex: number) => {
      return visitedSteps.has(stepIndex);
    },
    [visitedSteps]
  );

  const isStepSkipped = useCallback(
    (stepIndex: number) => {
      return skippedSteps.has(stepIndex);
    },
    [skippedSteps]
  );

  const getStepData = useCallback(
    (stepIndex: number) => {
      return stepData.get(stepIndex);
    },
    [stepData]
  );

  const resetForm = useCallback(() => {
    setCurrentIndex(0);
    setCompletedSteps(new Set());
    setVisitedSteps(new Set([0]));
    setSkippedSteps(new Set());
    setStepData(new Map());
    if (persistState) {
      localStorage.removeItem(storageKey);
    }
  }, [persistState, storageKey]);

  const progress = useMemo(() => {
    return Math.round((currentIndex / Math.max(totalSteps - 1, 1)) * 100);
  }, [currentIndex, totalSteps]);

  const completionProgress = useMemo(() => {
    return Math.round((completedSteps.size / totalSteps) * 100);
  }, [completedSteps.size, totalSteps]);

  return {
    currentIndex,
    completedSteps,
    visitedSteps,
    skippedSteps,
    stepData,
    goToStep,
    goNext,
    goBack,
    skipStep,
    markStepCompleted,
    markStepIncomplete,
    isStepCompleted,
    isStepVisited,
    isStepSkipped,
    getStepData,
    resetForm,
    progress,
    completionProgress,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === totalSteps - 1,
    remainingSteps: totalSteps - currentIndex - 1,
    totalSteps,
  };
};



/**
 * MultiStepForm - A highly configurable multi-step form component
 * 
 * This component provides a complete multi-step form solution with:
 * - Step-by-step navigation with validation
 * - Progress tracking and indicators
 * - Configurable themes and layouts
 * - Form state persistence
 * - Custom validation and navigation rules
 * - Reset functionality
 * 
 * @param props - The component props
 * @returns JSX element representing the multi-step form
 * 
 * @example
 * ```tsx
 * <MultiStepForm
 *   steps={steps}
 *   schema={formSchema}
 *   defaultValues={defaultValues}
 *   getFieldsForStep={(stepIndex) => getFieldsForStep(stepIndex)}
 *   renderStep={(props) => <MyStepComponent {...props} />}
 *   onSubmit={handleSubmit}
 *   config={{
 *     title: "Complete Your Profile",
 *     ui: { theme: "wizard", progressBarStyle: "circular" },
 *     validation: { validateOnStepChange: true },
 *     navigation: { allowStepJumping: true }
 *   }}
 * />
 * ```
 */
export const MultiStepForm = <TFormData extends FieldValues = FieldValues>({
  steps,
  schema,
  defaultValues,
  getFieldsForStep,
  renderStep,
  onSubmit,
  onStepChange,
  onValidationError,
  onStepComplete,
  onStepSkip,
  onFormReset,
  config = {},
  className,
  sidebarClassName,
  contentClassName,
  supportAction,
  customHeader,
  customFooter,
  isSubmitting = false,
}: MultiStepFormProps<TFormData>) => {
  const {
    title,
    description = "Complete the form in steps",
    submitButtonText = "Submit",
    nextButtonText = "Continue",
    backButtonText = "Back",
    skipButtonText = "Skip",
    resetButtonText = "Reset",
    supportText = "Need help? Contact support",
    validation = {},
    navigation = {},
    ui = {},
    reset = {},
    layout = {},
  } = config;

  const {
    validateOnStepChange = true,
    validateOnBlur = false,
    validateOnSubmit = true,
    customValidator,
  } = validation;

  const {
    allowBackNavigation = true,
    allowStepJumping = true,
    allowSkipping = false,
    customNavigationRules,
  } = navigation;

  const {
    showProgress = true,
    showStepTitles = true,
    showStepDescriptions = true,
    showStepIcons = true,
    showNavigationButtons = true,
    showSkipButton = false,
    showResetButton = true,
    stepIndicatorStyle = "numbers",
    stepIndicatorOrientation = "vertical",
    theme = "default",
  } = ui;

  const {
    enabled = true,
    showButton = true,
    requireConfirmation = false,
    confirmationMessage = "Are you sure you want to reset the form? All your progress will be lost.",
    allowResetOnFirstStep = true,
    allowResetOnLastStep = true,
    resetConditions = {},
  } = reset;

  const {
    minStepsCompleted = 0,
    maxStepsCompleted = Infinity,
    allowResetAfterSubmission = false,
  } = resetConditions;

  const {
    type = "default",
    sidebar = true,
    customLayout,
  } = layout;

  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const stepManager = useMultiStepForm<TFormData>(steps.length, {
    persistState: true,
    storageKey: `multistep-form-${title || "default"}`,
  });

  const {
    currentIndex,
    completedSteps,
    visitedSteps,
    skippedSteps,
    goToStep,
    goNext,
    goBack,
    skipStep,
    markStepCompleted,
    markStepIncomplete,
    isStepCompleted,
    isStepVisited,
    resetForm: resetStepManager,
    isFirstStep,
    isLastStep,
  } = stepManager;

  const form = useForm<TFormData>({
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: validateOnBlur ? "onBlur" : "onChange",
  });

  const hasStepErrors = useCallback(
    (stepIndex: number): boolean => {
      const fieldsToCheck = getFieldsForStep(stepIndex);
      const errors = form.formState.errors;
      return fieldsToCheck.some((field) => errors[field as Path<TFormData>]);
    },
    [form.formState.errors, getFieldsForStep]
  );

  const validateStep = useCallback(
    async (stepIndex: number): Promise<boolean> => {
      const fieldsToValidate = getFieldsForStep(stepIndex) as Path<TFormData>[];
      const result = await form.trigger(fieldsToValidate);

      if (!result && onValidationError) {
        const stepErrors = fieldsToValidate.reduce((acc, field) => {
          if (form.formState.errors[field]) {
            acc[field as string] = form.formState.errors[field];
          }
          return acc;
        }, {} as Record<string, any>);
        onValidationError(stepIndex, stepErrors);
      }

      // Custom validation
      if (result && customValidator) {
        const formData = form.getValues();
        const customResult = await customValidator(formData, stepIndex);
        if (!customResult) {
          onValidationError?.(stepIndex, { custom: "Custom validation failed" });
          return false;
        }
      }

      return result;
    },
    [form, getFieldsForStep, onValidationError, customValidator]
  );

  const handleNext = useCallback(async () => {
    if (isLastStep) return;

    const isValid = validateOnStepChange ? await validateStep(currentIndex) : true;

    if (isValid) {
      const stepData = form.getValues();
      markStepCompleted(currentIndex, stepData);
      onStepComplete?.(currentIndex, stepData);
      goNext();
      onStepChange?.(currentIndex + 1, "forward");
    } else {
      markStepIncomplete(currentIndex);
    }
  }, [
    currentIndex,
    isLastStep,
    validateOnStepChange,
    validateStep,
    markStepCompleted,
    markStepIncomplete,
    goNext,
    onStepChange,
    onStepComplete,
    form,
  ]);

  const handleBack = useCallback(() => {
    if (!isFirstStep && allowBackNavigation) {
      goBack();
      onStepChange?.(currentIndex - 1, "backward");
    }
  }, [isFirstStep, allowBackNavigation, goBack, currentIndex, onStepChange]);

  const handleSkip = useCallback(() => {
    if (allowSkipping && !steps[currentIndex].isOptional) {
      skipStep(currentIndex);
      onStepSkip?.(currentIndex);
      onStepChange?.(currentIndex + 1, "forward");
    }
  }, [allowSkipping, currentIndex, skipStep, onStepSkip, onStepChange, steps]);

  const handleStepClick = useCallback(
    async (targetIndex: number) => {
      if (targetIndex === currentIndex) return;

      // Check custom navigation rules
      if (customNavigationRules && !customNavigationRules(currentIndex, targetIndex)) {
        return;
      }

      const canNavigate = allowStepJumping || targetIndex < currentIndex;
      if (!canNavigate) return;

      // If moving forward, validate current step
      if (targetIndex > currentIndex && validateOnStepChange) {
        const isValid = await validateStep(currentIndex);
        if (!isValid) {
          markStepIncomplete(currentIndex);
          return;
        }
        const stepData = form.getValues();
        markStepCompleted(currentIndex, stepData);
        onStepComplete?.(currentIndex, stepData);
      }

      goToStep(targetIndex);
      onStepChange?.(
        targetIndex,
        targetIndex > currentIndex ? "forward" : "backward"
      );
    },
    [
      currentIndex,
      allowStepJumping,
      validateOnStepChange,
      validateStep,
      markStepCompleted,
      markStepIncomplete,
      goToStep,
      onStepChange,
      onStepComplete,
      customNavigationRules,
      form,
    ]
  );

  const handleSubmit = useCallback(
    async (data: TFormData) => {
      // Final validation
      const isValid = validateOnSubmit ? await form.trigger() : true;
      if (!isValid) {
        onValidationError?.(currentIndex, form.formState.errors);
        return;
      }

      try {
        await onSubmit(data);
        setIsFormSubmitted(true);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    },
    [form, currentIndex, onValidationError, onSubmit, validateOnSubmit]
  );

  const handleReset = useCallback(() => {
    // Check if reset is enabled
    if (!enabled) {
      return;
    }

    // Check if confirmation is required
    if (requireConfirmation) {
      const confirmed = window.confirm(confirmationMessage);
      if (!confirmed) {
        return;
      }
    }

    // Reset the form to default values
    form.reset(defaultValues);
    
    // Reset the step manager state
    resetStepManager();
    
    // Reset submission state
    setIsFormSubmitted(false);
    
    // Call the onFormReset callback if provided
    onFormReset?.();
  }, [form, defaultValues, resetStepManager, onFormReset, enabled, requireConfirmation, confirmationMessage]);


  // Determine if reset should be available
  const isResetAvailable = useCallback(() => {
    if (!enabled) return false;
    
    // Check if form has been submitted
    if (isFormSubmitted && !allowResetAfterSubmission) return false;
    
    // Check step position conditions
    if (isFirstStep && !allowResetOnFirstStep) return false;
    if (isLastStep && !allowResetOnLastStep) return false;
    
    // Check completion conditions
    const completedCount = completedSteps.size;
    if (completedCount < minStepsCompleted) return false;
    if (completedCount > maxStepsCompleted) return false;
    
    return true;
  }, [
    enabled,
    isFormSubmitted,
    allowResetAfterSubmission,
    isFirstStep,
    allowResetOnFirstStep,
    isLastStep,
    allowResetOnLastStep,
    completedSteps.size,
    minStepsCompleted,
    maxStepsCompleted,
  ]);

  const currentStep = steps[currentIndex];

  // Create sidebar content
  const sidebarContent = sidebar ? (
    <div className={cn(
      "h-full flex flex-col",
      {
        // Default theme
        "": theme === "default",
        // Minimal theme
        "bg-gradient-to-b from-gray-800 to-gray-900": theme === "minimal",
        // Card theme
        "bg-gradient-to-b from-slate-700 to-slate-800": theme === "card",
        // Wizard theme
        "bg-gradient-to-b from-purple-600 to-indigo-700": theme === "wizard",
      },
      sidebarClassName
    )}>
      <div className={cn(
        "px-8 py-6",
        {
          "px-6 py-4": theme === "minimal",
          "px-6 py-5": theme === "card",
        }
      )}>
        <div className={cn(
          "space-y-6",
          {
            "space-y-4": theme === "minimal",
            "space-y-5": theme === "card",
          }
        )}>
          {customHeader}
          
          {title && (
            <div className="space-y-2">
              <h1 className={cn(
                "font-bold leading-tight",
                {
                  "text-2xl text-white": theme === "default" || theme === "wizard",
                  "text-xl text-gray-100": theme === "minimal",
                  "text-2xl text-slate-100": theme === "card",
                }
              )}>{title}</h1>
              <p className={cn(
                "text-sm leading-relaxed",
                {
                  "text-white/90": theme === "default" || theme === "wizard",
                  "text-gray-300": theme === "minimal",
                  "text-slate-200": theme === "card",
                }
              )}>
                {description}
              </p>
            </div>
          )}

          {showProgress && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  {
                    "text-white/80": theme === "default" || theme === "wizard",
                    "text-gray-300": theme === "minimal",
                    "text-slate-300": theme === "card",
                  }
                )}>
                  Progress
                </div>
                <div className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  {
                    "text-white/70 bg-white/10": theme === "default" || theme === "wizard",
                    "text-gray-200 bg-gray-700/50": theme === "minimal",
                    "text-slate-200 bg-slate-600/50": theme === "card",
                  }
                )}>
                  Step {currentIndex + 1} of {steps.length}
                </div>
              </div>

              <ProgressIndicator
                totalSteps={steps.length}
                storageKey={`progress-${title || "default"}`}
              />
            </div>
          )}
        </div>
      </div>

      {stepIndicatorOrientation === "vertical" && (
        <div className="flex-1 px-4">
          <VerticalStepIndicator
            steps={steps}
            currentIndex={currentIndex}
            completedSteps={completedSteps}
            visitedSteps={visitedSteps}
            skippedSteps={skippedSteps}
            onStepClick={handleStepClick}
            hasStepErrors={hasStepErrors}
            allowNavigation={allowStepJumping || allowBackNavigation}
            style={stepIndicatorStyle}
            showIcons={showStepIcons}
            showTitles={showStepTitles}
            showDescriptions={showStepDescriptions}
            theme={theme}
          />
        </div>
      )}
    </div>
  ) : null;

  // Create horizontal step indicator (when orientation is horizontal)
  const horizontalStepIndicator = stepIndicatorOrientation === "horizontal" ? (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto px-6">
        <HorizontalStepIndicator
          steps={steps}
          currentIndex={currentIndex}
          completedSteps={completedSteps}
          visitedSteps={visitedSteps}
          skippedSteps={skippedSteps}
          onStepClick={handleStepClick}
          hasStepErrors={hasStepErrors}
          allowNavigation={allowStepJumping || allowBackNavigation}
          style={stepIndicatorStyle}
          showIcons={showStepIcons}
          showTitles={showStepTitles}
          showDescriptions={showStepDescriptions}
          theme={theme}
        />
      </div>
    </div>
  ) : null;

  // Create main content
  const mainContent = (
    <div
      className={cn(
        "bg-white p-6 dark:bg-gray-800 h-full             ",
        contentClassName
      )}
    >
      <div className="h-full flex flex-col">
        {/* <StepHeader
          step={currentStep}
          currentIndex={currentIndex}
          totalSteps={steps.length}
          error={error}
        /> */}

        <Form {...form}>
          <div className="flex-1 flex flex-col">
            <section className="flex-1 grid gap-4 mb-6">
              {renderStep({
                form,
                step: currentStep,
                stepIndex: currentIndex,
                isActive: true,
                isCompleted: isStepCompleted(currentIndex),
                isVisited: isStepVisited(currentIndex),
                hasErrors: hasStepErrors(currentIndex),
                canNavigate: allowStepJumping || allowBackNavigation,
                canReset: isResetAvailable(),
                onNext: handleNext,
                onBack: handleBack,
                onSkip: handleSkip,
                onReset: handleReset,
              })}
            </section>

            <NavigationFooter
              showNavigationButtons={showNavigationButtons}
              showSkipButton={showSkipButton}
              showResetButton={showResetButton && showButton}
              isSubmitting={isSubmitting}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              allowBackNavigation={allowBackNavigation}
              allowSkipping={allowSkipping}
              isResetAvailable={isResetAvailable()}
              backButtonText={backButtonText}
              nextButtonText={nextButtonText}
              skipButtonText={skipButtonText}
              submitButtonText={submitButtonText}
              resetButtonText={resetButtonText}
              supportText={supportText}
              supportAction={supportAction}
              customFooter={customFooter}
              onBack={handleBack}
              onNext={handleNext}
              onSkip={handleSkip}
              onSubmit={form.handleSubmit(handleSubmit)}
              onReset={handleReset}
            />
          </div>
        </Form>
      </div>
    </div>
  );

  // Render based on layout type
  if (type === "none") {
    return (
      <div className={cn("h-full", className)}>
        {horizontalStepIndicator}
        {mainContent}
      </div>
    );
  }

  if (type === "custom" && customLayout) {
    const CustomLayout = customLayout;
    return (
      <div className={cn("h-full", className)}>
        <CustomLayout sidebar={sidebarContent}>
          {horizontalStepIndicator}
          {mainContent}
        </CustomLayout>
      </div>
    );
  }

  // Default layout (OnboardingFlowLayout)
  return (
    <div className={cn("h-full", className)}>
      <OnboardingFlowLayout sidebar={sidebarContent}>
        {horizontalStepIndicator}
        {mainContent}
      </OnboardingFlowLayout>
    </div>
  );
};