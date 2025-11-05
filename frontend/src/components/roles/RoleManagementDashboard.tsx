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
import { PearlButton } from '@/components/ui/pearl-button';
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
import { useTheme } from '@/components/theme/ThemeProvider';
import Pattern from '@/components/ui/pattern-background';

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
  const { actualTheme, glassmorphismEnabled } = useTheme();
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

  // Load roles function
  const loadRoles = async () => {
    setLoading(true);

    // Create cache key based on current filters
    const cacheKey = `${CACHE_KEYS.ROLES}_${searchQuery}_${typeFilter}_${currentPage}_${pageSize}_${sortBy}_${sortOrder}`;

    // Try to get from cache first
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      console.log('📦 Loading roles from cache');
      console.log('📦 Cached data:', cachedData);
      setRoles(cachedData.data || []);
      setTotalCount(cachedData.total || 0);
      setTotalPages(cachedData.totalPages || 1);
      setLoading(false);
      return;
    }

    // Fallback: Load roles directly if API fails
    const loadFallbackRoles = async () => {
      console.log('🔄 Loading fallback roles...');
      try {
        const response = await api.get('/permissions/roles', {
          params: {
            page: 1,
            limit: 100, // Load more for fallback
            search: searchQuery,
            type: typeFilter !== 'all' ? typeFilter : undefined
          }
        });

        if (response.data.success) {
          const data = response.data.data || {};
          console.log('✅ Fallback roles loaded:', data.data?.length || 0);
          return data;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback roles loading failed:', fallbackError);
      }
      return null;
    };
    
    try {
      console.log('🌐 Loading roles from API');
      const response = await api.get('/permissions/roles', {
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
        console.log('🔍 RoleManagementDashboard - API Response:', response.data);
        console.log('🔍 RoleManagementDashboard - Data object:', data);
        console.log('🔍 RoleManagementDashboard - Roles array:', data.data);
        console.log('🔍 RoleManagementDashboard - Roles length:', data.data?.length || 0);

        setRoles(data.data || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);

        // Cache the data for 5 minutes
        cache.set(cacheKey, data, 5 * 60 * 1000);
      } else {
        // Try fallback if primary API fails
        console.log('⚠️ Primary API failed, trying fallback...');
        const fallbackData = await loadFallbackRoles();
        if (fallbackData) {
          setRoles(fallbackData.data || []);
          setTotalCount(fallbackData.total || 0);
          setTotalPages(fallbackData.totalPages || 1);
          console.log('✅ Roles loaded via fallback');
        } else {
          toast.error('Failed to load roles');
          setRoles([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('Failed to load roles:', error);

      // Try fallback on error
      console.log('⚠️ Primary API error, trying fallback...');
      const fallbackData = await loadFallbackRoles();
      if (fallbackData) {
        setRoles(fallbackData.data || []);
        setTotalCount(fallbackData.total || 0);
        setTotalPages(fallbackData.totalPages || 1);
        console.log('✅ Roles loaded via fallback after error');
      } else {
        toast.error('Failed to connect to server');
        setRoles([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load roles effect
  useEffect(() => {
    loadRoles();
  }, [currentPage, pageSize, searchQuery, typeFilter, sortBy, sortOrder]);

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
      const response = await api.delete(`/permissions/roles/${deletingRole.id}`);
      
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
            await api.delete(`/permissions/roles/${roleId}`);
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
          response = await api.put(`/permissions/roles/${roleId}`, payload);
        } else {
          console.log('➕ Creating new advanced role');
          delete payload.roleId;
          response = await api.post('/permissions/roles', payload);
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
          response = await api.put(`/permissions/roles/${roleId}`, payload);
        } else {
          console.log('➕ Creating new role (general)');
          delete payload.roleId;
          response = await api.post('/permissions/roles', payload);
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
    console.log('🔍 filteredRoles - Raw roles:', roles);
    console.log('🔍 filteredRoles - Roles length:', roles?.length || 0);
    console.log('🔍 filteredRoles - Search query:', searchQuery);
    console.log('🔍 filteredRoles - Type filter:', typeFilter);

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

  console.log('🔍 RoleManagementDashboard - Filtered roles length:', filteredRoles.length);

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
    onToggleSelect
  }: {
    role: Role;
    isSelected: boolean;
    onToggleSelect: () => void;
  }) => {
    console.log('🔍 RoleRow - Role data:', role);
    console.log('🔍 RoleRow - Role name:', role?.roleName);
    console.log('🔍 RoleRow - Role ID:', role?.roleId);

    const permissionSummary = getPermissionSummary(role.permissions);

    // Use computed fields from API if available, otherwise fall back to calculation
    const displayCount = (role as any).permissionCount || permissionSummary.total;
    const displayModules = (role as any).moduleCount || permissionSummary.modules;
    const displayApps = (role as any).applicationCount || permissionSummary.mainModules;

    return (
      <div className={`grid grid-cols-12 gap-4 p-6 transition-colors ${
        actualTheme === 'dark'
          ? 'hover:bg-purple-500/10'
          : actualTheme === 'monochrome'
          ? 'hover:bg-gray-500/10'
          : 'hover:bg-gray-50'
      }`}>
        <div className="flex items-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className={
              actualTheme === 'dark'
                ? 'border-purple-500/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600'
                : actualTheme === 'monochrome'
                ? 'border-gray-500/30 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600'
                : ''
            }
          />
        </div>

        <div className="col-span-4 flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold"
            style={{ backgroundColor: `${role.color}20`, color: role.color }}
          >
            {role.metadata?.icon || '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold truncate max-w-[200px] ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }`} title={role.roleName}>{role.roleName}</div>
            <div className={`text-sm truncate max-w-[200px] ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-500'
            }`} title={role.description}>
              {role.description}
            </div>
          </div>
        </div>
        
        <div className="col-span-3 space-y-2">
          <div className="space-y-2">
            {/* Users and Modules Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-400'
                    : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-100'
                    : 'text-gray-900'
                }`}>{role.userCount || 0}</span>
                <span className={`${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-gray-500'
                }`}>users</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className={`w-4 h-4 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-400'
                    : 'text-blue-500'
                }`} />
                <span className={`font-medium ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-blue-600'
                }`}>{displayModules}</span>
                <span className={`${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-gray-500'
                }`}>modules</span>
                <span className={`text-xs ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-400'
                    : 'text-gray-400'
                }`}>({displayApps} apps)</span>
              </div>
            </div>
            
            {/* Enhanced Permission Breakdown */}
            <div className="flex items-center gap-3">
              {permissionSummary.admin > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-red-700">{permissionSummary.admin}</span>
                  <span className={`text-xs ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300'
                      : 'text-gray-500'
                  }`}>admin</span>
                </div>
              )}
              {permissionSummary.write > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-xs font-medium text-orange-700">{permissionSummary.write}</span>
                  <span className={`text-xs ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300'
                      : 'text-gray-500'
                  }`}>write</span>
                </div>
              )}
              {permissionSummary.read > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">{permissionSummary.read}</span>
                  <span className={`text-xs ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300'
                      : 'text-gray-500'
                  }`}>read</span>
                </div>
              )}
            </div>
            
            {/* Total Operations */}
            <div className={`text-xs ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-400'
                : 'text-gray-400'
            }`}>
              {displayCount} total permissions
            </div>
            
            {/* Module Names Preview */}
            {permissionSummary.moduleNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 max-w-[180px]">
                {permissionSummary.moduleNames.slice(0, 2).map((module, index) => (
                  <Badge key={index} variant="outline" className={`text-xs truncate max-w-[70px] ${
                    actualTheme === 'dark'
                      ? 'border-purple-500/30 text-purple-300'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/30 text-gray-300'
                      : ''
                  }`} title={module.split('.')[0]}>
                    {module.split('.')[0]}
                  </Badge>
                ))}
                {permissionSummary.moduleNames.length > 2 && (
                  <Badge variant="outline" className={`text-xs ${
                    actualTheme === 'dark'
                      ? 'border-purple-500/30 text-purple-300'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/30 text-gray-300'
                      : ''
                  }`}>
                    +{permissionSummary.moduleNames.length - 2}
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
            <div className={`text-xs ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-500'
            }`}>
              Created: {new Date(role.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="More actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={`z-50 ${
                actualTheme === 'dark'
                  ? 'bg-slate-800/95 border-purple-500/30'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/95 border-gray-500/30'
                  : ''
              }`}
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewRole(role);
                }}
                className={
                  actualTheme === 'dark'
                    ? 'text-purple-300 focus:text-purple-200 focus:bg-purple-500/20'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300 focus:text-gray-200 focus:bg-gray-500/20'
                    : ''
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditRole(role);
                }}
                className={
                  actualTheme === 'dark'
                    ? 'text-purple-300 focus:text-purple-200 focus:bg-purple-500/20'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300 focus:text-gray-200 focus:bg-gray-500/20'
                    : ''
                }
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Role
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloneRole(role);
                }}
                className={
                  actualTheme === 'dark'
                    ? 'text-purple-300 focus:text-purple-200 focus:bg-purple-500/20'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300 focus:text-gray-200 focus:bg-gray-500/20'
                    : ''
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                Clone Role
              </DropdownMenuItem>
              <DropdownMenuSeparator className={
                actualTheme === 'dark'
                  ? 'bg-purple-500/30'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-500/30'
                  : ''
              } />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRole(role.roleId, role.roleName);
                }}
                className={
                  actualTheme === 'dark'
                    ? 'text-red-400 focus:text-red-300 focus:bg-red-500/20'
                    : actualTheme === 'monochrome'
                    ? 'text-red-400 focus:text-red-300 focus:bg-red-500/20'
                    : 'text-red-600 hover:text-red-700'
                }
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
    <div className={`min-h-screen rounded-xl relative ${
      actualTheme === 'dark'
        ? glassmorphismEnabled
          ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'
          : 'bg-black text-white'
        : actualTheme === 'monochrome'
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100'
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Background */}
      <div className={`absolute inset-0 ${glassmorphismEnabled ? 'bg-gradient-to-br from-violet-100/30 via-purple-100/15 to-indigo-100/10 dark:from-slate-950/40 dark:via-slate-900/25 dark:to-slate-950/40 backdrop-blur-3xl' : ''}`}></div>

      {/* Purple gradient glassy effect */}
      {glassmorphismEnabled && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/12 via-violet-200/8 to-indigo-200/10 dark:from-purple-500/10 dark:via-violet-500/6 dark:to-indigo-500/8 backdrop-blur-3xl"></div>
      )}

      {/* Background Pattern */}
      {(actualTheme === 'dark' || actualTheme === 'monochrome') && (
        <div className="absolute inset-0 opacity-30">
          <Pattern />
        </div>
      )}

      {/* Floating decorative elements for glassy mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-16 left-16 w-48 h-48 rounded-full blur-3xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-purple-200/20 to-violet-200/20 dark:from-purple-400/12 dark:to-violet-400/12 backdrop-blur-3xl border border-purple-300/30 dark:border-purple-600/30' : 'hidden'}`}></div>
        <div className={`absolute top-32 right-32 w-44 h-44 rounded-full blur-3xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-violet-200/20 to-indigo-200/20 dark:from-violet-400/10 dark:to-indigo-400/10 backdrop-blur-3xl border border-violet-300/30 dark:border-violet-600/30' : 'hidden'}`} style={{animationDelay: '1.5s'}}></div>
        <div className={`absolute bottom-48 left-20 w-36 h-36 rounded-full blur-3xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-indigo-200/20 to-purple-200/20 dark:from-indigo-400/8 dark:to-purple-400/8 backdrop-blur-3xl border border-indigo-300/30 dark:border-indigo-600/30' : 'hidden'}`} style={{animationDelay: '3s'}}></div>
        <div className={`absolute top-1/2 right-16 w-28 h-28 rounded-full blur-2xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-pink-200/15 to-purple-200/15 dark:from-pink-400/6 dark:to-purple-400/6 backdrop-blur-3xl border border-pink-300/30 dark:border-pink-600/30' : 'hidden'}`} style={{animationDelay: '4.5s'}}></div>

        {/* Purple gradient glassy floating elements */}
        {glassmorphismEnabled && (
          <>
            <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full blur-2xl animate-pulse bg-gradient-to-r from-purple-200/12 to-violet-200/8 dark:from-purple-400/6 dark:to-violet-400/4 backdrop-blur-3xl border border-purple-300/40 dark:border-purple-600/25" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/4 right-1/3 w-24 h-24 rounded-full blur-xl animate-pulse bg-gradient-to-r from-violet-200/10 to-indigo-200/6 dark:from-violet-400/5 dark:to-indigo-400/3 backdrop-blur-3xl border border-violet-300/35 dark:border-violet-600/20" style={{animationDelay: '5.5s'}}></div>
            <div className="absolute top-3/4 left-1/2 w-20 h-20 rounded-full blur-lg animate-pulse bg-gradient-to-r from-indigo-200/8 to-purple-200/6 dark:from-indigo-400/4 dark:to-purple-400/3 backdrop-blur-3xl border border-indigo-300/30 dark:border-indigo-600/15" style={{animationDelay: '7s'}}></div>
          </>
        )}
      </div>

      {/* Content with enhanced glassmorphism card effect */}
      <div className="relative z-10">
        {/* Purple gradient glassy effect */}
        {glassmorphismEnabled && (
          <div className="absolute inset-0 backdrop-blur-3xl bg-gradient-to-br from-purple-200/8 via-violet-200/5 to-indigo-200/6 dark:from-purple-500/6 dark:via-violet-500/3 dark:to-indigo-500/4 rounded-3xl"></div>
        )}
        <div className={`${glassmorphismEnabled ? 'backdrop-blur-3xl bg-purple-100/2 dark:bg-purple-900/3 border border-purple-300/60 dark:border-purple-600/50 rounded-3xl shadow-2xl ring-1 ring-purple-300/35 dark:ring-purple-600/25' : ''}`}>
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${
            actualTheme === 'dark'
              ? 'text-white'
              : actualTheme === 'monochrome'
              ? 'text-gray-100'
              : 'text-gray-900'
          }`}>Role Management</h1>
          <p className={`mt-1 ${
            actualTheme === 'dark'
              ? 'text-purple-200'
              : actualTheme === 'monochrome'
              ? 'text-gray-300'
              : 'text-gray-600'
          }`}>Manage roles, permissions, and access control</p>
        </div>
        
        <div className="flex items-center gap-3">
          <PearlButton onClick={handleCreateRole}>
            <Building className="w-4 h-4" />
            <span className="hidden sm:inline">Build Role from Apps</span>
            <span className="sm:hidden">New Role</span>
          </PearlButton>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <Card className={
        actualTheme === 'dark'
          ? glassmorphismEnabled
            ? 'bg-slate-900 border-purple-500/30'
            : 'bg-slate-900 border-slate-700'
          : actualTheme === 'monochrome'
          ? 'bg-gray-900 border-gray-500/30'
          : ''
      }>
        <CardContent className="p-6 space-y-6">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className={`text-sm font-medium ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>Search Roles</label>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-400'
                    : 'text-gray-400'
                }`} />
                <Input
                  placeholder="Search by role name, description, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-11 ${
                    actualTheme === 'dark'
                      ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                      : actualTheme === 'monochrome'
                      ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                      : ''
                  }`}
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
              <label className={`text-sm font-medium ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>Role Type</label>
              <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value as 'all' | 'custom' | 'system')}>
                <SelectTrigger className={
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100'
                    : ''
                }>
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
              <label className={`text-sm font-medium ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>Sort By</label>
              <Select 
                value={`${sortBy}-${sortOrder}`} 
                onValueChange={(value: string) => {
                  const [field, order] = value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
              >
                <SelectTrigger className={
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100'
                    : ''
                }>
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
            <div className={`flex flex-wrap gap-3 pt-4 border-t ${
              actualTheme === 'dark'
                ? 'border-purple-500/30'
                : actualTheme === 'monochrome'
                ? 'border-gray-500/30'
                : 'border-gray-200'
            }`}>
              <span className={`text-sm font-medium ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-300'
                  : 'text-gray-600'
              }`}>Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className={
                  actualTheme === 'dark'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    : ''
                }>
                  Search: "{searchQuery}"
                </Badge>
              )}
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className={
                  actualTheme === 'dark'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    : ''
                }>
                  Type: {typeFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {selectedRoles.size > 0 && (
        <Card className={
          actualTheme === 'dark'
            ? 'border-purple-500/30 bg-purple-900'
            : actualTheme === 'monochrome'
            ? 'border-gray-500/30 bg-gray-900'
            : 'border-blue-200 bg-blue-50'
        }>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <span className={`text-sm font-medium ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-blue-900'
                }`}>
                  {selectedRoles.size} role{selectedRoles.size !== 1 ? 's' : ''} selected
                </span>
                <span className={`text-sm ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-blue-700'
                }`}>
                  from {filteredRoles.length} filtered roles
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export', Array.from(selectedRoles))}
                  className={
                    actualTheme === 'dark'
                      ? 'border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/30 text-gray-300 hover:bg-gray-500/20'
                      : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
                
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('deactivate', Array.from(selectedRoles))}
                  className={
                    actualTheme === 'dark'
                      ? 'border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/30 text-gray-300 hover:bg-gray-500/20'
                      : ''
                  }
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete', Array.from(selectedRoles))}
                  className={
                    actualTheme === 'dark'
                      ? 'bg-red-600 hover:bg-red-700'
                      : actualTheme === 'monochrome'
                      ? 'bg-red-600 hover:bg-red-700'
                      : ''
                  }
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
      <Card className={
        actualTheme === 'dark'
          ? glassmorphismEnabled
            ? 'bg-slate-900 border-purple-500/30'
            : 'bg-slate-900 border-slate-700'
          : actualTheme === 'monochrome'
          ? 'bg-gray-900 border-gray-500/30'
          : ''
      }>
        {loading ? (
          <CardContent className="p-12 text-center">
            <RefreshCw className={`w-8 h-8 animate-spin mx-auto ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-400'
                : 'text-gray-400'
            }`} />
            <p className={`mt-3 font-medium ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-600'
            }`}>Loading roles...</p>
          </CardContent>
        ) : (
          <>
            {/* Table Header */}
            <div className={`border-b p-6 ${
              actualTheme === 'dark'
                ? 'bg-slate-800 border-purple-500/30'
                : actualTheme === 'monochrome'
                ? 'bg-gray-800 border-gray-500/30'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`grid grid-cols-12 gap-4 text-sm font-semibold ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedRoles.size === roles.length && roles.length > 0}
                    onCheckedChange={selectedRoles.size === roles.length ? clearSelection : selectAllRoles}
                    className={
                      actualTheme === 'dark'
                        ? 'border-purple-500/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600'
                        : actualTheme === 'monochrome'
                        ? 'border-gray-500/30 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600'
                        : ''
                    }
                  />
                </div>
                <div className="col-span-4">Role & Description</div>
                <div className="col-span-3">Permissions & Modules</div>
                <div className="col-span-2">Type & Status</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
            </div>

            {/* Roles List */}
            <div className={`divide-y ${
              actualTheme === 'dark'
                ? 'divide-purple-500/30'
                : actualTheme === 'monochrome'
                ? 'divide-gray-500/30'
                : 'divide-gray-200'
            }`}>
              {filteredRoles.length === 0 ? (
                <div className="p-12 text-center">
                  <Shield className={`w-12 h-12 mx-auto ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-400'
                      : 'text-gray-400'
                  }`} />
                  <h3 className={`text-lg font-semibold mt-4 ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-100'
                      : 'text-gray-900'
                  }`}>No roles found</h3>
                  <p className={`mt-2 ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300'
                      : 'text-gray-600'
                  }`}>
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
                  />
                ))
              )}
            </div>
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className={
          actualTheme === 'dark'
            ? glassmorphismEnabled
              ? 'bg-slate-900 border-purple-500/30 text-white'
              : 'bg-slate-900 border-slate-700 text-white'
            : actualTheme === 'monochrome'
            ? 'bg-gray-900 border-gray-500/30 text-gray-100'
            : ''
        }>
          <DialogHeader>
            <DialogTitle className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : ''
            }>Delete Role</DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : ''
            }>
              Are you sure you want to delete the role "{deletingRole?.name}"? This action cannot be undone.
              Users with this role will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className={
              actualTheme === 'dark'
                ? 'border-purple-500/30 text-purple-200 hover:bg-purple-500/10'
                : actualTheme === 'monochrome'
                ? 'border-gray-500/30 text-gray-200 hover:bg-gray-500/10'
                : ''
            }>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRole} className={
              actualTheme === 'dark'
                ? 'bg-red-600 hover:bg-red-700'
                : actualTheme === 'monochrome'
                ? 'bg-red-600 hover:bg-red-700'
                : ''
            }>
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className={`max-w-6xl max-h-[80vh] overflow-y-auto ${
          actualTheme === 'dark'
            ? 'bg-black text-white border-gray-700'
            : actualTheme === 'monochrome'
            ? 'bg-gray-900 text-gray-100 border-gray-600'
            : 'bg-white text-gray-900 border-gray-300'
        }`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-3 ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }`}>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                  actualTheme === 'dark'
                    ? 'bg-gray-800'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-700'
                    : 'bg-gray-100'
                }`}
                style={{ color: viewingRole?.color }}
              >
                {viewingRole?.metadata?.icon || '👤'}
              </div>
              {viewingRole?.roleName}
            </DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-gray-300'
                : actualTheme === 'monochrome'
                ? 'text-gray-400'
                : 'text-gray-600'
            }>
              View detailed information about this role and its permissions
            </DialogDescription>
          </DialogHeader>
          
          {viewingRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className={`font-semibold mb-2 ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-100'
                      : 'text-gray-900'
                  }`}>Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Name:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{viewingRole.roleName}</span></div>
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Type:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{viewingRole.isSystemRole ? 'System' : 'Custom'}</span></div>
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Created:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{new Date(viewingRole.createdAt).toLocaleDateString()}</span></div>
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Updated:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{new Date(viewingRole.updatedAt).toLocaleDateString()}</span></div>
                  </div>

                  {viewingRole.description && (
                    <div className="mt-4">
                      <h4 className={`font-semibold mb-2 ${
                        actualTheme === 'dark'
                          ? 'text-white'
                          : actualTheme === 'monochrome'
                          ? 'text-gray-100'
                          : 'text-gray-900'
                      }`}>Description</h4>
                      <p className={`text-sm ${
                        actualTheme === 'dark'
                          ? 'text-gray-300'
                          : actualTheme === 'monochrome'
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }`}>{viewingRole.description}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className={`font-semibold mb-2 ${
                    actualTheme === 'dark'
                      ? 'text-white'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-100'
                      : 'text-gray-900'
                  }`}>Permission Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Total Permissions:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{getPermissionSummary(viewingRole.permissions).total}</span></div>
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Applications:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{getPermissionSummary(viewingRole.permissions).applicationCount}</span></div>
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Modules:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{getPermissionSummary(viewingRole.permissions).moduleCount}</span></div>
                    <div><span className={`font-medium ${
                      actualTheme === 'dark'
                        ? 'text-gray-300'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}>Users:</span> <span className={
                      actualTheme === 'dark'
                        ? 'text-white'
                        : actualTheme === 'monochrome'
                        ? 'text-gray-100'
                        : 'text-gray-900'
                    }>{viewingRole.userCount || 0}</span></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Permission Details */}
              <div className={`rounded-lg p-4 border ${
                actualTheme === 'dark'
                  ? 'bg-gray-900 border-gray-700'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <EnhancedPermissionSummary
                  permissions={viewingRole.permissions}
                  roleName={viewingRole.roleName}
                  restrictions={viewingRole.restrictions}
                  isSystemRole={viewingRole.isSystemRole}
                  userCount={viewingRole.userCount || 0}
                  className="bg-transparent"
                />
              </div>
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
        </div>
      </div>
    </div>
  );
} 