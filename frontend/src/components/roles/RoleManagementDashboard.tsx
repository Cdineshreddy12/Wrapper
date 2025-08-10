import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import api, { Role } from '@/lib/api';
import { usePermissionRefreshTrigger } from '../PermissionRefreshNotification';
import { cache, CACHE_KEYS, cacheHelpers } from '../../lib/cache';
import { useQueryClient } from '@tanstack/react-query';
import { EnhancedPermissionSummary } from './EnhancedPermissionSummary';

// Use the enhanced Role interface from api.ts - no need for separate DashboardRole
type DashboardRole = Role;

// Utility function to handle both permission formats and provide consistent summaries
const getPermissionSummary = (permissions: Record<string, any> | string[]) => {
  // Handle new hierarchical permissions (like Super Administrator)
  if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
    const hierarchicalPerms = permissions as Record<string, any>;
    let totalOperations = 0;
    let adminCount = 0;
    let writeCount = 0;
    let readCount = 0;
    const mainModules: string[] = [];
    const subModules: string[] = [];
    const moduleDetails: Record<string, string[]> = {};

    // Process hierarchical structure like { crm: { leads: [...] } }
    Object.entries(hierarchicalPerms).forEach(([moduleKey, moduleData]) => {
      if (moduleKey === 'metadata') return; // Skip metadata
      
      if (moduleData && typeof moduleData === 'object') {
        mainModules.push(moduleKey);
        moduleDetails[moduleKey] = [];
        
        // Count permissions within each sub-module
        Object.entries(moduleData).forEach(([subModuleKey, operations]) => {
          if (Array.isArray(operations)) {
            const subModuleName = `${moduleKey}.${subModuleKey}`;
            subModules.push(subModuleName);
            moduleDetails[moduleKey].push(`${subModuleKey} (${operations.length})`);
            totalOperations += operations.length;
            
            // Categorize by operation type - updated to match permission matrix
            operations.forEach((op: string) => {
              const action = op.toLowerCase();
              if (['delete', 'admin', 'manage', 'approve', 'assign', 'change_role', 'change_status', 'process', 'calculate', 'pay', 'dispute', 'close', 'reject', 'cancel'].some(admin => action.includes(admin))) {
                adminCount++;
              } else if (['read', 'view', 'export', 'list', 'read_all', 'view_salary', 'view_contacts', 'view_invoices', 'dashboard'].some(read => action.includes(read))) {
                readCount++;
              } else if (['create', 'update', 'import', 'send', 'generate_pdf', 'customize'].some(write => action.includes(write))) {
                writeCount++;
              } else {
                writeCount++; // Default to write if not clearly read or admin
              }
            });
          }
        });
      }
    });
    
    return {
      total: totalOperations,
      admin: adminCount,
      write: writeCount,
      read: readCount,
      modules: subModules.length, // Count sub-modules, not main modules
      mainModules: mainModules.length,
      moduleDetails,
      moduleNames: subModules, // Show sub-module names
      mainModuleNames: mainModules,
      applicationCount: mainModules.length,
      moduleCount: subModules.length
    };
  }
  
  // Handle flat array permissions (like custom roles)
  if (Array.isArray(permissions)) {
    const permArray = permissions as string[];
    const moduleMap = new Map<string, Set<string>>();
    const moduleDetails: Record<string, string[]> = {};
    
    // Group permissions by module (e.g., "crm.contacts.read" -> "crm.contacts")
    permArray.forEach(perm => {
      const parts = perm.split('.');
      if (parts.length >= 2) {
        const moduleKey = `${parts[0]}.${parts[1]}`;
        if (!moduleMap.has(moduleKey)) {
          moduleMap.set(moduleKey, new Set());
          moduleDetails[moduleKey] = [];
        }
        moduleMap.get(moduleKey)!.add(parts[2] || 'access');
      }
    });
    
    // Convert moduleMap to moduleDetails
    moduleMap.forEach((perms, module) => {
      moduleDetails[module] = Array.from(perms);
    });
    
    let adminCount = 0;
    let writeCount = 0; 
    let readCount = 0;
    
    // Count permission types - updated to match permission matrix
    permArray.forEach(perm => {
      const action = perm.split('.').pop()?.toLowerCase() || '';
      if (['delete', 'admin', 'manage', 'approve', 'assign', 'change_role', 'change_status', 'process', 'calculate', 'pay', 'dispute', 'close', 'reject', 'cancel'].some(admin => action.includes(admin))) {
        adminCount++;
      } else if (['read', 'view', 'list', 'read_all', 'view_salary', 'view_contacts', 'view_invoices', 'export', 'dashboard'].some(read => action.includes(read))) {
        readCount++;
      } else if (['create', 'update', 'import', 'send', 'generate_pdf', 'customize'].some(write => action.includes(write))) {
        writeCount++;
      } else {
        writeCount++; // Default to write if not clearly read or admin
      }
    });
    
    return {
      total: permArray.length,
      admin: adminCount,
      write: writeCount,
      read: readCount,
      modules: moduleMap.size,
      mainModules: new Set(Array.from(moduleMap.keys()).map(m => m.split('.')[0])).size,
      moduleDetails,
      moduleNames: Array.from(moduleMap.keys()),
      mainModuleNames: Array.from(new Set(Array.from(moduleMap.keys()).map(m => m.split('.')[0]))),
      applicationCount: new Set(Array.from(moduleMap.keys()).map(m => m.split('.')[0])).size,
      moduleCount: moduleMap.size
    };
  }
  
  // Fallback for empty or invalid permissions
  return { 
    total: 0, 
    admin: 0, 
    write: 0, 
    read: 0, 
    modules: 0,
    mainModules: 0, 
    moduleDetails: {}, 
    moduleNames: [],
    mainModuleNames: [],
    applicationCount: 0,
    moduleCount: 0
  };
};

