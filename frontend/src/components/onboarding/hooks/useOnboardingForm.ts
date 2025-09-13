import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newBusinessData, newBusinessSchema, existingBusinessData, existingBusinessSchema } from '../schemas';

const flowConfig = {
  newBusiness: {
    formSchema: newBusinessSchema,
    defaultValues: {
      companyType: '',
      state: '',
      businessDetails: {
        companyName: '',
        businessType: '',
        description: ''
      },
      team: [],
      personalDetails: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: ''
      }
    }
  },
  existingBusiness: {
    formSchema: existingBusinessSchema,
    defaultValues: {
      companyType: '',
      state: '',
      businessDetails: {
        companyName: '',
        businessType: '',
        description: ''
      },
      team: [],
      personalDetails: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: ''
      },
      gstin: '',
      taxDetails: '',
      billingAddress: '',
      adminEmail: '',
      adminMobile: '',
      website: '',
      incorporationState: '',
    }
  }
}
export const useOnboardingForm = (flow: 'newBusiness' | 'existingBusiness') => {
  const form = useForm<newBusinessData | existingBusinessData>({
    resolver: zodResolver(flowConfig[flow].formSchema),
    defaultValues: flowConfig[flow].defaultValues,
    mode: 'onSubmit', // Only validate on submit
    reValidateMode: 'onChange', // Re-validate on change after first validation
    shouldFocusError: true, // Focus on first error field
    criteriaMode: 'all', // Show all validation errors
  });

  return form;
};
