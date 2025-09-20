import React from "react";
import Layout from "./Layout";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  Input,
  Badge,
} from "../ui";
import { cn } from "@/lib/utils";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "../ui/form";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
  Globe,
  User,
  CreditCard,
  Receipt,
  Users,
  LucideIcon,
  Target,
  Landmark,
  Mountain,
} from "lucide-react";
import { H2, P } from "../ui/typography";

type StepComponentProps = {
  step: {
    hint?: string;
  };
};
const OrganizationDetailsStep: React.FC<StepComponentProps> = ({ step }) => {
  const form = useFormContext();
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Organization Details</h3>
        <p className="text-gray-600">{step.hint}</p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <Building2 className="w-4 h-4 text-gray-500" />
                Organization name
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Acme Inc."
                    className={cn(
                      "pl-4 h-12 transition-colors",
                      field.value ? "border-green-500 focus:border-green-600 focus:ring-green-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    )}
                    {...field}
                  />
                  {field.value && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                </div>
              </FormControl>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <Globe className="w-4 h-4 text-gray-500" />
                Website <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="https://example.com"
                    className={cn(
                      "pl-4 h-12 transition-colors",
                      field.value ? "border-green-500 focus:border-green-600 focus:ring-green-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    )}
                    {...field}
                  />
                  {field.value && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                </div>
              </FormControl>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

const ContactBillingStep: React.FC<StepComponentProps> = ({ step }) => {
  const form = useFormContext();
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Information</h3>
        <p className="text-gray-600">{step.hint}</p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <Mail className="w-4 h-4 text-gray-500" />
                Admin Email
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    className={cn(
                      "pl-4 h-12 transition-colors",
                      field.value ? "border-green-500 focus:border-green-600 focus:ring-green-500" : "border-gray-300 focus:border-green-500 focus:ring-green-500"
                    )}
                    {...field}
                  />
                  {field.value && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                </div>
              </FormControl>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminMobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <Phone className="w-4 h-4 text-gray-500" />
                Phone number <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="xxxxxxxxxx"
                    className={cn(
                      "pl-4 h-12 transition-colors",
                      field.value ? "border-green-500 focus:border-green-600 focus:ring-green-500" : "border-gray-300 focus:border-green-500 focus:ring-green-500"
                    )}
                    {...field}
                  />
                  {field.value && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                </div>
              </FormControl>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billingAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <MapPin className="w-4 h-4 text-gray-500" />
                Billing Address <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="123 Main St, City, State, ZIP"
                    className={cn(
                      "pl-4 h-12 transition-colors",
                      field.value ? "border-green-500 focus:border-green-600 focus:ring-green-500" : "border-gray-300 focus:border-green-500 focus:ring-green-500"
                    )}
                    {...field}
                  />
                  {field.value && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                </div>
              </FormControl>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

const GstinDetailsStep: React.FC<StepComponentProps> = ({ step }) => {
  const form = useFormContext();
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Tax Registration</h3>
        <p className="text-gray-600">{step.hint}</p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="gstin"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <FileText className="w-4 h-4 text-gray-500" />
                GSTIN <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className="pl-4 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors font-mono text-sm tracking-wider"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-gray-500 mt-1">
                Enter your 15-character GST Identification Number
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                <FileText className="w-4 h-4 text-gray-500" />
                Tax Details <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Additional tax information"
                    className="pl-4 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-gray-500 mt-1">
                Any additional tax-related information
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

const StateSelectionStep: React.FC<StepComponentProps> = ({ step }) => {
  const form = useFormContext();
  const [selectedState, setSelectedState] = React.useState<string>("");

  const states = [
    {
      id: "delaware",
      name: "DELAWARE",
      icon: Landmark,
      description: "Most popular choice for corporations",
      color: "text-blue-600"
    },
    {
      id: "wyoming",
      name: "WYOMING",
      icon: Mountain,
      description: "Business-friendly with low taxes",
      color: "text-green-600"
    }
  ];

  const handleStateSelect = (stateId: string) => {
    setSelectedState(stateId);
    form.setValue("incorporationState", stateId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose the state</h3>
        <p className="text-gray-600 text-lg">{step.hint || "Select the state in which you want to incorporate your new company."}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {states.map((state) => {
          const Icon = state.icon;
          const isSelected = selectedState === state.id;
          
          return (
            <div
              key={state.id}
              className={cn(
                "group relative border-2 rounded-xl p-8 cursor-pointer transition-all duration-300 bg-white",
                isSelected 
                  ? "border-blue-500 shadow-lg ring-2 ring-blue-200" 
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md"
              )}
              onClick={() => handleStateSelect(state.id)}
            >
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors",
                  isSelected ? "bg-blue-100" : "bg-gray-100 group-hover:bg-blue-50"
                )}>
                  <Icon className={cn("w-8 h-8", state.color)} />
                </div>
                <h4 className={cn(
                  "text-xl font-bold mb-2 transition-colors",
                  isSelected ? "text-blue-900" : "text-gray-900 group-hover:text-blue-800"
                )}>
                  {state.name}
                </h4>
                <p className="text-gray-600 text-sm">
                  {state.description}
                </p>
                {isSelected && (
                  <div className="mt-4 flex items-center justify-center text-blue-600 font-medium">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    <span>Selected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReviewFinalizeStep: React.FC<StepComponentProps> = ({ step }) => {
  const form = useFormContext();

  const summaryItems = [
    {
      label: "Organization",
      value: form.watch("organizationName"),
      icon: Building2,
      color: "text-blue-600"
    },
    {
      label: "Website",
      value: form.watch("website"),
      icon: Globe,
      color: "text-blue-600"
    },
    {
      label: "Admin Email",
      value: form.watch("adminEmail"),
      icon: Mail,
      color: "text-green-600"
    },
    {
      label: "Phone",
      value: form.watch("adminMobile"),
      icon: Phone,
      color: "text-green-600"
    },
    {
      label: "Billing Address",
      value: form.watch("billingAddress"),
      icon: MapPin,
      color: "text-green-600"
    },
    {
      label: "GSTIN",
      value: form.watch("gstin"),
      icon: FileText,
      color: "text-purple-600"
    },
    {
      label: "Tax Details",
      value: form.watch("taxDetails"),
      icon: FileText,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Review & Finalize</h3>
        <p className="text-gray-600">{step.hint}</p>
      </div>

      <Card className="border-2 border-gray-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-orange-600" />
            Organization Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {summaryItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-gray-100`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-600">
                        {item.value || "Not specified"}
                      </p>
                    </div>
                  </div>
                  {item.value && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const flowConfig = {
  steps: {
    newBusiness: [
      {
        id: "companyType",
        title: "Company Type",
        subtitle: "Choose company type",
        hint: "Select the type of company you want to create.",
        icon: Building2,
        color: "blue",
      },
      {
        id: "state",
        title: "State",
        subtitle: "Choose incorporation state",
        hint: "Select the state in which you want to incorporate your new company.",
        icon: MapPin,
        color: "blue",
      },
      {
        id: "organization",
        title: "Business Details",
        subtitle: "Organization details",
        hint: "Enter your organization's details.",
        icon: Building2,
        color: "blue",
      },
      {
        id: "team",
        title: "Team",
        subtitle: "Team information",
        hint: "Add team members to your organization.",
        icon: Users,
        color: "blue",
      },
      {
        id: "personal",
        title: "Personal Details",
        subtitle: "Personal information",
        hint: "Provide your personal details.",
        icon: User,
        color: "blue",
      },
    ],
    existingBusiness: [
      {
        id: "companyType",
        title: "Company Type",
        subtitle: "Choose company type",
        hint: "Select the type of company you want to create.",
        icon: Building2,
        color: "blue",
      },
      {
        id: "state",
        title: "State",
        subtitle: "Choose incorporation state",
        hint: "Select the state in which you want to incorporate your new company.",
        icon: MapPin,
        color: "blue",
      },
      {
        id: "organization",
        title: "Organization",
        subtitle: "Organization details",
        hint: "Enter your organization's details.",
        icon: Building2,
        color: "blue",
      },
      {
        id: "contact",
        title: "Contact & billing",
        subtitle: "Admin contact & billing info",
        hint: "Provide the primary admin email and billing information for invoices and payments.",
        icon: CreditCard,
        color: "green",
      },
      {
        id: "gstin",
        title: "GSTIN details",
        subtitle: "Tax registration (GSTIN)",
        hint: "Enter your GSTIN and related tax details required for compliant invoicing.",
        icon: Receipt,
        color: "purple",
      },
      {
        id: "review",
        title: "Review & finalize",
        subtitle: "Confirm settings & invite team",
        hint: "Verify all details, invite team members, and then create your organization.",
        icon: Users,
        color: "orange",
      },
    ],
  },
};

// Step Indicator Component - Sidebar Style
const StepIndicator: React.FC<{
  steps: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: LucideIcon
    color: string;
  }>;
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  stepValidationErrors?: Record<string, string>;
  isValidatingStep?: boolean;
  isStepCompleted?: (stepIndex: number) => boolean;
}> = ({ 
  steps, 
  currentStepIndex, 
  onStepClick, 
  stepValidationErrors = {}, 
  isValidatingStep = false,
  isStepCompleted = () => false
}) => {
  return (
    <div className="space-y-6">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = isStepCompleted(index) || index < currentStepIndex;
        const isFuture = index > currentStepIndex && !isStepCompleted(index);
        const hasErrors = Object.keys(stepValidationErrors).length > 0 && isActive;
        const isCurrentStepValidating = isActive && isValidatingStep;
        const canNavigateTo = index <= currentStepIndex || isStepCompleted(index);

        return (
          <div key={step.id} className="space-y-3">
            {/* Main Step */}
            <div
              className={cn(
                "flex items-center space-x-3 transition-all duration-200 p-2 rounded-md",
                canNavigateTo && onStepClick && "cursor-pointer hover:bg-gray-100",
                !canNavigateTo && "cursor-not-allowed opacity-50",
              )}
              onClick={() => canNavigateTo && onStepClick?.(index)}
            >
              {/* Step Icon/Number */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                  isCompleted && "bg-green-500 text-white",
                  isActive && !hasErrors && "bg-blue-500 text-white",
                  isActive && hasErrors && "bg-red-500 text-white",
                  isFuture && "bg-gray-300 text-gray-600",
                  isCurrentStepValidating && "bg-yellow-500 text-white"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrentStepValidating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Step Title */}
              <div className="flex-1">
                <div
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isCompleted && "text-gray-500",
                    isActive && !hasErrors && "text-blue-600 font-semibold",
                    isActive && hasErrors && "text-red-600 font-semibold",
                    isFuture && "text-gray-400"
                  )}
                >
                  {step.title.toUpperCase()}
                </div>
                {isActive && (
                  <ArrowRight className="w-4 h-4 text-blue-600 ml-2" />
                )}
                {hasErrors && (
                  <div className="text-xs text-red-500 mt-1">
                    Please fix errors to continue
                  </div>
                )}
              </div>
            </div>

            {/* Sub-steps (only show for current step) */}
            {/* {isActive && (
              <div className="ml-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span className="font-medium">Organization Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Contact Information</span>
                </div>
              </div>
            )} */}
          </div>
        );
      })}

      
    </div>
  );
};

const useFlow = (type: "newBusiness" | "existingBusiness") => {
  const steps = flowConfig.steps[type];
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  
  const next = () => {
    if (!isLastStep) {
      setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const back = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const goTo = (index: number) => {
    // Only allow navigation to completed steps, current step, or next step if current is completed
    const canNavigateTo = index <= currentStepIndex || completedSteps.has(index - 1);
    if (index >= 0 && index < steps.length && canNavigateTo) {
      setCurrentStepIndex(index);
    }
  };
  
  const markStepAsCompleted = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  };
  
  const isStepCompleted = (stepIndex: number) => {
    return completedSteps.has(stepIndex);
  };
  
  return {
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    next,
    back,
    goTo,
    steps,
    completedSteps,
    markStepAsCompleted,
    isStepCompleted,
  };
};

function FlowSelector({
  onSelect,
  className,
}: {
  onSelect: (flow: "newBusiness" | "existingBusiness") => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)}>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          How would you like to set up your organization?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the option that best describes your business setup. We'll guide you through the process step by step.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div
          className="group relative border-2 border-gray-200 rounded-xl p-8 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all duration-300 bg-white"
          onClick={() => onSelect("newBusiness")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 group-hover:bg-blue-200 transition-colors">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
              New Business
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              I am starting a new business and need to set up everything from scratch.
            </p>
            <div className="mt-6 flex items-center text-blue-600 font-medium">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div
          className="group relative border-2 border-gray-200 rounded-xl p-8 cursor-pointer hover:border-green-500 hover:shadow-xl transition-all duration-300 bg-white"
          onClick={() => onSelect("existingBusiness")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 group-hover:bg-green-200 transition-colors">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-900 transition-colors">
              Existing Business
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              I already have a business and need to enter my existing details.
            </p>
            <div className="mt-6 flex items-center text-green-600 font-medium">
              <span>Continue Setup</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function getFormComponentForStep(stepId: string, step: any) {
  switch (stepId) {
    case "state":
      return <StateSelectionStep step={step} />;
    case "organization":
      return <OrganizationDetailsStep step={step} />;
    case "contact":
      return <ContactBillingStep step={step} />;
    case "gstin":
      return <GstinDetailsStep step={step} />;
    case "review":
      return <ReviewFinalizeStep step={step} />;
    default:
      return null;
  }
}

// Individual step validation schemas
const stateStepSchema = z.object({
  incorporationState: z
    .string()
    .min(1, "Please select a state for incorporation"),
});

const organizationStepSchema = z.object({
  organizationName: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Max 100 characters"),
  website: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional(),
});

const contactStepSchema = z.object({
  adminEmail: z.string().email("Invalid email address"),
  adminMobile: z
    .string()
    .min(10, "Enter a valid mobile number")
    .max(15, "Max 15 characters")
    .or(z.literal("")),
  billingAddress: z
    .string()
    .min(1, "Billing address is required")
    .max(200, "Max 200 characters")
    .or(z.literal("")),
});

const gstinStepSchema = z.object({
  gstin: z
    .string()
    .min(15, "GSTIN must be 15 characters")
    .max(15, "GSTIN must be 15 characters")
    .or(z.literal("")),
  taxDetails: z
    .string()
    .max(500, "Max 500 characters")
    .or(z.literal("")),
});

// Complete form schema for final validation
const OnboardingFormSchema = z.object({
  incorporationState: z
    .string()
    .min(1, "Please select a state for incorporation"),
  organizationName: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Max 100 characters"),
  website: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional(),
  adminEmail: z.string().email("Invalid email address"),
  adminMobile: z
    .string()
    .min(10, "Enter a valid mobile number")
    .max(15, "Max 15 characters")
    .or(z.literal("")),
  billingAddress: z
    .string()
    .min(1, "Billing address is required")
    .max(200, "Max 200 characters")
    .or(z.literal("")),
  gstin: z
    .string()
    .min(15, "GSTIN must be 15 characters")
    .max(15, "GSTIN must be 15 characters")
    .or(z.literal("")),
  taxDetails: z
    .string()
    .max(500, "Max 500 characters")
    .or(z.literal("")),
});

// Step validation functions
const validateStep = (stepId: string, formData: any) => {
  try {
    switch (stepId) {
      case "state":
        stateStepSchema.parse(formData);
        return { isValid: true, errors: {} };
      case "organization":
        organizationStepSchema.parse(formData);
        return { isValid: true, errors: {} };
      case "contact":
        contactStepSchema.parse(formData);
        return { isValid: true, errors: {} };
      case "gstin":
        gstinStepSchema.parse(formData);
        return { isValid: true, errors: {} };
      case "review":
        OnboardingFormSchema.parse(formData);
        return { isValid: true, errors: {} };
      default:
        return { isValid: false, errors: { general: "Unknown step" } };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: "Validation failed" } };
  }
};

function Onboarding() {
  const { } = useKindeAuth();
  const form = useForm({
    defaultValues: {
      incorporationState: "",
      organizationName: "",
      website: "",
      adminEmail: "",
      adminMobile: "",
      billingAddress: "",
      gstin: "",
      taxDetails: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    resolver: zodResolver(OnboardingFormSchema),
  });
  const [selectedFlow, setSelectedFlow] = React.useState<
    "newBusiness" | "existingBusiness" | null
  >(null);
  const [stepValidationErrors, setStepValidationErrors] = React.useState<Record<string, string>>({});
  const [isValidatingStep, setIsValidatingStep] = React.useState(false);
  
  const {
    currentStep,
    next,
    back,
    isFirstStep,
    isLastStep,
    currentStepIndex,
    steps,
    completedSteps,
    markStepAsCompleted,
    isStepCompleted,
  } = useFlow(selectedFlow || "newBusiness");

  // Handle step validation and navigation
  const handleNext = async () => {
    if (!currentStep) return;
    
    setIsValidatingStep(true);
    setStepValidationErrors({});
    
    const formData = form.getValues();
    const validation = validateStep(currentStep.id, formData);
    
    if (validation.isValid) {
      // Clear any previous errors and proceed
      setStepValidationErrors({});
      markStepAsCompleted(currentStepIndex);
      next();
    } else {
      // Set validation errors and prevent navigation
      setStepValidationErrors(validation.errors);
      
      // Set form errors for individual fields
      Object.entries(validation.errors).forEach(([field, message]) => {
        form.setError(field as any, { type: "manual", message });
      });
    }
    
    setIsValidatingStep(false);
  };

  // Handle form submission (final step)
  const handleSubmit = async (data: any) => {
    if (!currentStep) return;
    
    setIsValidatingStep(true);
    setStepValidationErrors({});
    
    const validation = validateStep(currentStep.id, data);
    
    if (validation.isValid) {
      console.log("Form submitted successfully:", data);
      // Here you would typically call your API to create the organization
    } else {
      setStepValidationErrors(validation.errors);
      Object.entries(validation.errors).forEach(([field, message]) => {
        form.setError(field as any, { type: "manual", message });
      });
    }
    
    setIsValidatingStep(false);
  };
  const { id } = (selectedFlow && currentStep) || {
    id: "",
    children: null,
    title: "Let's get started with creating your organization",
    subtitle: "create your organization in a few easy steps.",
    footer: null,
    actionBar: null,
    formSection: null,
    icon: Target,
    color: "text-blue-400",
  };

  const footer = (
    <div className="relative">
      <div className="text-sm text-gray-500">Need help? Contact </div>

    </div>
  );
  const actionBar = selectedFlow ? (
    <div className="flex justify-end w-full gap-4">
      <Button variant="outline" disabled={isFirstStep} onClick={back}>
        Back
      </Button>
      <Button
        className="ml-2"
        onClick={isLastStep ? form.handleSubmit(handleSubmit) : handleNext}
        type={isLastStep ? "submit" : "button"}
        disabled={isValidatingStep}
      >
        {isValidatingStep ? "Validating..." : isLastStep ? "Create Organization" : "Next"}
      </Button>
    </div>
  ) : null;

  const formSection = getFormComponentForStep(id, currentStep);
  return (
    <Layout
      iconConfig={{ icon: steps[currentStepIndex].icon, color: steps[currentStepIndex].color }}
      sidebar={selectedFlow ? <div className="h-fit mt-12">
        <StepIndicator
          steps={steps}
          currentStepIndex={currentStepIndex}
          stepValidationErrors={stepValidationErrors}
          isValidatingStep={isValidatingStep}
          isStepCompleted={isStepCompleted}
          onStepClick={(index) => {
            // Allow navigation to completed steps or current step
            if (index <= currentStepIndex || isStepCompleted(index)) {
              // You can implement step navigation logic here if needed
              console.log(`Navigate to step ${index}`);
            }
          }}
        />
      </div> : <div className="h-full flex flex-col items-center justify-center mt-12 space-y-6">
        <H2>Let's get started with creating your organization</H2>
        <P>Let's get your organization set up in a few easy steps.</P>
      </div>}


      footer={footer}
      actionBar={actionBar}
    >
      {!selectedFlow ? (
        <FlowSelector onSelect={setSelectedFlow} className="mt-12" />
      ) : (
        <div className="space-y-6 p-4">
          

          {/* Step component would go here */}
          {formSection && (
            <div className="mt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  {formSection}
                </form>
              </Form>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default Onboarding;
