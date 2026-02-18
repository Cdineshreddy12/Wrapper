import { config } from '@/lib/config';

export const APPLICATION_CONFIG = {
  crm: {
    name: 'Customer Relationship Management',
    description: 'Complete CRM solution for managing customers, deals, and sales pipeline',
    icon: '🎫',
    url: config.CRM_DOMAIN
  },
  hr: {
    name: 'Human Resources Management',
    description: 'Complete HR solution for employee management and payroll',
    icon: '👥',
    url: config.HR_APP_URL
  },
  affiliate: {
    name: 'Affiliate Management',
    description: 'Manage affiliate partners and commission tracking',
    icon: '🤝',
    url: config.AFFILIATE_APP_URL
  },
  system: {
    name: 'System Administration',
    description: 'System administration and user management',
    icon: '⚙️',
    url: config.API_BASE_URL
  }
} as const;

export const getAppDisplayName = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.name || appCode.toUpperCase();
};

export const getAppDescription = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.description || `${appCode.toUpperCase()} Application`;
};

export const getAppIcon = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.icon || '🔧';
};

export const getAppUrl = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.url ?? '';
};
