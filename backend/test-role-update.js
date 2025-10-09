#!/usr/bin/env node

import { CustomRoleService } from './src/services/custom-role-service.js';

async function testRoleUpdate() {
  try {
    console.log('🧪 Testing role update with Redis stream publishing...');

    const result = await CustomRoleService.updateRoleFromAppsAndModules({
      tenantId: 'b0a6e370-c1e5-43d1-94e0-55ed792274c4',
      roleId: '567e8b31-104f-488f-8ce5-453c02a052b6',
      roleName: 'crm account manager test 3',
      selectedApps: ['crm'],
      selectedModules: { crm: ['accounts', 'contacts'] },
      selectedPermissions: {
        'crm.accounts': ['read', 'create', 'update', 'delete', 'view_contacts'],
        'crm.contacts': ['read', 'create', 'update', 'delete']
      },
      updatedBy: 'a5c53dc2-fd8a-40ae-8704-59add9cf5d93'
    });

    console.log('✅ Role update successful:', result.roleName);
    console.log('🔍 Check Redis streams for: crm:sync:role_permissions');
  } catch (error) {
    console.error('❌ Role update failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRoleUpdate();
