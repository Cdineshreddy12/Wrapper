// Main dashboard component
export { RoleManagementDashboard } from './RoleManagementDashboard';

// Individual components
export { RoleFilters } from './components/RoleFilters';
export { RoleRow } from './components/RoleRow';
export { RoleTableHeader } from './components/RoleTableHeader';
export { BulkActions } from './components/BulkActions';
export { RoleDetailsModal } from './components/RoleDetailsModal';
export { DeleteRoleModal } from './components/DeleteRoleModal';
export { RoleEmptyState } from './components/RoleEmptyState';
export { RoleLoadingState } from './components/RoleLoadingState';
export { EnhancedPermissionSummary } from './components/EnhancedPermissionSummary';

// Hooks
export { useRoles, useRole, useRoleMutations, roleKeys } from './hooks/useRoleQueries';

// Utils
export { 
  getPermissionSummary, 
  getPermissionTypeColor, 
  getPermissionTypeTextColor, 
  formatRoleDate, 
  canEditRole, 
  canDeleteRole 
} from './utils/permissionUtils';

// Types
export type {
  DashboardRole,
  PermissionSummary,
  RoleFilters,
  RoleListResponse,
  RoleFormData,
  BulkAction,
  RoleTableColumn,
  RoleRowActions,
  RoleSelection,
} from '@/types/role-management';
