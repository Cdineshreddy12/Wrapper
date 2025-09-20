import { z } from 'zod';

// Zod schemas for validation
export const teamMemberSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Invalid email address'),
});

export const businessDetailsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  description: z.string().optional(),
});

export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(1, 'Address is required'),
});

export const newBusinessSchema = z.object({
  companyType: z.string().min(1, 'Company type is required'),
  state: z.string().min(1, 'State is required'),
  businessDetails: businessDetailsSchema,
  team: z.array(teamMemberSchema),
  personalDetails: personalDetailsSchema,
});

export const existingBusinessSchema = z.object({
  companyType: z.string().min(1, 'Company type is required'),
  state: z.string().min(1, 'State is required'),
  businessDetails: businessDetailsSchema,
  team: z.array(teamMemberSchema),
  personalDetails: personalDetailsSchema,
  gstin: z.string().min(1, 'GSTIN is required'),
  // taxDetails: z.string().min(1, 'Tax details are required'),
  billingAddress: z.string().min(1, 'Billing address is required'),
  adminEmail: z.string().email('Invalid email address'),
  adminMobile: z.string().min(10, 'Phone number must be at least 10 digits'),
  website: z.string().url('Invalid website URL'),
  incorporationState: z.string().min(1, 'Incorporation state is required'),
});

// Type definitions
export type newBusinessData = z.infer<typeof newBusinessSchema>;
export type existingBusinessData = z.infer<typeof existingBusinessSchema>;

// Individual field schemas for step validation
export const fieldSchemas = {
  companyType: z.string().min(1, 'Company type is required'),
  state: z.string().min(1, 'State is required'),
  businessDetails: businessDetailsSchema,
  team: z.array(teamMemberSchema),
  personalDetails: personalDetailsSchema,
  gstin: z.string().min(1, 'GSTIN is required'),
  // taxDetails: z.string().min(1, 'Tax details are required'),
  billingAddress: z.string().min(1, 'Billing address is required'),
  adminEmail: z.string().email('Invalid email address'),
  adminMobile: z.string().min(10, 'Phone number must be at least 10 digits'),
  website: z.string().url('Invalid website URL'),
  incorporationState: z.string().min(1, 'Incorporation state is required'),
};
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type BusinessDetails = z.infer<typeof businessDetailsSchema>;
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;

// Step configuration
export interface Step {
  number: number;
  title: string;
  key: string;
}

export interface CompanyType {
  id: string;
  name: string;
  description: string;
}

export interface State {
  id: string;
  name: string;
}

// Constants
export const STEPS: Step[] = [
  { number: 1, title: 'COMPANY TYPE', key: 'companyType' },
  { number: 2, title: 'STATE', key: 'state' },
  { number: 3, title: 'BUSINESS DETAILS', key: 'businessDetails' },
  { number: 4, title: 'TEAM', key: 'team' },
  { number: 5, title: 'PERSONAL DETAILS', key: 'personalDetails' }
];

export const COMPANY_TYPES: CompanyType[] = [
  { id: 'llc', name: 'LLC', description: 'Limited Liability Company' },
  { id: 'corporation', name: 'Corporation', description: 'C-Corporation' },
  { id: 's-corp', name: 'S-Corp', description: 'S-Corporation' }
];

export const STATES: State[] = [
  { id: 'delaware', name: 'DELAWARE' },
  { id: 'wyoming', name: 'WYOMING' }
];

export const BUSINESS_TYPES: string[] = [
  'Technology', 'Retail', 'Manufacturing', 'Services', 'Healthcare', 'Finance', 'Other'
];
