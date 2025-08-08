import React, { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  Users, 
  Shield, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  Settings,
  CheckSquare,
  Square,
  RefreshCw,
  Archive,
  AlertTriangle,
  Grid3X3,
  List,
  Activity,
  TrendingUp,
  PieChart,
  ChevronDown,
  Calendar,
  Clock,
  Globe,
  Database,
  X,
  Building,
  Check,
  Info,
  Package,
  Layers
} from 'lucide-react';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ApplicationModuleRoleBuilder } from './ApplicationModuleRoleBuilder';
import { EnhancedPermissionSummary } from './EnhancedPermissionSummary';
import api, { Role } from '@/lib/api';
import { usePermissionRefreshTrigger } from '../PermissionRefreshNotification';
import { cacheHelpers } from '../../lib/cache';
import { useOptimizedQuery } from '../../hooks/useOptimizedQuery';

type DashboardRole = Role;

const getPermissionSummary = (permissions: Record<string, any> | string[]) => {
  // Handle hierarchical permissions (like Super Administrator)
  if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
    const hierarchicalPerms = permissions as Record<string, any>;
    let totalOperations = 0;
    const mainModules: string[] = [];
    const subModules: string[] = [];

    // Process hierarchical structure like { crm: { leads: [...] } }
    Object.entries(hierarchicalPerms).forEach(([moduleKey, moduleData]) => {
      if (moduleKey === 'metadata') return; // Skip metadata
      
      if (moduleData && typeof moduleData === 'object') {
        mainModules.push(moduleKey);
        
        // Count permissions within each sub-module
        Object.entries(moduleData).forEach(([subModuleKey, operations]) => {
          if (Array.isArray(operations)) {
            const subModuleName = `${moduleKey}.${subModuleKey}`;
            subModules.push(subModuleName);
            totalOperations += operations.length;
          }
        });
      }
    });
    
    return {
      totalPermissions: totalOperations,
      apps: mainModules.length,
      modules: subModules.length
    };
  }
  
  // Handle flat array permissions
  if (Array.isArray(permissions)) {
    const apps = new Set(permissions.map(p => p.split('.')[0]));
    const modules = new Set(permissions.map(p => `${p.split('.')[0]}.${p.split('.')[1]}`));
    
    return {
      totalPermissions: permissions.length,
      apps: apps.size,
      modules: modules.size
    };
  }
  
  // Handle legacy object format
  if (typeof permissions === 'object' && permissions !== null) {
    const appModules = Object.keys(permissions);
    const apps = new Set(appModules.map(key => key.split('.')[0]));
    let totalOps = 0;
    
    appModules.forEach(moduleKey => {
      const modulePerms = permissions[moduleKey];
      if (modulePerms?.operations?.length) {
        totalOps += modulePerms.operations.length;
      }
    });
    
    return {
      totalPermissions: totalOps || appModules.length,
      apps: apps.size,
      modules: appModules.length
    };
  }
  
  return { totalPermissions: 0, apps: 0, modules: 0 };
};

