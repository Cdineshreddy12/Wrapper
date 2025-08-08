// 🎯 **BUSINESS SUITE PERMISSION MATRIX**
// This file defines all applications, their modules, and permissions
// Run `npm run sync-permissions` to update the database

export const BUSINESS_SUITE_MATRIX = {
  // 📊 **CRM APPLICATION**
  crm: {
    appInfo: {
      appCode: 'crm',
      appName: 'Customer Relationship Management',
      description: 'Complete CRM solution for managing customers, deals, and sales pipeline',
      icon: '💼',
      baseUrl: 'http://localhost:3002',
      version: '2.0.0',
      isCore: true,
      sortOrder: 1
    },
    modules: {
      // 📊 LEADS MODULE
      leads: {
        moduleCode: 'leads',
        moduleName: 'Lead Management',
        description: 'Manage sales leads and prospects',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Leads', description: 'View and browse lead information' },
          { code: 'read_all', name: 'View All Leads', description: 'View all leads in organization' },
          { code: 'create', name: 'Create Leads', description: 'Add new leads to the system' },
          { code: 'update', name: 'Edit Leads', description: 'Modify existing lead information' },
          { code: 'delete', name: 'Delete Leads', description: 'Remove leads from the system' },
          { code: 'export', name: 'Export Leads', description: 'Export lead data to various formats' },
          { code: 'import', name: 'Import Leads', description: 'Import leads from external files' },
          { code: 'assign', name: 'Assign Leads', description: 'Assign leads to other users' }
        ]
      },
      
      // 🏢 ACCOUNTS MODULE
      accounts: {
        moduleCode: 'accounts',
        moduleName: 'Account Management',
        description: 'Manage customer accounts and companies',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Accounts', description: 'View and browse account information' },
          { code: 'read_all', name: 'View All Accounts', description: 'View all accounts in organization' },
          { code: 'create', name: 'Create Accounts', description: 'Add new accounts to the system' },
          { code: 'update', name: 'Edit Accounts', description: 'Modify existing account information' },
          { code: 'delete', name: 'Delete Accounts', description: 'Remove accounts from the system' },
          { code: 'view_contacts', name: 'View Account Contacts', description: 'View contacts associated with accounts' },
          { code: 'export', name: 'Export Accounts', description: 'Export account data' },
          { code: 'import', name: 'Import Accounts', description: 'Import accounts from files' }
        ]
      },
      
      // 👥 CONTACTS MODULE
      contacts: {
        moduleCode: 'contacts',
        moduleName: 'Contact Management',
        description: 'Manage customer contacts and relationships',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Contacts', description: 'View and browse contact information' },
          { code: 'read_all', name: 'View All Contacts', description: 'View all contacts in organization' },
          { code: 'create', name: 'Create Contacts', description: 'Add new contacts to the system' },
          { code: 'update', name: 'Edit Contacts', description: 'Modify existing contact information' },
          { code: 'delete', name: 'Delete Contacts', description: 'Remove contacts from the system' },
          { code: 'export', name: 'Export Contacts', description: 'Export contact data' },
          { code: 'import', name: 'Import Contacts', description: 'Import contacts from files' }
        ]
      },
      
      // 💰 OPPORTUNITIES MODULE
      opportunities: {
        moduleCode: 'opportunities',
        moduleName: 'Opportunity Management',
        description: 'Manage sales opportunities and deals',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Opportunities', description: 'View opportunity information' },
          { code: 'read_all', name: 'View All Opportunities', description: 'View all opportunities in organization' },
          { code: 'create', name: 'Create Opportunities', description: 'Add new opportunities' },
          { code: 'update', name: 'Edit Opportunities', description: 'Modify opportunity information' },
          { code: 'delete', name: 'Delete Opportunities', description: 'Remove opportunities' },
          { code: 'export', name: 'Export Opportunities', description: 'Export opportunity data' },
          { code: 'import', name: 'Import Opportunities', description: 'Import opportunities from files' },
          { code: 'close', name: 'Close Opportunities', description: 'Mark opportunities as won/lost' }
        ]
      },
      
      // 📄 QUOTATIONS MODULE
      quotations: {
        moduleCode: 'quotations',
        moduleName: 'Quote Management',
        description: 'Create and manage sales quotations',
        isCore: false,
        permissions: [
          { code: 'read', name: 'View Quotations', description: 'View quotation information' },
          { code: 'read_all', name: 'View All Quotations', description: 'View all quotations in organization' },
          { code: 'create', name: 'Create Quotations', description: 'Create new quotations' },
          { code: 'update', name: 'Edit Quotations', description: 'Modify quotation information' },
          { code: 'delete', name: 'Delete Quotations', description: 'Remove quotations' },
          { code: 'generate_pdf', name: 'Generate PDF', description: 'Generate PDF versions of quotations' },
          { code: 'send', name: 'Send Quotations', description: 'Send quotations to customers' },
          { code: 'approve', name: 'Approve Quotations', description: 'Approve quotations for sending' }
        ]
      },
      
      // 📊 DASHBOARD MODULE
      dashboard: {
        moduleCode: 'dashboard',
        moduleName: 'CRM Dashboard',
        description: 'CRM analytics and reporting dashboard',
        isCore: true,
        permissions: [
          { code: 'view', name: 'View Dashboard', description: 'Access CRM dashboard' },
          { code: 'customize', name: 'Customize Dashboard', description: 'Customize dashboard layout and widgets' },
          { code: 'export', name: 'Export Reports', description: 'Export dashboard reports' }
        ]
      },
      
      // ⚙️ SYSTEM MODULE
      system: {
        moduleCode: 'system',
        moduleName: 'System Configuration',
        description: 'System administration and configuration management',
        isCore: true,
        permissions: [
          // Settings Permissions
          { code: 'settings_read', name: 'View Settings', description: 'View system settings and configurations' },
          { code: 'settings_update', name: 'Update Settings', description: 'Update system settings' },
          { code: 'settings_manage', name: 'Manage Settings', description: 'Full control over system settings' },
          
          // Configuration Permissions
          { code: 'configurations_read', name: 'View Configurations', description: 'View system configurations' },
          { code: 'configurations_create', name: 'Create Configurations', description: 'Create new system configurations' },
          { code: 'configurations_update', name: 'Update Configurations', description: 'Update existing configurations' },
          { code: 'configurations_delete', name: 'Delete Configurations', description: 'Delete system configurations' },
          { code: 'configurations_manage', name: 'Manage Configurations', description: 'Full control over system configurations' },
          
          // Tenant Configuration Permissions
          { code: 'tenant_config_read', name: 'View Tenant Config', description: 'View tenant-specific configurations' },
          { code: 'tenant_config_update', name: 'Update Tenant Config', description: 'Update tenant configurations' },
          { code: 'tenant_config_manage', name: 'Manage Tenant Config', description: 'Full control over tenant configurations' },
          
          // System Configuration Permissions
          { code: 'system_config_read', name: 'View System Config', description: 'View system-level configurations' },
          { code: 'system_config_update', name: 'Update System Config', description: 'Update system-level configurations' },
          { code: 'system_config_manage', name: 'Manage System Config', description: 'Full control over system-level configurations' },
          
          // Dropdown Permissions
          { code: 'dropdowns_read', name: 'View Dropdowns', description: 'View system dropdown values' },
          { code: 'dropdowns_create', name: 'Create Dropdowns', description: 'Create new dropdown values' },
          { code: 'dropdowns_update', name: 'Update Dropdowns', description: 'Update dropdown values' },
          { code: 'dropdowns_delete', name: 'Delete Dropdowns', description: 'Delete dropdown values' },
          { code: 'dropdowns_manage', name: 'Manage Dropdowns', description: 'Full control over system dropdowns' },
          
          // Integration Permissions
          { code: 'integrations_read', name: 'View Integrations', description: 'View system integrations' },
          { code: 'integrations_create', name: 'Create Integrations', description: 'Create new integrations' },
          { code: 'integrations_update', name: 'Update Integrations', description: 'Update existing integrations' },
          { code: 'integrations_delete', name: 'Delete Integrations', description: 'Delete integrations' },
          { code: 'integrations_manage', name: 'Manage Integrations', description: 'Full control over system integrations' },
          
          // Backup Permissions
          { code: 'backup_read', name: 'View Backups', description: 'View backup information and history' },
          { code: 'backup_create', name: 'Create Backups', description: 'Create system backups' },
          { code: 'backup_restore', name: 'Restore Backups', description: 'Restore system from backups' },
          { code: 'backup_manage', name: 'Manage Backups', description: 'Full control over backup operations' },
          
          // Maintenance Permissions
          { code: 'maintenance_read', name: 'View Maintenance', description: 'View maintenance schedules and status' },
          { code: 'maintenance_perform', name: 'Perform Maintenance', description: 'Execute maintenance operations' },
          { code: 'maintenance_schedule', name: 'Schedule Maintenance', description: 'Schedule maintenance operations' }
        ]
      },
      
    }
  },
  
  // 👥 **HR APPLICATION**
  hr: {
    appInfo: {
      appCode: 'hr',
      appName: 'Human Resources Management',
      description: 'Complete HR solution for employee management and payroll',
      icon: '👥',
      baseUrl: 'http://localhost:3003',
      version: '1.5.0',
      isCore: true,
      sortOrder: 2
    },
    modules: {
      // 👤 EMPLOYEES MODULE
      employees: {
        moduleCode: 'employees',
        moduleName: 'Employee Management',
        description: 'Manage employee records and information',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Employees', description: 'View employee information' },
          { code: 'read_all', name: 'View All Employees', description: 'View all employees in organization' },
          { code: 'create', name: 'Add Employees', description: 'Add new employees to the system' },
          { code: 'update', name: 'Edit Employees', description: 'Modify employee information' },
          { code: 'delete', name: 'Remove Employees', description: 'Remove employees from system' },
          { code: 'view_salary', name: 'View Salary Information', description: 'Access employee salary details' },
          { code: 'export', name: 'Export Employee Data', description: 'Export employee data' }
        ]
      },
      
      // 💰 PAYROLL MODULE
      payroll: {
        moduleCode: 'payroll',
        moduleName: 'Payroll Management',
        description: 'Process payroll and manage compensation',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Payroll', description: 'View payroll information' },
          { code: 'process', name: 'Process Payroll', description: 'Run payroll calculations' },
          { code: 'approve', name: 'Approve Payroll', description: 'Approve payroll for processing' },
          { code: 'export', name: 'Export Payroll', description: 'Export payroll reports' },
          { code: 'generate_reports', name: 'Generate Reports', description: 'Generate payroll reports' }
        ]
      },
      
      // 📅 LEAVE MODULE
      leave: {
        moduleCode: 'leave',
        moduleName: 'Leave Management',
        description: 'Manage employee leave requests and approvals',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Leave Requests', description: 'View leave request information' },
          { code: 'create', name: 'Create Leave Requests', description: 'Submit leave requests' },
          { code: 'approve', name: 'Approve Leave', description: 'Approve leave requests' },
          { code: 'reject', name: 'Reject Leave', description: 'Reject leave requests' },
          { code: 'cancel', name: 'Cancel Leave', description: 'Cancel leave requests' },
          { code: 'export', name: 'Export Leave Data', description: 'Export leave reports' }
        ]
      },
      
      // 📊 HR DASHBOARD MODULE
      dashboard: {
        moduleCode: 'dashboard',
        moduleName: 'HR Dashboard',
        description: 'HR analytics and reporting dashboard',
        isCore: true,
        permissions: [
          { code: 'view', name: 'View Dashboard', description: 'Access HR dashboard' },
          { code: 'customize', name: 'Customize Dashboard', description: 'Customize dashboard layout' },
          { code: 'export', name: 'Export Reports', description: 'Export HR reports' }
        ]
      }
    }
  },
  
  // 🤝 **AFFILIATE APPLICATION**
  affiliate: {
    appInfo: {
      appCode: 'affiliate',
      appName: 'Affiliate Management',
      description: 'Manage affiliate partners and commission tracking',
      icon: '🤝',
      baseUrl: 'http://localhost:3004',
      version: '1.0.0',
      isCore: false,
      sortOrder: 3
    },
    modules: {
      // 🤝 PARTNERS MODULE
      partners: {
        moduleCode: 'partners',
        moduleName: 'Partner Management',
        description: 'Manage affiliate partners and relationships',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Partners', description: 'View partner information' },
          { code: 'create', name: 'Add Partners', description: 'Add new affiliate partners' },
          { code: 'update', name: 'Edit Partners', description: 'Modify partner information' },
          { code: 'delete', name: 'Remove Partners', description: 'Remove affiliate partners' },
          { code: 'approve', name: 'Approve Partners', description: 'Approve new partner applications' },
          { code: 'export', name: 'Export Partner Data', description: 'Export partner data' }
        ]
      },
      
      // 💰 COMMISSIONS MODULE
      commissions: {
        moduleCode: 'commissions',
        moduleName: 'Commission Tracking',
        description: 'Track and manage affiliate commissions',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Commissions', description: 'View commission information' },
          { code: 'calculate', name: 'Calculate Commissions', description: 'Calculate commission amounts' },
          { code: 'approve', name: 'Approve Commissions', description: 'Approve commission payments' },
          { code: 'pay', name: 'Process Payments', description: 'Process commission payments' },
          { code: 'dispute', name: 'Handle Disputes', description: 'Manage commission disputes' },
          { code: 'export', name: 'Export Commission Data', description: 'Export commission reports' }
        ]
      }
    }
  }
};

