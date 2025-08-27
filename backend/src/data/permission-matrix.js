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
      icon: '🎫',
      baseUrl: 'https://crm.zopkit.com',
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
          { code: 'assign', name: 'Assign Leads', description: 'Assign leads to other users' },
          { code: 'convert', name: 'Convert Leads', description: 'Convert leads to opportunities' }
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
          { code: 'import', name: 'Import Accounts', description: 'Import accounts from files' },
          { code: 'assign', name: 'Assign Accounts', description: 'Assign accounts to other users' }
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
          { code: 'close', name: 'Close Opportunities', description: 'Mark opportunities as won/lost' },
          { code: 'assign', name: 'Assign Opportunities', description: 'Assign opportunities to other users' }
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
          { code: 'approve', name: 'Approve Quotations', description: 'Approve quotations for sending' },
          { code: 'assign', name: 'Assign Quotations', description: 'Assign quotations to other users' }
        ]
      },

      // 🧾 INVOICES MODULE - NEW
      invoices: {
        moduleCode: 'invoices',
        moduleName: 'Invoice Management',
        description: 'Create and manage customer invoices',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Invoices', description: 'View invoice information' },
          { code: 'read_all', name: 'View All Invoices', description: 'View all invoices in organization' },
          { code: 'create', name: 'Create Invoices', description: 'Create new invoices' },
          { code: 'update', name: 'Edit Invoices', description: 'Modify invoice information' },
          { code: 'delete', name: 'Delete Invoices', description: 'Remove invoices' },
          { code: 'send', name: 'Send Invoices', description: 'Send invoices to customers' },
          { code: 'mark_paid', name: 'Mark as Paid', description: 'Mark invoices as paid' },
          { code: 'generate_pdf', name: 'Generate PDF', description: 'Generate PDF versions' },
          { code: 'export', name: 'Export Invoices', description: 'Export invoice data' },
          { code: 'import', name: 'Import Invoices', description: 'Import invoices from files' }
        ]
      },

      // 📦 INVENTORY MODULE - NEW
      inventory: {
        moduleCode: 'inventory',
        moduleName: 'Inventory Management',
        description: 'Manage product inventory and stock levels',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Inventory', description: 'View inventory information' },
          { code: 'read_all', name: 'View All Inventory', description: 'View all inventory items' },
          { code: 'create', name: 'Create Inventory Items', description: 'Add new inventory items' },
          { code: 'update', name: 'Edit Inventory', description: 'Modify inventory information' },
          { code: 'delete', name: 'Delete Inventory', description: 'Remove inventory items' },
          { code: 'adjust', name: 'Adjust Stock Levels', description: 'Adjust inventory quantities' },
          { code: 'movement', name: 'Track Movements', description: 'Track inventory movements' },
          { code: 'export', name: 'Export Inventory', description: 'Export inventory data' },
          { code: 'import', name: 'Import Inventory', description: 'Import inventory from files' },
          { code: 'low_stock_alerts', name: 'Low Stock Alerts', description: 'Set up low stock notifications' }
        ]
      },

      // 🛒 PRODUCT ORDERS MODULE - NEW
      product_orders: {
        moduleCode: 'product_orders',
        moduleName: 'Product Order Management',
        description: 'Manage product orders and fulfillment',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Product Orders', description: 'View product order information' },
          { code: 'read_all', name: 'View All Product Orders', description: 'View all product orders' },
          { code: 'create', name: 'Create Product Orders', description: 'Create new product orders' },
          { code: 'update', name: 'Edit Product Orders', description: 'Modify order information' },
          { code: 'delete', name: 'Delete Product Orders', description: 'Remove product orders' },
          { code: 'process', name: 'Process Orders', description: 'Process and fulfill orders' },
          { code: 'export', name: 'Export Orders', description: 'Export order data' },
          { code: 'import', name: 'Import Orders', description: 'Import orders from files' }
        ]
      },

      // 🎫 TICKETS MODULE - NEW
      tickets: {
        moduleCode: 'tickets',
        moduleName: 'Support Ticket Management',
        description: 'Manage customer support tickets and issues',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Tickets', description: 'View ticket information' },
          { code: 'read_all', name: 'View All Tickets', description: 'View all tickets in organization' },
          { code: 'create', name: 'Create Tickets', description: 'Create new support tickets' },
          { code: 'update', name: 'Edit Tickets', description: 'Modify ticket information' },
          { code: 'delete', name: 'Delete Tickets', description: 'Remove tickets' },
          { code: 'assign', name: 'Assign Tickets', description: 'Assign tickets to agents' },
          { code: 'resolve', name: 'Resolve Tickets', description: 'Mark tickets as resolved' },
          { code: 'escalate', name: 'Escalate Tickets', description: 'Escalate urgent tickets' },
          { code: 'export', name: 'Export Tickets', description: 'Export ticket data' },
          { code: 'import', name: 'Import Tickets', description: 'Import tickets from files' }
        ]
      },

      // 📞 COMMUNICATIONS MODULE - NEW
      communications: {
        moduleCode: 'communications',
        moduleName: 'Communication Management',
        description: 'Manage customer communications and interactions',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Communications', description: 'View communication history' },
          { code: 'read_all', name: 'View All Communications', description: 'View all communications' },
          { code: 'create', name: 'Create Communications', description: 'Create new communications' },
          { code: 'update', name: 'Edit Communications', description: 'Modify communication content' },
          { code: 'delete', name: 'Delete Communications', description: 'Remove communications' },
          { code: 'send', name: 'Send Communications', description: 'Send communications to customers' },
          { code: 'schedule', name: 'Schedule Communications', description: 'Schedule future communications' },
          { code: 'export', name: 'Export Communications', description: 'Export communication data' },
          { code: 'import', name: 'Import Communications', description: 'Import communications from files' }
        ]
      },

      // 📅 CALENDAR MODULE - NEW
      calendar: {
        moduleCode: 'calendar',
        moduleName: 'Calendar Management',
        description: 'Manage appointments, meetings, and schedules',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Calendar', description: 'View calendar events' },
          { code: 'read_all', name: 'View All Events', description: 'View all calendar events' },
          { code: 'create', name: 'Create Events', description: 'Create new calendar events' },
          { code: 'update', name: 'Edit Events', description: 'Modify event information' },
          { code: 'delete', name: 'Delete Events', description: 'Remove calendar events' },
          { code: 'share', name: 'Share Events', description: 'Share events with others' },
          { code: 'export', name: 'Export Calendar', description: 'Export calendar data' },
          { code: 'import', name: 'Import Events', description: 'Import events from files' }
        ]
      },

      // 🤖 AI INSIGHTS MODULE - NEW
      ai_insights: {
        moduleCode: 'ai_insights',
        moduleName: 'AI Insights & Analytics',
        description: 'AI-powered insights and predictive analytics',
        isCore: false,
        permissions: [
          { code: 'read', name: 'View AI Insights', description: 'View AI-generated insights' },
          { code: 'read_all', name: 'View All Insights', description: 'View all AI insights' },
          { code: 'create', name: 'Generate Insights', description: 'Generate new AI insights' },
          { code: 'update', name: 'Update Insights', description: 'Modify AI insights' },
          { code: 'delete', name: 'Delete Insights', description: 'Remove AI insights' },
          { code: 'export', name: 'Export Insights', description: 'Export insight data' },
          { code: 'schedule', name: 'Schedule Insights', description: 'Schedule automated insights' }
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
          { code: 'maintenance_schedule', name: 'Schedule Maintenance', description: 'Schedule maintenance operations' },

          // User Management Permissions - NEW
          { code: 'users_read', name: 'View Users', description: 'View user information' },
          { code: 'users_read_all', name: 'View All Users', description: 'View all users in organization' },
          { code: 'users_create', name: 'Create Users', description: 'Create new user accounts' },
          { code: 'users_update', name: 'Edit Users', description: 'Modify user information' },
          { code: 'users_delete', name: 'Delete Users', description: 'Remove user accounts' },
          { code: 'users_activate', name: 'Activate Users', description: 'Activate/deactivate users' },
          { code: 'users_reset_password', name: 'Reset Passwords', description: 'Reset user passwords' },
          { code: 'users_export', name: 'Export Users', description: 'Export user data' },
          { code: 'users_import', name: 'Import Users', description: 'Import users from files' },

          // Role Management Permissions - NEW
          { code: 'roles_read', name: 'View Roles', description: 'View role information' },
          { code: 'roles_read_all', name: 'View All Roles', description: 'View all roles in organization' },
          { code: 'roles_create', name: 'Create Roles', description: 'Create new roles' },
          { code: 'roles_update', name: 'Edit Roles', description: 'Modify role information' },
          { code: 'roles_delete', name: 'Delete Roles', description: 'Remove roles' },
          { code: 'roles_assign', name: 'Assign Roles', description: 'Assign roles to users' },
          { code: 'roles_export', name: 'Export Roles', description: 'Export role data' },

          // Activity Logs Permissions - NEW

          // Reports Permissions - NEW
          { code: 'reports_read', name: 'View Reports', description: 'View report information' },
          { code: 'reports_read_all', name: 'View All Reports', description: 'View all reports' },
          { code: 'reports_create', name: 'Create Reports', description: 'Create new reports' },
          { code: 'reports_update', name: 'Edit Reports', description: 'Modify existing reports' },
          { code: 'reports_delete', name: 'Delete Reports', description: 'Remove reports' },
          { code: 'reports_export', name: 'Export Reports', description: 'Export report data' },
          { code: 'reports_schedule', name: 'Schedule Reports', description: 'Schedule automated reports' },

          // 🔍 COMPREHENSIVE AUDIT PERMISSIONS - NEW
          { code: 'audit_read', name: 'View Audit Logs', description: 'View basic audit log information' },
          { code: 'audit_read_all', name: 'View All Audit Logs', description: 'View all audit logs in organization' },
          { code: 'audit_export', name: 'Export Audit Logs', description: 'Export audit log data to various formats' },
          { code: 'audit_view_details', name: 'View Audit Details', description: 'View detailed audit log information' },
          { code: 'audit_filter_by_user', name: 'Filter by User', description: 'Filter audit logs by specific user' },
          { code: 'audit_filter_by_action', name: 'Filter by Action', description: 'Filter audit logs by specific action' },
          { code: 'audit_filter_by_date_range', name: 'Filter by Date Range', description: 'Filter audit logs by date range' },
          { code: 'audit_filter_by_module', name: 'Filter by Module', description: 'Filter audit logs by specific module' },
          { code: 'audit_filter_by_status', name: 'Filter by Status', description: 'Filter audit logs by status' },
          { code: 'audit_generate_reports', name: 'Generate Reports', description: 'Generate audit reports' },
          { code: 'audit_archive_logs', name: 'Archive Logs', description: 'Archive old audit logs' },
          { code: 'audit_purge_old_logs', name: 'Purge Old Logs', description: 'Purge old audit logs' },
          { code: 'audit_trail_export', name: 'Export Audit Trail', description: 'Export complete audit trail' },

          // 📊 ACTIVITY LOGS PERMISSIONS - NEW
          { code: 'activity_logs_read', name: 'View Activity Logs', description: 'View activity log information' },
          { code: 'activity_logs_read_all', name: 'View All Activity Logs', description: 'View all activity logs in organization' },
          { code: 'activity_logs_export', name: 'Export Activity Logs', description: 'Export activity log data' },
          { code: 'activity_logs_view_details', name: 'View Activity Details', description: 'View detailed activity information' },
          { code: 'activity_logs_filter_by_user', name: 'Filter by User', description: 'Filter activity logs by specific user' },
          { code: 'activity_logs_filter_by_action', name: 'Filter by Action', description: 'Filter activity logs by specific action' },
          { code: 'activity_logs_filter_by_date_range', name: 'Filter by Date Range', description: 'Filter activity logs by date range' },
          { code: 'activity_logs_filter_by_module', name: 'Filter by Module', description: 'Filter activity logs by specific module' },
          { code: 'activity_logs_filter_by_status', name: 'Filter by Status', description: 'Filter activity logs by status' },
          { code: 'activity_logs_generate_reports', name: 'Generate Reports', description: 'Generate activity log reports' },
          { code: 'activity_logs_archive_logs', name: 'Archive Logs', description: 'Archive old activity logs' },
          { code: 'activity_logs_purge_old_logs', name: 'Purge Old Logs', description: 'Purge old activity logs' },
          { code: 'activity_logs_audit_trail_export', name: 'Export Audit Trail', description: 'Export complete activity audit trail' },

          // 👤 USER ACTIVITY TRACKING PERMISSIONS - NEW
          { code: 'user_activity_read', name: 'View User Activity', description: 'View user activity information' },
          { code: 'user_activity_read_all', name: 'View All User Activity', description: 'View all user activity in organization' },
          { code: 'user_activity_export', name: 'Export User Activity', description: 'Export user activity data' },
          { code: 'user_activity_view_details', name: 'View Activity Details', description: 'View detailed user activity information' },
          { code: 'user_activity_track_login_logout', name: 'Track Login/Logout', description: 'Track user login and logout events' },
          { code: 'user_activity_track_page_views', name: 'Track Page Views', description: 'Track user page view events' },
          { code: 'user_activity_track_actions', name: 'Track Actions', description: 'Track user action events' },
          { code: 'user_activity_track_data_changes', name: 'Track Data Changes', description: 'Track user data change events' },
          { code: 'user_activity_generate_user_reports', name: 'Generate User Reports', description: 'Generate user activity reports' },
          { code: 'user_activity_filter_by_user', name: 'Filter by User', description: 'Filter user activity by specific user' },
          { code: 'user_activity_filter_by_date_range', name: 'Filter by Date Range', description: 'Filter user activity by date range' },

          // 🔄 DATA CHANGE TRACKING PERMISSIONS - NEW
          { code: 'data_changes_read', name: 'View Data Changes', description: 'View data change information' },
          { code: 'data_changes_read_all', name: 'View All Data Changes', description: 'View all data changes in organization' },
          { code: 'data_changes_export', name: 'Export Data Changes', description: 'Export data change information' },
          { code: 'data_changes_view_details', name: 'View Change Details', description: 'View detailed data change information' },
          { code: 'data_changes_track_creates', name: 'Track Creates', description: 'Track data creation events' },
          { code: 'data_changes_track_updates', name: 'Track Updates', description: 'Track data update events' },
          { code: 'data_changes_track_deletes', name: 'Track Deletes', description: 'Track data deletion events' },
          { code: 'data_changes_track_field_changes', name: 'Track Field Changes', description: 'Track individual field change events' },
          { code: 'data_changes_track_relationship_changes', name: 'Track Relationship Changes', description: 'Track relationship change events' },
          { code: 'data_changes_generate_change_reports', name: 'Generate Change Reports', description: 'Generate data change reports' },
          { code: 'data_changes_filter_by_table', name: 'Filter by Table', description: 'Filter data changes by specific table' },
          { code: 'data_changes_filter_by_user', name: 'Filter by User', description: 'Filter data changes by specific user' },
          { code: 'data_changes_filter_by_date_range', name: 'Filter by Date Range', description: 'Filter data changes by date range' }
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
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'invoices', 'inventory', 'product_orders', 'tickets', 'communications', 'calendar', 'dashboard', 'system'],
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