export function OptimizedRoleManagementDashboard() {
  const { triggerRefresh } = usePermissionRefreshTrigger();
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [showRoleBuilder, setShowRoleBuilder] = useState(false);
  const [showAppModuleBuilder, setShowAppModuleBuilder] = useState(false);
  const [editingRole, setEditingRole] = useState<DashboardRole | null>(null);
  const [viewingRole, setViewingRole] = useState<DashboardRole | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRole, setDeletingRole] = useState<{ id: string; name: string } | null>(null);
  
  // Enhanced filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'custom' | 'system'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'users' | 'modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Optimized data fetching with smart caching
  const {
    data: rolesData,
    isLoading,
    error,
    refetch: refetchRoles,
    invalidate: invalidateRoles,
    isCached,
    cacheAge
  } = useOptimizedQuery({
    queryKey: ['roles', searchQuery, typeFilter, currentPage, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      console.log('🌐 Fetching roles from API with filters:', {
        searchQuery, typeFilter, currentPage, pageSize, sortBy, sortOrder
      });
      
      const response = await api.get('/roles', {
        params: {
          search: searchQuery || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          page: currentPage,
          limit: pageSize,
          sort: sortBy,
          order: sortOrder
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load roles');
      }
      
      return response.data.data;
    },
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    onSuccess: (data) => {
      console.log('✅ Roles loaded successfully:', data?.roles?.length || 0, 'roles');
    },
    onError: (error) => {
      console.error('❌ Failed to load roles:', error);
      toast.error('Failed to load roles');
    }
  });

  // Extract roles and pagination from cached data
  const roles = rolesData?.roles || [];
  const totalCount = rolesData?.total || 0;
  const totalPages = rolesData?.pagination?.totalPages || 1;

  const handleCreateRole = useCallback(() => {
    setEditingRole(null);
    setShowAppModuleBuilder(true);
  }, []);

  const handleEditRole = useCallback(async (role: DashboardRole) => {
    console.log('✏️ Editing role:', role.roleId, role.roleName);
    setEditingRole(role);
    setShowAppModuleBuilder(true);
  }, []);

  const handleViewRole = useCallback((role: DashboardRole) => {
    setViewingRole(role);
    setShowViewModal(true);
  }, []);

  const handleCloneRole = useCallback(async (role: Role) => {
    try {
      const clonedRole = {
        ...role,
        roleName: `${role.roleName} (Copy)`,
        roleId: undefined, // Remove ID so it creates new
      };
      
      setEditingRole(clonedRole as DashboardRole);
      setShowAppModuleBuilder(true);
      
      toast.success('Role ready for cloning. Modify as needed and save.');
    } catch (error) {
      console.error('Failed to clone role:', error);
      toast.error('Failed to clone role');
    }
  }, []);

  const handleDeleteRole = useCallback((roleId: string, roleName: string) => {
    setDeletingRole({ id: roleId, name: roleName });
    setShowDeleteModal(true);
  }, []);

  const confirmDeleteRole = useCallback(async () => {
    if (!deletingRole) return;
    
    try {
      const response = await api.delete(`/roles/${deletingRole.id}`);
      
      if (response.data.success) {
        toast.success(`Role "${deletingRole.name}" deleted successfully`);
        
        // Invalidate cache and refetch
        cacheHelpers.invalidateRoles();
        invalidateRoles();
        
        // Clear selection if deleted role was selected
        setSelectedRoles(prev => {
          const newSet = new Set(prev);
          newSet.delete(deletingRole.id);
          return newSet;
        });
        
        // Trigger permission refresh
        triggerRefresh();
      } else {
        toast.error(response.data.message || 'Failed to delete role');
      }
    } catch (error: any) {
      console.error('Failed to delete role:', error);
      toast.error(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setShowDeleteModal(false);
      setDeletingRole(null);
    }
  }, [deletingRole, invalidateRoles, triggerRefresh]);

  const handleBulkAction = useCallback(async (action: string, selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      toast.error('No roles selected');
      return;
    }
    
    try {
      switch (action) {
        case 'delete':
          for (const roleId of selectedIds) {
            await api.delete(`/roles/${roleId}`);
          }
          toast.success(`${selectedIds.length} roles deleted successfully`);
          break;
        case 'export':
          toast.success('Export feature coming soon!');
          break;
        case 'deactivate':
          toast.success('Deactivate feature coming soon!');
          break;
        default:
          toast.error('Unknown action');
          return;
      }
      
      // Invalidate cache and refetch
      cacheHelpers.invalidateRoles();
      invalidateRoles();
      
      // Clear selection
      setSelectedRoles(new Set());
      
      // Trigger permission refresh
      triggerRefresh();
    } catch (error) {
      console.error(`Failed to ${action} roles:`, error);
      toast.error(`Failed to ${action} roles`);
    }
  }, [invalidateRoles, triggerRefresh]);

  const handleRoleSave = useCallback(async (roleData: any) => {
    console.log('🎯 handleRoleSave called with data:', roleData);
    console.log('📝 Initial editingRole (if any):', editingRole);
    
    // Check if this is a success callback from ApplicationModuleRoleBuilder
    // (role has already been created/updated successfully)
    const isSuccessCallback = roleData.roleId && (roleData.selectedApps || roleData.roleName);
    
    if (isSuccessCallback) {
      console.log('✅ Role operation completed successfully by ApplicationModuleRoleBuilder');
      console.log('🔄 Refreshing data and closing modal...');
      
      // The role has already been created/updated, just refresh and close
      cacheHelpers.invalidateRoles();
      invalidateRoles();
      
      // Reset state
      setShowRoleBuilder(false);
      setShowAppModuleBuilder(false);
      setEditingRole(null);
      
      // No need for toast - ApplicationModuleRoleBuilder already showed success message
      return;
    }
    
    try {
      let response;
      let payload: any;

      // Check if this data is coming from AdvancedRoleBuilder or ApplicationModuleRoleBuilder
      const isAdvancedRoleBuilder = roleData.permissions && typeof roleData.permissions === 'object' && 
                                   roleData.restrictions && typeof roleData.restrictions === 'object' &&
                                   !roleData.selectedApps;
      
      const isApplicationModuleBuilder = roleData.selectedApps && roleData.selectedModules && roleData.selectedPermissions;

      if (isAdvancedRoleBuilder) {
        payload = {
          name: roleData.name,
          description: roleData.description,
          color: roleData.color,
          icon: roleData.icon,
          permissions: roleData.permissions,
          restrictions: roleData.restrictions,
          inheritance: roleData.inheritance,
          metadata: roleData.metadata
        };
        
        if (payload.roleId || editingRole?.roleId) {
          const roleId = payload.roleId || editingRole?.roleId;
          console.log('🔄 Updating existing advanced role:', roleId);
          delete payload.roleId;
          response = await api.put(`/roles/${roleId}`, payload);
        } else {
          console.log('➕ Creating new advanced role');
          delete payload.roleId;
          response = await api.post('/roles', payload);
        }
        
      } else if (isApplicationModuleBuilder) {
        // Data from ApplicationModuleRoleBuilder - use custom role service endpoints
        payload = { ...roleData };
        
        if (payload.roleId || editingRole?.roleId) {
          const roleId = payload.roleId || editingRole?.roleId;
          console.log('🔄 Updating existing custom role:', roleId);
          delete payload.roleId;
          response = await api.put(`/custom-roles/update-from-builder/${roleId}`, payload);
        } else {
          console.log('➕ Creating new custom role from builder');
          delete payload.roleId;
          response = await api.post('/custom-roles/create-from-builder', payload);
        }
        
      } else {
        // Fallback for other sources
        payload = { ...roleData };
        
        if (payload.roleId || editingRole?.roleId) {
          const roleId = payload.roleId || editingRole?.roleId;
          console.log('🔄 Updating existing role (general):', roleId);
          delete payload.roleId;
          response = await api.put(`/roles/${roleId}`, payload);
        } else {
          console.log('➕ Creating new role (general)');
          delete payload.roleId;
          response = await api.post('/roles', payload);
        }
      }
      
      if (response.data.success) {
        console.log('✅ Role saved successfully');
        
        // Invalidate cache to force fresh data
        cacheHelpers.invalidateRoles();
        invalidateRoles();
        
        // Reset state
        setShowRoleBuilder(false);
        setShowAppModuleBuilder(false);
        setEditingRole(null);
        
        toast.success(editingRole ? 'Role updated successfully!' : 'Role created successfully!');
      } else {
        console.error('❌ Role save failed:', response.data);
        toast.error(response.data.error || 'Failed to save role');
      }
    } catch (error: any) {
      console.error('🚨 Error in handleRoleSave:', error);
      
      if (error.response?.status === 400 && error.response?.data?.message?.includes('restrictions must be object')) {
        toast.error('Invalid role restrictions format. Please check your role configuration.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to save role');
      }
    }
  }, [editingRole, invalidateRoles]);

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

  // Smart filtering - only apply to cached data to avoid API calls
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      // Type filter is already applied server-side, but keep for client-side refinement
      if (typeFilter !== 'all') {
        if (typeFilter === 'system' && !role.isSystemRole) return false;
        if (typeFilter === 'custom' && role.isSystemRole) return false;
      }
      return true;
    });
  }, [roles, typeFilter]);

  // Force refresh function
  const handleForceRefresh = useCallback(async () => {
    cacheHelpers.invalidateRoles();
    await refetchRoles();
    toast.success('Data refreshed successfully');
  }, [refetchRoles]);

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
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header with Cache Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Role Management</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">Manage roles, permissions, and access control</p>
            {isCached && (
              <Badge variant="outline" className="text-xs">
                Cached {cacheAge ? Math.round(cacheAge / 1000) : 0}s ago
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleForceRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateRole} className="gap-2">
            <Building className="w-4 h-4" />
            <span className="hidden sm:inline">Build Role from Apps</span>
            <span className="sm:hidden">New Role</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Roles</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by role name, description, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11"
                />
              </div>
            </div>
            
            <div className="flex-shrink-0 flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setCurrentPage(1);
                }}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <Select value={typeFilter} onValueChange={(value: any) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="custom">Custom Roles</SelectItem>
                  <SelectItem value="system">System Roles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="modified">Modified Date</SelectItem>
                  <SelectItem value="users">User Count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Order</label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Per Page</label>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRoles.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedRoles.size} role{selectedRoles.size !== 1 ? 's' : ''} selected
                </span>
                <Badge variant="secondary">
                  {selectedRoles.size}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export', Array.from(selectedRoles))}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate', Array.from(selectedRoles))}
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Deactivate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete', Array.from(selectedRoles))}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles List */}
      <Card>
        {isLoading ? (
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-3 font-medium">Loading roles...</p>
          </CardContent>
        ) : error ? (
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
            <p className="text-red-600 mt-3 font-medium">Failed to load roles</p>
            <Button onClick={handleForceRefresh} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b bg-gray-50 p-6">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedRoles.size === filteredRoles.length && filteredRoles.length > 0}
                    onCheckedChange={selectedRoles.size === filteredRoles.length ? clearSelection : selectAllRoles}
                  />
                </div>
                <div className="col-span-5">Role & Description</div>
                <div className="col-span-3">Permissions & Modules</div>
                <div className="col-span-2">Type & Status</div>
                <div className="col-span-1 text-center">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {filteredRoles.map(role => (
                <RoleRow
                  key={role.roleId}
                  role={role}
                  isSelected={selectedRoles.has(role.roleId)}
                  onToggleSelect={() => toggleRoleSelection(role.roleId)}
                  onEdit={() => handleEditRole(role)}
                  onView={() => handleViewRole(role)}
                  onClone={() => handleCloneRole(role)}
                  onDelete={() => handleDeleteRole(role.roleId, role.roleName)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t p-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{deletingRole?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRole}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: `${viewingRole?.color}20`, color: viewingRole?.color }}
              >
                {viewingRole?.metadata?.icon || '👤'}
              </div>
              {viewingRole?.roleName}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this role and its permissions
            </DialogDescription>
          </DialogHeader>
          {viewingRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {viewingRole.roleName}</div>
                    <div><span className="font-medium">Type:</span> {viewingRole.isSystemRole ? 'System' : 'Custom'}</div>
                    <div><span className="font-medium">Created:</span> {new Date(viewingRole.createdAt).toLocaleDateString()}</div>
                    <div><span className="font-medium">Updated:</span> {new Date(viewingRole.updatedAt).toLocaleDateString()}</div>
                  </div>
                  
                  {viewingRole.description && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{viewingRole.description}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Permission Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Total Permissions:</span> {getPermissionSummary(viewingRole.permissions).totalPermissions}</div>
                    <div><span className="font-medium">Applications:</span> {getPermissionSummary(viewingRole.permissions).apps}</div>
                    <div><span className="font-medium">Modules:</span> {getPermissionSummary(viewingRole.permissions).modules}</div>
                    <div><span className="font-medium">Users:</span> {viewingRole.userCount || 0}</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Permission Details */}
              <EnhancedPermissionSummary 
                permissions={viewingRole.permissions}
                roleName={viewingRole.roleName}
                restrictions={viewingRole.restrictions}
                isSystemRole={viewingRole.isSystemRole}
                userCount={viewingRole.userCount || 0}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Role Row Component (same as before but optimized)
const RoleRow = ({ 
  role, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onView, 
  onClone, 
  onDelete 
}: {
  role: Role;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onView: () => void;
  onClone: () => void;
  onDelete: () => void;
}) => {
  const permissionSummary = getPermissionSummary(role.permissions);

  return (
    <div className="grid grid-cols-12 gap-4 p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </div>
      
      <div className="col-span-5 space-y-1">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: role.color || '#6b7280' }}
          />
          <h3 className="font-semibold text-gray-900 truncate">{role.roleName}</h3>
          {role.isSystemRole && (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          )}
        </div>
        {role.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
        )}
      </div>

      <div className="col-span-3 space-y-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{permissionSummary.totalPermissions}</span>
            <span className="text-gray-500">permissions</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4 text-green-500" />
            <span className="font-medium">{permissionSummary.apps}</span>
            <span className="text-gray-500">apps</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4 text-purple-500" />
            <span className="font-medium">{permissionSummary.modules}</span>
            <span className="text-gray-500">modules</span>
          </div>
        </div>
      </div>

      <div className="col-span-2 space-y-2">
        <div className="flex items-center gap-2">
          {role.isSystemRole ? (
            <Badge variant="secondary">System</Badge>
          ) : (
            <Badge variant="outline">Custom</Badge>
          )}
        </div>
        {role.userCount !== undefined && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{role.userCount} users</span>
          </div>
        )}
      </div>

      <div className="col-span-1 flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClone}>
              <Copy className="w-4 h-4 mr-2" />
              Clone
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Pagination Component (optimized)
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const pages = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </p>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        {pages.map((page, index) => (
          page === '...' ? (
            <span key={index} className="px-2 py-1 text-gray-500">...</span>
          ) : (
            <Button
              key={index}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </Button>
          )
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}; 