// 🎯 **PLAN-BASED ACCESS CONTROL**
export const PLAN_ACCESS_MATRIX = {
  trial: {
    applications: ['crm'],
    modules: {
      crm: ['leads', 'contacts', 'dashboard']
    },
    limitations: {
      users: 2,
      roles: 2,
      storage: '1GB',
      apiCalls: 1000
    }
  },
  
  starter: {
    applications: ['crm', 'hr'],
    modules: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'dashboard'],
      hr: ['employees', 'leave', 'dashboard']
    },
    limitations: {
      users: 10,
      roles: 10,
      storage: '10GB',
      apiCalls: 10000
    }
  },
  
  professional: {
    applications: ['crm', 'hr', 'affiliate'],
    modules: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'dashboard', 'system'],
      hr: ['employees', 'payroll', 'leave', 'dashboard'],
      affiliate: ['partners', 'commissions']
    },
    limitations: {
      users: 50,
      roles: 25,
      storage: '100GB',
      apiCalls: 50000
    }
  },
  
  enterprise: {
    applications: ['crm', 'hr', 'affiliate'],
    modules: {
      crm: '*', // All modules
      hr: '*',
      affiliate: '*'
    },
    limitations: {
      users: -1, // Unlimited
      roles: -1,
      storage: 'unlimited',
      apiCalls: -1
    }
  }
};

