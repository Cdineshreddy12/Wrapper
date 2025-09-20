import { Building2, MapPin, Users, User, FileText, CreditCard, Globe, CheckCircle } from 'lucide-react';

export interface StepConfig {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  description?: string;
  key: string;
  icon?: React.ComponentType<any>;
  color?: string;
  isOptional?: boolean;
  validation?: {
    required?: boolean;
    customValidator?: (values: any) => boolean;
  };
  navigation?: {
    canSkip?: boolean;
    canGoBack?: boolean;
    nextStepCondition?: (values: any) => boolean;
  };
  ui?: {
    showProgress?: boolean;
    showStepNumber?: boolean;
    className?: string;
  };
}

// New Business Flow Steps
export const newBusinessSteps: StepConfig[] = [
  // {
  //   id: 'companyType',
  //   number: 1,
  //   title: 'COMPANY TYPE',
  //   subtitle: 'Choose company type',
  //   description: 'Select the type of company you want to create.',
  //   key: 'companyType',
  //   icon: Building2,
  //   color: 'blue',
  //   validation: {
  //     required: true,
  //   },
  //   navigation: {
  //     canSkip: false,
  //     canGoBack: false
  //   },
  //   ui: {
  //     showProgress: true,
  //     showStepNumber: true
  //   }
  // },
 
  {
    id: 'businessDetails',
    number: 1,
    title: 'BUSINESS DETAILS',
    subtitle: 'Organization details',
    description: 'Enter your organization\'s details.',
    key: 'businessDetails',
    icon: Building2,
    color: 'blue',
    validation: {
      required: true,
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  },
  // {
  //   id: 'team',
  //   number: 3,
  //   title: 'TEAM',
  //   subtitle: 'Team information',
  //   description: 'Add team members to your organization.',
  //   key: 'team',
  //   icon: Users,
  //   color: 'blue',
  //   isOptional: true,
  //   validation: {
  //     required: false,
  //   },
  //   navigation: {
  //     canSkip: true,
  //     canGoBack: true
  //   },
  //   ui: {
  //     showProgress: true,
  //     showStepNumber: true
  //   }
  // },
  {
    id: 'personalDetails',
    number: 2,
    title: 'PERSONAL DETAILS',
    subtitle: 'Personal information',
    description: 'Provide your personal details.',
    key: 'personalDetails',
    icon: User,
    color: 'blue',
    validation: {
      required: true,
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  },
  {
    id: 'review',
    number: 3,
    title: 'REVIEW',
    subtitle: 'Review your information',
    description: 'Review all the information you\'ve provided before submitting.',
    key: 'review',
    icon: CheckCircle,
    color: 'blue',
    validation: {
      required: false,
      customValidator: () => true // Review step doesn't need validation
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  }
];

// Existing Business Flow Steps
export const existingBusinessSteps: StepConfig[] = [
  // {
  //   id: 'companyType',
  //   number: 1,
  //   title: 'COMPANY TYPE',
  //   subtitle: 'Choose company type',
  //   description: 'Select the type of your existing company.',
  //   key: 'companyType',
  //   icon: Building2,
  //   color: 'green',
  //   validation: {
  //     required: true,
  //   },
  //   navigation: {
  //     canSkip: false,
  //     canGoBack: false
  //   },
  //   ui: {
  //     showProgress: true,
  //     showStepNumber: true
  //   }
  // },
  {
    id: 'businessDetails',
    number: 1,
    title: 'BUSINESS DETAILS',
    subtitle: 'Organization information',
    description: 'Provide your business details and information.',
    key: 'businessDetails',
    icon: FileText,
    color: 'green',
    validation: {
      required: true
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  },
  {
    id: 'taxDetails',
    number: 2,
    title: 'TAX DETAILS',
    subtitle: 'Tax and compliance',
    description: 'Enter your tax registration and compliance details.',
    key: 'taxDetails',
    icon: CreditCard,
    color: 'green',
    validation: {
      required: true,
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  },
  // {
  //   id: 'team',
  //   number: 3,
  //   title: 'TEAM',
  //   subtitle: 'Team information',
  //   description: 'Add team members to your organization.',
  //   key: 'team',
  //   icon: Users,
  //   color: 'green',
  //   isOptional: true,
  //   validation: {
  //     required: false,
  //     customValidator: () => true // Team is optional
  //   },
  //   navigation: {
  //     canSkip: true,
  //     canGoBack: true
  //   },
  //   ui: {
  //     showProgress: true,
  //     showStepNumber: true
  //   }
  // },
  {
    id: 'adminDetails',
    number: 3,
    title: 'ADMIN DETAILS',
    subtitle: 'Administrator information',
    description: 'Provide administrator contact and account details.',
    key: 'adminDetails',
    icon: User,
    color: 'green',
    validation: {
      required: true,
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  },
  {
    id: 'personalDetails',
    number: 4,
    title: 'PERSONAL DETAILS',
    subtitle: 'Personal information',
    description: 'Provide your personal details.',
    key: 'personalDetails',
    icon: User,
    color: 'green',
    validation: {
      required: true,
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  },
  {
    id: 'review',
    number: 5,
    title: 'REVIEW',
    subtitle: 'Review your information',
    description: 'Review all the information you\'ve provided before submitting.',
    key: 'review',
    icon: CheckCircle,
    color: 'green',
    validation: {
      required: false,
      customValidator: () => true // Review step doesn't need validation
    },
    navigation: {
      canSkip: false,
      canGoBack: true
    },
    ui: {
      showProgress: true,
      showStepNumber: true
    }
  }
];

// Flow configuration
export interface FlowConfig {
  id: 'newBusiness' | 'existingBusiness';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  steps: StepConfig[];
}

export const flowConfigs: FlowConfig[] = [
  {
    id: 'newBusiness',
    title: 'Start New Business',
    description: 'Create a new company from scratch with step-by-step guidance',
    icon: Building2,
    color: 'blue',
    steps: newBusinessSteps
  },
  {
    id: 'existingBusiness',
    title: 'Existing Business',
    description: 'Onboard your existing business with additional compliance details',
    icon: Globe,
    color: 'green',
    steps: existingBusinessSteps
  }
];

// Helper functions
export const getFlowConfig = (flowId: 'newBusiness' | 'existingBusiness'): FlowConfig | undefined => {
  return flowConfigs.find(flow => flow.id === flowId);
};

export const getStepById = (steps: StepConfig[], id: string): StepConfig | undefined => {
  return steps.find(step => step.id === id);
};

export const getStepByNumber = (steps: StepConfig[], number: number): StepConfig | undefined => {
  return steps.find(step => step.number === number);
};


export const canGoBackFromStep = (step: StepConfig): boolean => {
  return step.navigation?.canGoBack ?? true;
};

export const canSkipStep = (step: StepConfig): boolean => {
  return step.navigation?.canSkip ?? false;
};