export function RoleManagementDashboard() {
  const queryClient = useQueryClient();
  const { triggerRefresh } = usePermissionRefreshTrigger();
  const [roles, setRoles] = useState<DashboardRole[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load roles
  useEffect(() => {
    loadRoles();
  }, [currentPage, pageSize, searchQuery, typeFilter, sortBy, sortOrder]);

  const loadRoles = async () => {
    setLoading(true);
    
    // Create cache key based on current filters
    const cacheKey = `${CACHE_KEYS.ROLES}_${searchQuery}_${typeFilter}_${currentPage}_${pageSize}_${sortBy}_${sortOrder}`;
    
    // Try to get from cache first
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      console.log('📦 Loading roles from cache');
      setRoles(cachedData.roles || []);
      setTotalCount(cachedData.total || 0);
      setTotalPages(cachedData.pagination?.totalPages || 1);
      setLoading(false);
      return;
    }
    
    try {
      console.log('🌐 Loading roles from API');
      const response = await api.get('/roles', {
        params: {
          search: searchQuery,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          page: currentPage,
          limit: pageSize,
          sort: sortBy,
          order: sortOrder
        }
      });
      
      if (response.data.success) {
        const data = response.data.data || {};
        setRoles(data.roles || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        
        // Cache the data for 5 minutes
        cache.set(cacheKey, data, 5 * 60 * 1000);
      } else {
        toast.error('Failed to load roles');
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowAppModuleBuilder(true);
  };

  const handleEditRole = async (role: DashboardRole) => {
    // Check if it's a system role
    if (role.isSystemRole) {
      if (role.roleName === 'Super Administrator') {
        toast.error('Super Administrator role cannot be edited. This role has predefined comprehensive permissions.');
      } else {
        toast.error('System roles cannot be edited. Please create a custom role instead.');
      }
      return;
    }
    
    setEditingRole(role);
    setShowAppModuleBuilder(true);
  };

  const handleViewRole = (role: DashboardRole) => {
    setViewingRole(role);
    setShowViewModal(true);
  };

  const handleCloneRole = async (role: Role) => {
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
      
      console.log('🎯 Cloning role:', clonedRole);
      
      setEditingRole(clonedRole as any);
      setShowAppModuleBuilder(true);
      
      toast.success(`Cloning role "${role.roleName}". You can modify it before saving.`);
    } catch (error) {
      console.error('Failed to clone role:', error);
      toast.error('Failed to clone role');
    }
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setDeletingRole({ id: roleId, name: roleName });
    setShowDeleteModal(true);
  };

  const confirmDeleteRole = async () => {
    if (!deletingRole) return;
    
    try {
      const response = await api.delete(`/roles/${deletingRole.id}`);
      
      if (response.data.success) {
        toast.success(`Role "${deletingRole.name}" deleted successfully`);
        
        // Invalidate cache and reload
        cacheHelpers.invalidateRoles();
        await loadRoles();
        
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
      
      let errorMessage = 'Failed to delete role';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setShowDeleteModal(false);
      setDeletingRole(null);
    }
  };

  const handleBulkAction = async (action: string, selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      toast.error('No roles selected');
      return;
    }
    
    try {
      switch (action) {
        case 'delete':
          // For now, delete one by one (could be optimized with bulk delete endpoint)
          for (const roleId of selectedIds) {
            await api.delete(`/roles/${roleId}`);
          }
          toast.success(`${selectedIds.length} roles deleted successfully`);
          break;
        case 'export':
          // Implementation for export functionality
          toast.success('Export feature coming soon!');
          break;
        case 'deactivate':
          // Implementation for deactivate functionality
          toast.success('Deactivate feature coming soon!');
          break;
        default:
          toast.error('Unknown action');
          return;
      }
      
      // Invalidate cache and reload
      cacheHelpers.invalidateRoles();
      await loadRoles();
      
      // Clear selection
      setSelectedRoles(new Set());
      
      // Trigger permission refresh
      triggerRefresh();
    } catch (error) {
      console.error(`Failed to ${action} roles:`, error);
      toast.error(`Failed to ${action} roles`);
    }
  };

  const handleRoleSave = async (roleData: any) => {
    console.log('🎯 handleRoleSave called with data:', roleData);
    console.log('📝 Initial editingRole (if any):', editingRole);
    
    // Check if this is a success callback from ApplicationModuleRoleBuilder
    // (role has already been created/updated successfully)
    const isSuccessCallback = roleData.roleId && (roleData.selectedApps || roleData.roleName);
    
    if (isSuccessCallback) {
      console.log('✅ Role operation completed successfully by ApplicationModuleRoleBuilder');
      console.log('🔄 Refreshing data and closing modal...');
      
      // The role has already been created/updated, just refresh and close
      try {
        cacheHelpers.invalidateRoles();
        await queryClient.invalidateQueries({ queryKey: ['roles'] });
        await loadRoles(); // Force immediate refetch
        console.log('🔄 Roles data refreshed');
      } catch (error) {
        console.error('⚠️ Failed to refresh roles:', error);
        // Fallback: Force page reload if cache invalidation fails
        window.location.reload();
      }
      
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
                                   !roleData.selectedApps; // AdvancedRoleBuilder doesn't have selectedApps
      
      const isApplicationModuleBuilder = roleData.selectedApps && roleData.selectedModules && roleData.selectedPermissions;

      if (isAdvancedRoleBuilder) {
        // Data from AdvancedRoleBuilder - transform to proper format for /roles endpoint
        payload = {
          name: roleData.name,
          description: roleData.description,
          color: roleData.color,
          icon: roleData.icon,
          permissions: roleData.permissions,
          restrictions: roleData.restrictions, // Already in correct object format
          inheritance: roleData.inheritance,
          metadata: roleData.metadata
        };
        
        if (payload.roleId || editingRole?.roleId) {
          const roleId = payload.roleId || editingRole?.roleId;
          console.log('🔄 Updating existing advanced role:', roleId);
          delete payload.roleId; // Remove roleId from payload as it's in the URL
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
        // Fallback for other sources - use general roles endpoint
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
      
      console.log('📡 API Response:', response);
      
      if (response.data.success) {
        console.log('✅ Role saved successfully');
        
        // Invalidate and refetch roles data to show updated list
        try {
          await queryClient.invalidateQueries({ queryKey: ['roles'] });
          await loadRoles(); // Force immediate refetch
          console.log('🔄 Roles data refreshed');
        } catch (error) {
          console.error('⚠️ Failed to refresh roles:', error);
          // Fallback: Force page reload if cache invalidation fails
          window.location.reload();
        }
        
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
      
      // Check if it's a validation error about restrictions
      if (error.response?.status === 400 && error.response?.data?.message?.includes('restrictions must be object')) {
        toast.error('Invalid role restrictions format. Please check your role configuration.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to save role');
      }
    }
  };

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
    setSelectedRoles(new Set((roles || []).map(r => r.roleId)));
  }, [roles]);

  const clearSelection = useCallback(() => {
    setSelectedRoles(new Set());
  }, []);

  const filteredRoles = useMemo(() => {
    return (roles || []).filter(role => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = role.roleName.toLowerCase().includes(query);
        const matchesDescription = role.description?.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'system' && !role.isSystemRole) return false;
        if (typeFilter === 'custom' && role.isSystemRole) return false;
      }

      return true;
    });
  }, [roles, searchQuery, typeFilter]);

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
    // Temporarily redirect to ApplicationModuleRoleBuilder for compatibility
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

  // Enhanced Role Row Component with better permission display
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

    // Use computed fields from API if available, otherwise fall back to calculation
    const displayCount = (role as any).permissionCount || permissionSummary.total;
    const displayModules = (role as any).moduleCount || permissionSummary.modules;
    const displayApps = (role as any).applicationCount || permissionSummary.mainModules;

    return (
      <div className="grid grid-cols-12 gap-4 p-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        </div>
        
        <div className="col-span-5 flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold"
            style={{ backgroundColor: `${role.color}20`, color: role.color }}
          >
            {role.metadata?.icon || '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 truncate">{role.roleName}</div>
            <div className="text-sm text-gray-500 truncate">
              {role.description}
            </div>
          </div>
        </div>
        
        <div className="col-span-4 space-y-2">
          <div className="space-y-2">
            {/* Users and Modules Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{role.userCount || 0}</span>
                <span className="text-gray-500">users</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-blue-600">{displayModules}</span>
                <span className="text-gray-500">modules</span>
                <span className="text-xs text-gray-400">({displayApps} apps)</span>
              </div>
            </div>
            
            {/* Enhanced Permission Breakdown */}
            <div className="flex items-center gap-3">
              {permissionSummary.admin > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-red-700">{permissionSummary.admin}</span>
                  <span className="text-xs text-gray-500">admin</span>
                </div>
              )}
              {permissionSummary.write > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-xs font-medium text-orange-700">{permissionSummary.write}</span>
                  <span className="text-xs text-gray-500">write</span>
                </div>
              )}
              {permissionSummary.read > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">{permissionSummary.read}</span>
                  <span className="text-xs text-gray-500">read</span>
                </div>
              )}
            </div>
            
            {/* Total Operations */}
            <div className="text-xs text-gray-400">
              {displayCount} total permissions
            </div>
            
            {/* Module Names Preview */}
            {permissionSummary.moduleNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {permissionSummary.moduleNames.slice(0, 3).map((module, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {module.split('.')[0]}
                  </Badge>
                ))}
                {permissionSummary.moduleNames.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{permissionSummary.moduleNames.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="col-span-2 flex items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={role.isSystemRole ? "default" : "secondary"}>
                {role.isSystemRole ? 'System' : 'Custom'}
              </Badge>
              {role.isDefault && (
                <Badge variant="outline">Default</Badge>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Created: {new Date(role.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Role
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClone}>
                <Copy className="h-4 w-4 mr-2" />
                Clone Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-1">Manage roles, permissions, and access control</p>
        </div>
        
        <div className="flex items-center gap-3">
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
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role Type</label>
              <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value as 'all' | 'custom' | 'system')}>
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
              <Select 
                value={`${sortBy}-${sortOrder}`} 
                onValueChange={(value: string) => {
                  const [field, order] = value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="created-desc">Newest First</SelectItem>
                  <SelectItem value="created-asc">Oldest First</SelectItem>
                  <SelectItem value="users-desc">Most Users</SelectItem>
                  <SelectItem value="users-asc">Least Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(searchQuery || typeFilter !== 'all') && (
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <span className="text-sm font-medium text-gray-600">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                </Badge>
              )}
              {typeFilter !== 'all' && (
                <Badge variant="secondary">
                  Type: {typeFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {selectedRoles.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-blue-900">
                  {selectedRoles.size} role{selectedRoles.size !== 1 ? 's' : ''} selected
                </span>
                <span className="text-sm text-blue-700">
                  from {filteredRoles.length} filtered roles
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export', Array.from(selectedRoles))}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
                
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('deactivate', Array.from(selectedRoles))}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete', Array.from(selectedRoles))}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles List */}
      <Card>
        {loading ? (
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-3 font-medium">Loading roles...</p>
          </CardContent>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b bg-gray-50 p-6">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedRoles.size === roles.length && roles.length > 0}
                    onCheckedChange={selectedRoles.size === roles.length ? clearSelection : selectAllRoles}
                  />
                </div>
                <div className="col-span-5">Role & Description</div>
                <div className="col-span-4">Permissions & Modules</div>
                <div className="col-span-2">Type & Status</div>
                <div className="text-right">Actions</div>
              </div>
            </div>

            {/* Roles List */}
            <div className="divide-y divide-gray-200">
              {filteredRoles.length === 0 ? (
                <div className="p-12 text-center">
                  <Shield className="w-12 h-12 mx-auto text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mt-4">No roles found</h3>
                  <p className="text-gray-600 mt-2">
                    {searchQuery || typeFilter !== 'all' 
                      ? 'Try adjusting your search filters or create a new role.' 
                      : 'Get started by creating your first role.'
                    }
                  </p>
                  <Button onClick={handleCreateRole} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                  </Button>
                </div>
              ) : (
                filteredRoles.map((role) => (
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
                ))
              )}
            </div>
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
              Users with this role will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRole}>
              Delete Role
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
                    <div><span className="font-medium">Total Permissions:</span> {getPermissionSummary(viewingRole.permissions).total}</div>
                    <div><span className="font-medium">Applications:</span> {getPermissionSummary(viewingRole.permissions).applicationCount}</div>
                    <div><span className="font-medium">Modules:</span> {getPermissionSummary(viewingRole.permissions).moduleCount}</div>
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

      {/* Role Builder Modal */}
      {showRoleBuilder && (
        <ApplicationModuleRoleBuilder
          onSave={handleRoleSave}
          onCancel={() => {
            setShowRoleBuilder(false);
            setEditingRole(null);
          }}
          initialRole={editingRole}
        />
      )}
    </div>
  );
} 