// 🎯 **ROLE TEMPLATES** - REMOVED
// Templates are no longer needed - roles are created directly from applications/modules

// 🛠️ **UTILITY FUNCTIONS**
export class PermissionMatrixUtils {
  
  // Get all applications from matrix
  static getAllApplications() {
    return Object.keys(BUSINESS_SUITE_MATRIX).map(appCode => ({
      appCode,
      ...BUSINESS_SUITE_MATRIX[appCode].appInfo
    }));
  }
  
  // Get all modules for an application
  static getApplicationModules(appCode) {
    const app = BUSINESS_SUITE_MATRIX[appCode];
    if (!app) return [];
    
    return Object.keys(app.modules).map(moduleCode => ({
      appCode,
      moduleCode,
      ...app.modules[moduleCode]
    }));
  }
  
  // Get all permissions for a module
  static getModulePermissions(appCode, moduleCode) {
    const module = BUSINESS_SUITE_MATRIX[appCode]?.modules[moduleCode];
    if (!module) return [];
    
    return module.permissions.map(permission => ({
      ...permission,
      fullCode: `${appCode}.${moduleCode}.${permission.code}`,
      appCode,
      moduleCode
    }));
  }
  
  // Get permissions for a plan
  static getPlanPermissions(planId) {
    const planAccess = PLAN_ACCESS_MATRIX[planId];
    if (!planAccess) return [];
    
    const permissions = [];
    
    planAccess.applications.forEach(appCode => {
      const appModules = planAccess.modules[appCode];
      
      if (appModules === '*') {
        // All modules for this app
        const allModules = this.getApplicationModules(appCode);
        allModules.forEach(module => {
          const modulePermissions = this.getModulePermissions(appCode, module.moduleCode);
          permissions.push(...modulePermissions);
        });
      } else if (Array.isArray(appModules)) {
        // Specific modules
        appModules.forEach(moduleCode => {
          const modulePermissions = this.getModulePermissions(appCode, moduleCode);
          permissions.push(...modulePermissions);
        });
      }
    });
    
    return permissions;
  }
  
  // Validate permission matrix
  static validateMatrix() {
    const errors = [];
    
    Object.keys(BUSINESS_SUITE_MATRIX).forEach(appCode => {
      const app = BUSINESS_SUITE_MATRIX[appCode];
      
      // Validate app info
      if (!app.appInfo || !app.appInfo.appName) {
        errors.push(`App ${appCode} missing appInfo.appName`);
      }
      
      // Validate modules
      if (!app.modules || Object.keys(app.modules).length === 0) {
        errors.push(`App ${appCode} has no modules defined`);
      } else {
        Object.keys(app.modules).forEach(moduleCode => {
          const module = app.modules[moduleCode];
          
          if (!module.permissions || module.permissions.length === 0) {
            errors.push(`Module ${appCode}.${moduleCode} has no permissions defined`);
          }
          
          module.permissions.forEach(permission => {
            if (!permission.code || !permission.name) {
              errors.push(`Permission in ${appCode}.${moduleCode} missing code or name`);
            }
          });
        });
      }
    });
    
    return errors;
  }
}

export default BUSINESS_SUITE_MATRIX; 