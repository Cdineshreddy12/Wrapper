import { useState, useCallback, useMemo } from 'react';
import { Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePermissionRefreshTrigger } from '../PermissionRefreshNotification';

// Import our new components
import { RoleFilters } from './components/RoleFilters';
import { RoleTableHeader } from './components/RoleTableHeader';
import { RoleRow } from './components/RoleRow';
import { BulkActions } from './components/BulkActions';
import { RoleDetailsModal } from './components/RoleDetailsModal';
import { DeleteRoleModal } from './components/DeleteRoleModal';
import { RoleEmptyState } from './components/RoleEmptyState';
import { RoleLoadingState } from './components/RoleLoadingState';

// Import hooks and types
import { useRoles, useRoleMutations } from './hooks/useRoleQueries';
import { DashboardRole, RoleFilters as RoleFiltersType, BulkAction } from '@/types/role-management';
import { ApplicationModuleRoleBuilder } from './ApplicationModuleRoleBuilder';
import { Section } from '../common/Page';

export function RoleManagementDashboard() {
  const { triggerRefresh } = usePermissionRefreshTrigger();
  
  // State management
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [showRoleBuilder, setShowRoleBuilder] = useState(false);
  const [showAppModuleBuilder, setShowAppModuleBuilder] = useState(false);
  const [editingRole, setEditingRole] = useState<DashboardRole | null>(null);
  const [viewingRole, setViewingRole] = useState<DashboardRole | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRole, setDeletingRole] = useState<{ id: string; name: string } | null>(null);

  // Filters state
  const [filters, setFilters] = useState<RoleFiltersType>({
    searchQuery: '',
    typeFilter: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 20,
  });

  // Fetch data using TanStack Query
  const { data: rolesData, isLoading } = useRoles(filters);
  const { 
    createRole, 
    updateRole, 
    deleteRole, 
    bulkDeleteRoles,
    isDeleting,
    isBulkDeleting 
  } = useRoleMutations();

  // Derived state
  const roles = rolesData?.roles || [];
  const totalCount = rolesData?.total || 0;
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = role.roleName.toLowerCase().includes(query);
        const matchesDescription = role.description?.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }

      // Type filter
      if (filters.typeFilter !== 'all') {
        if (filters.typeFilter === 'system' && !role.isSystemRole) return false;
        if (filters.typeFilter === 'custom' && role.isSystemRole) return false;
      }

      return true;
    });
  }, [roles, filters.searchQuery, filters.typeFilter]);

  // Event handlers
  const handleFiltersChange = useCallback((newFilters: Partial<RoleFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      typeFilter: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      pageSize: 20,
    });
  }, []);

  const handleCreateRole = useCallback(() => {
    setEditingRole(null);
    setShowAppModuleBuilder(true);
  }, []);

  const handleEditRole = useCallback(async (role: DashboardRole) => {
    // Check if it's a system role
    if (role.isSystemRole) {
      if (role.roleName === 'Super Administrator') {
        // toast.error('Super Administrator role cannot be edited. This role has predefined comprehensive permissions.');
        return;
      } else {
        // toast.error('System roles cannot be edited. Please create a custom role instead.');
        return;
      }
    }
    
    setEditingRole(role);
    setShowAppModuleBuilder(true);
  }, []);

  const handleViewRole = useCallback((role: DashboardRole) => {
    setViewingRole(role);
    setShowViewModal(true);
  }, []);

  const handleCloneRole = useCallback(async (role: DashboardRole) => {
    try {
      // Create a cloned role object
      const clonedRole = {
        ...role,
        roleId: undefined, // Remove roleId so it creates a new one
        roleName: `${role.roleName} (Copy)`,
        isSystemRole: false, // Clones are always custom roles
        isDefault: false, // Clones are never default roles
        createdAt: undefined,
        updatedAt: undefined
      };
      
      setEditingRole(clonedRole as any);
      setShowAppModuleBuilder(true);
    } catch (error) {
      console.error('Failed to clone role:', error);
    }
  }, []);

  const handleDeleteRole = useCallback((role: DashboardRole) => {
    setDeletingRole({ id: role.roleId, name: role.roleName });
    setShowDeleteModal(true);
  }, []);

  const confirmDeleteRole = useCallback(async () => {
    if (!deletingRole) return;
    
    try {
      await deleteRole(deletingRole.id);
      setSelectedRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingRole.id);
        return newSet;
      });
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete role:', error);
    } finally {
      setShowDeleteModal(false);
      setDeletingRole(null);
    }
  }, [deletingRole, deleteRole, triggerRefresh]);

  const handleBulkAction = useCallback(async (action: BulkAction, selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    
    try {
      switch (action) {
        case 'delete':
          await bulkDeleteRoles(selectedIds);
          break;
        case 'export':
          // Implementation for export functionality
          console.log('Export feature coming soon!');
          break;
        case 'deactivate':
          // Implementation for deactivate functionality
          console.log('Deactivate feature coming soon!');
          break;
        default:
          return;
      }
      
      setSelectedRoles(new Set());
      triggerRefresh();
    } catch (error) {
      console.error(`Failed to ${action} roles:`, error);
    }
  }, [bulkDeleteRoles, triggerRefresh]);

  const handleRoleSave = useCallback(async (roleData: any) => {
    // Check if this is a success callback from ApplicationModuleRoleBuilder
    const isSuccessCallback = roleData.roleId && (roleData.selectedApps || roleData.roleName);
    
    if (isSuccessCallback) {
      // The role has already been created/updated, just refresh and close
      setShowRoleBuilder(false);
      setShowAppModuleBuilder(false);
      setEditingRole(null);
      return;
    }
    
    try {
      if (editingRole) {
        await updateRole({ roleId: editingRole.roleId, roleData });
      } else {
        await createRole(roleData);
      }
      
      setShowRoleBuilder(false);
      setShowAppModuleBuilder(false);
      setEditingRole(null);
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  }, [editingRole, createRole, updateRole]);

  // Selection handlers
  const toggleRoleSelection = useCallback((roleId: string) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  }, []);

  const selectAllRoles = useCallback(() => {
    setSelectedRoles(new Set(roles.map(r => r.roleId)));
  }, [roles]);

  const clearSelection = useCallback(() => {
    setSelectedRoles(new Set());
  }, []);

  // Role row actions
  const roleRowActions = useMemo(() => ({
    onEdit: handleEditRole,
    onView: handleViewRole,
    onClone: handleCloneRole,
    onDelete: handleDeleteRole,
  }), [handleEditRole, handleViewRole, handleCloneRole, handleDeleteRole]);

  // Show role builder if needed
  if (showAppModuleBuilder) {
    return (
      <ApplicationModuleRoleBuilder
        initialRole={editingRole}
        onSave={handleRoleSave}
        onCancel={() => {
          setShowAppModuleBuilder(false);
          setEditingRole(null);
        }}
      />
    );
  }

  if (showRoleBuilder) {
    return (
      <ApplicationModuleRoleBuilder
        initialRole={editingRole}
        onSave={handleRoleSave}
        onCancel={() => {
          setShowRoleBuilder(false);
          setEditingRole(null);
        }}
      />
    );
  }

  return (
    <Section 
    title="Role Management" 
    description="Manage roles, permissions, and access control"
    showDivider={true}
    headerActions={[
      {
        label: "Build Role from Apps",
        onClick: handleCreateRole,
        icon: Building,
      }
    ]}
    >
      {/* Filters */}
      <RoleFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        totalCount={totalCount}
        filteredCount={filteredRoles.length}
      />

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedRoles.size}
        totalCount={filteredRoles.length}
        onBulkAction={handleBulkAction}
        onClearSelection={clearSelection}
        selectedRoleIds={Array.from(selectedRoles)}
        isLoading={isBulkDeleting}
      />

      {/* Roles List */}
      <Card>
        {isLoading ? (
          <RoleLoadingState />
        ) : (
          <>
            {/* Table Header */}
            <RoleTableHeader
              totalRoles={filteredRoles.length}
              selectedCount={selectedRoles.size}
              onSelectAll={selectAllRoles}
              onClearSelection={clearSelection}
            />

            {/* Roles List */}
            <div className="divide-y divide-gray-200">
              {filteredRoles.length === 0 ? (
                <RoleEmptyState
                  hasFilters={filters.searchQuery !== '' || filters.typeFilter !== 'all'}
                  onCreateRole={handleCreateRole}
                />
              ) : (
                filteredRoles.map((role) => (
                  <RoleRow
                    key={role.roleId}
                    role={role}
                    isSelected={selectedRoles.has(role.roleId)}
                    onToggleSelect={() => toggleRoleSelection(role.roleId)}
                    actions={roleRowActions}
                  />
                ))
              )}
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <RoleDetailsModal
        role={viewingRole}
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
      />

      <DeleteRoleModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteRole}
        roleName={deletingRole?.name || ''}
        isLoading={isDeleting}
      />
    </Section>
  );
}