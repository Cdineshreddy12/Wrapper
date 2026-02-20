/**
 * 🎯 **PERMISSION TIER CONFIGURATION**
 * Defines what modules are accessible for each subscription tier
 * This file provides the permanent solution for dynamic permission management
 */

export const PERMISSION_TIERS = {
  free: {
    description: 'Free plan with basic CRM access',
    max_users: 2,
    max_storage: '500MB',
    apps: {
      applications: ['catalog', 'dashboard'],
      crm: ['leads', 'contacts', 'dashboard'],
    }
  },

  starter: {
    description: 'Basic starter plan with essential features',
    max_users: 5,
    max_storage: '1GB',
    apps: {
      applications: ['catalog', 'dashboard'],
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'dashboard'],
      hr: ['employees', 'leave', 'dashboard'],
      project_management: ['projects', 'tasks', 'team', 'dashboard'],
    }
  },
  
  professional: {
    description: 'Professional plan with advanced features',
    max_users: 25,
    max_storage: '10GB',
    apps: {
      applications: ['catalog', 'dashboard'],
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'invoices', 'inventory', 'product_orders', 'tickets', 'communications', 'calendar', 'dashboard', 'system'],
      hr: ['employees', 'payroll', 'leave', 'dashboard'],
      project_management: ['projects', 'tasks', 'sprints', 'time_tracking', 'team', 'backlog', 'documents', 'analytics', 'reports', 'chat', 'calendar', 'kanban', 'dashboard', 'notifications', 'workspace'],
    }
  },
  
  enterprise: {
    description: 'Enterprise plan with all features and unlimited access',
    max_users: 'unlimited',
    max_storage: 'unlimited',
    apps: {
      applications: '*',
      crm: '*',
      hr: '*',
      affiliateConnect: '*',
      project_management: '*',
      operations: '*',
    }
  },

  custom: {
    description: 'Custom tier - modules defined per organization',
    max_users: 'variable',
    max_storage: 'variable',
    apps: {
      // Will be determined by organization_applications table
    }
  }
} as const;

export type TierKey = keyof typeof PERMISSION_TIERS;

type TierAppsValue = string[] | '*';

export interface TierChangeWarning {
  app: string;
  removedModules: string[];
  message: string;
}

export interface ValidateTierChangeResult {
  warnings: TierChangeWarning[];
  errors: string[];
  allowed: boolean;
}

/** Map of app code to list of module codes in use */
export interface CurrentModulesMap {
  [appCode: string]: string[];
}

/**
 * Core modules that should always be included regardless of tier
 * These are essential for basic functionality
 */
export const CORE_MODULES = {
  applications: ['catalog', 'dashboard'],
  crm: ['dashboard'],
  hr: ['dashboard'],
  affiliateConnect: ['dashboard'],
  project_management: ['dashboard'],
  operations: ['dashboard']
};

/**
 * Module categories for easier management
 */
export const MODULE_CATEGORIES = {
  applications: {
    core: ['catalog', 'dashboard'],
  },
  crm: {
    core: ['leads', 'contacts', 'dashboard'],
    sales: ['opportunities', 'quotations'],
    management: ['accounts', 'system'],
    operations: ['invoices', 'inventory', 'product_orders'],
    support: ['tickets', 'communications'],
    advanced: ['calendar', 'ai_insights', 'form_builder', 'analytics', 'sales_orders']
  },
  hr: {
    core: ['employees', 'dashboard'],
    payroll: ['payroll'],
    management: ['leave'],
    advanced: []
  },
  affiliateConnect: {
    core: ['dashboard', 'products', 'affiliates'],
    advanced: ['tracking', 'commissions', 'campaigns', 'influencers', 'payments', 'analytics', 'fraud', 'communications', 'integrations', 'settings', 'support']
  },
  project_management: {
    core: ['projects', 'tasks', 'team', 'dashboard'],
    advanced: ['sprints', 'time_tracking', 'backlog', 'documents', 'analytics', 'reports', 'chat', 'calendar', 'kanban', 'notifications', 'workspace', 'workflow', 'system']
  },
  operations: {
    core: ['dashboard', 'inventory', 'orders'],
    logistics: ['warehouse', 'procurement', 'suppliers', 'transportation', 'fulfillments', 'shipments'],
    management: ['catalog', 'quality', 'rfx', 'finance', 'tax_compliance', 'supply_chain', 'contracts', 'analytics'],
    services: ['service_appointments', 'marketing', 'customers', 'returns', 'customer_portal', 'vendor_management', 'service_providers'],
    system: ['notifications', 'system']
  }
};

/**
 * Gets accessible modules for a given subscription tier and app
 */
export function getAccessibleModules(appCode: string, subscriptionTier: TierKey, fallbackToTier: TierKey = 'starter'): string[] | 'all' {
  const tier = PERMISSION_TIERS[subscriptionTier] || PERMISSION_TIERS[fallbackToTier];
  const appModules = (tier.apps as Record<string, TierAppsValue>)[appCode];
  
  if (appModules === '*') {
    // Enterprise gets all modules - return all available modules for this app
    return 'all';
  }
  
  if (Array.isArray(appModules)) {
    // Specific modules defined
    return appModules;
  }
  
  // No access to this app
  return [];
}

/**
 * Checks if a module is accessible for a given tier
 */
export function isModuleAccessible(appCode: string, moduleCode: string, subscriptionTier: TierKey): boolean {
  const accessibleModules = getAccessibleModules(appCode, subscriptionTier);
  
  if (accessibleModules === 'all') {
    return true;
  }
  
  return Array.isArray(accessibleModules) && accessibleModules.includes(moduleCode);
}

/**
 * Gets all tiers that have access to a specific module
 */
export function getTiersWithModuleAccess(appCode: string, moduleCode: string): string[] {
  const accessibleTiers = [];
  
  for (const [tierName] of Object.entries(PERMISSION_TIERS)) {
    if (isModuleAccessible(appCode, moduleCode, tierName as TierKey)) {
      accessibleTiers.push(tierName);
    }
  }
  
  return accessibleTiers;
}

/**
 * Validates if a subscription upgrade/downgrade is allowed
 */
export function validateTierChange(fromTier: TierKey, toTier: TierKey, currentModules: CurrentModulesMap): ValidateTierChangeResult {
  const fromAccess = PERMISSION_TIERS[fromTier];
  const toAccess = PERMISSION_TIERS[toTier];
  
  if (!fromAccess || !toAccess) {
    throw new Error('Invalid subscription tier: ' + fromTier + ' to ' + toTier);
  }
  
  // Check if downgrade would remove access to currently used modules
  const warnings: TierChangeWarning[] = [];
  const errors: string[] = [];
  
  for (const [appCode, modules] of Object.entries(currentModules)) {
    const newAccessibleModules = getAccessibleModules(appCode, toTier);
    
    if (newAccessibleModules !== 'all') {
      const removedModules = (modules as string[]).filter((module: string) => 
        !newAccessibleModules.includes(module)
      );
      
      if (removedModules.length > 0) {
        warnings.push({
          app: appCode,
          removedModules,
          message: `Access to ${removedModules.join(', ')} will be removed`
        });
      }
    }
  }
  
  return { warnings, errors, allowed: errors.length === 0 };
}

export default PERMISSION_TIERS;
