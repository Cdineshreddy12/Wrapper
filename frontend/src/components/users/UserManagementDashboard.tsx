import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Mail,
  Edit,
  Trash2,
  Eye,
  Crown,
  X,
  UserCog,
  UserX,
  UserCheck,
  Building2,
  MoreVertical
} from 'lucide-react';
import api from '@/lib/api';
import { TableColumn, TableAction } from '@/components/table/ReusableTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PearlButton } from '@/components/ui/pearl-button';
import Pattern from '@/components/ui/pattern-background';
import { useTheme } from '@/components/theme/ThemeProvider';

// Import sub-components
import { UserManagementHeader } from './UserManagementHeader';
import { UserStatsCards } from './UserStatsCards';

import { UserTable } from './UserTable';
import { InviteUserModal } from './modals/InviteUserModal';
import { UserDetailsModal } from './modals/UserDetailsModal';

interface User {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  department?: string;
  title?: string;
  invitedBy?: string;
  invitedAt?: string;
  invitationAcceptedAt?: string;
  lastLoginAt?: string;
  roles?: Role[];
  avatar?: string;
  invitationStatus?: string;
  userType?: string;
  originalData?: {
    invitationToken?: string;
    user?: {
      invitationToken?: string;
      invitationId?: string;
    };
  };
  invitationId?: string;
}

interface Role {
  roleId: string;
  roleName: string;
  description: string;
  color: string;
  icon: string;
  permissions: Record<string, any>;
}

interface Entity {
  entityId: string;
  entityName: string;
  entityType: string;
  hierarchyPath?: string;
  fullHierarchyPath?: string;
  parentEntityId?: string | null;
  displayName?: string;
  hierarchyLevel?: number;
  children?: Entity[];
}

interface OrganizationAssignment {
  membershipId: string;
  userId: string;
  entityId: string;
  entityType: string;
  entityName: string;
  entityCode: string;
  entityParentId: string | null;
  roleName: string | null;
  membershipStatus: string;
  accessLevel: string;
  isPrimary: boolean;
  department: string | null;
  team: string | null;
  jobTitle: string | null;
  joinedAt: string | null;
  userName?: string; // May be populated from user data
}


export function UserManagementDashboard() {
  const { actualTheme, glassmorphismEnabled } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleAssignModal, setShowRoleAssignModal] = useState(false);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Entity filtering
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entityHierarchy, setEntityHierarchy] = useState<Entity[]>([]);
  
  // Edit user modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    title: '',
    department: '',
    isActive: true,
    isTenantAdmin: false
  });
  
  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Organization Assignment
  const [organizationAssignments, setOrganizationAssignments] = useState<OrganizationAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showOrgAssignmentModal, setShowOrgAssignmentModal] = useState(false);
  const [showRemoveOrgModal, setShowRemoveOrgModal] = useState(false);
  const [selectedUserForOrg, setSelectedUserForOrg] = useState<User | null>(null);
  const [orgToRemove, setOrgToRemove] = useState<{ userId: string; assignment: OrganizationAssignment } | null>(null);
  const [viewingOrganizationsUser, setViewingOrganizationsUser] = useState<User | null>(null);
  const [orgAssignmentForm, setOrgAssignmentForm] = useState({
    organizationId: '',
    assignmentType: 'primary' as const,
    priority: 1
  });
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created' | 'lastLogin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Invitation form - Enhanced for multi-entity support
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    entities: [] as Array<{
      entityId: string;
      roleId: string;
      entityType: string;
      membershipType: string;
    }>,
    primaryEntityId: '',
    message: '',
    invitationType: 'multi-entity' as 'single-entity' | 'multi-entity'
  });

  const [entityUserCounts, setEntityUserCounts] = useState<Record<string, number>>({});

  // Entity management state is already declared above

  const loadRoles = async () => {
    try {
      console.log('🔄 Loading roles...');
      const response = await api.get('/permissions/roles');
      console.log('📊 Roles API response:', response.data);

      if (response.data.success) {
        // The backend returns: {success: true, data: {data: roleResults, total: ..., page: ..., limit: ...}}
        // So we need to access response.data.data.data (not response.data.data.roles)
        const rolesData = response.data.data?.data || [];
        console.log('✅ Roles loaded successfully:', rolesData);
        setRoles(rolesData);
      } else {
        console.error('❌ Roles API not successful:', response.data);
        setRoles([]);
      }
    } catch (error) {
      console.error('❌ Failed to load roles:', error);
      setRoles([]);
    }
  }

  // Load users, roles, and entities on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await loadRoles();
      await loadEntities();
      // Load users regardless of roles loading status
      await loadUsers(selectedEntityId);
    };
    loadInitialData();
  }, []);

  // Reload users when entity filter changes
  useEffect(() => {
    if (roles.length >= 0) { // Always true, but ensures roles are initialized
      loadUsers(selectedEntityId);
    }
  }, [selectedEntityId]);

  // Load entities when invite modal opens (fallback, entities are now loaded on mount)
  useEffect(() => {
    if (showInviteModal && availableEntities.length === 0) {
      loadEntities();
    }
  }, [showInviteModal, availableEntities.length]);

  const loadUsers = async (entityId?: string | null) => {
    // Prevent concurrent calls
    if (usersLoading) {
      console.log('⚠️ loadUsers already in progress, skipping...');
      return;
    }

    setUsersLoading(true);
    // Only set main loading on initial load
    if (users.length === 0) {
      setLoading(true);
    }

    try {
      const params = entityId ? { entityId } : {};
      const response = await api.get('/tenants/current/users', { params });
      if (response.data.success) {
        const userData = response.data.data || [];
        console.log('📊 Raw user data from API:', userData);
        
        // Transform the data structure to include invitation information
        const transformedUsers = userData.map((item: any) => {
          const user = item.user || item; // Handle both structures
          const roleString = item.role; // This is the role string from the API
          
          // Determine invitation status and type based on actual user state
          let invitationStatus = 'active';
          let userType = 'active_user';
          
          // Check if user is actually active and completed onboarding
          if (user.isActive && user.onboardingCompleted) {
            invitationStatus = 'active';
            userType = 'active_user';
          } else if (!user.isActive && !user.onboardingCompleted) {
            invitationStatus = 'pending';
            userType = 'invited';
          } else if (!user.onboardingCompleted) {
            invitationStatus = 'setup_required';
            userType = 'setup_required';
          }
          
          // Find the matching role object from the roles array
          let matchedRole = null;
          if (roleString && roleString.trim() !== '' && roles.length > 0) {
            matchedRole = roles.find(role =>
              role.roleName === roleString ||
              role.roleId === roleString ||
              role.description?.toLowerCase().includes(roleString.toLowerCase())
            );

            // Debug role matching
            console.log(`🔍 Role matching for user ${user.email}:`, {
              roleString,
              availableRoles: roles.map(r => r.roleName),
              matchedRole: matchedRole ? matchedRole.roleName : 'No match found'
            });
          }
          
          // Use the actual user data structure
          return {
            userId: user.id || user.userId, // Use 'id' from the API response
            email: user.email,
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.firstName || user.lastName || 'Unnamed User',
            isActive: user.isActive !== false, // Default to true if undefined
            isTenantAdmin: roleString === 'Super Administrator' || user.isTenantAdmin || false,
            onboardingCompleted: user.onboardingCompleted !== false, // Default to true if undefined
            department: user.department,
            title: user.title,
            invitedBy: user.invitedBy,
            invitedAt: user.invitedAt,
            invitationAcceptedAt: user.invitationAcceptedAt,
            lastLoginAt: user.lastActiveAt || user.lastLoginAt,
            avatar: user.avatar,
            roles: matchedRole ? [{
              roleId: matchedRole.roleId,
              roleName: matchedRole.roleName,
              description: matchedRole.description || '',
              color: matchedRole.color || '#6b7280',
              icon: matchedRole.icon || '👤',
              permissions: matchedRole.permissions || {}
            }] : (roleString && roleString.trim() !== '' && roleString !== 'No role assigned') ? [{
              // Only create a fallback role if we have a valid roleString and it's not empty or 'No role assigned'
              roleId: roleString.trim() !== '' && roleString !== 'No role assigned' ? roleString : null,
              roleName: roleString,
              description: 'Role details not available',
              color: '#6b7280',
              icon: '👤',
              permissions: {}
            }].filter(role => role.roleId !== null) : [], // Filter out roles with null roleId
            invitationStatus,
            userType,
            // Store original data for invitation token extraction
            originalData: item,
            // Extract invitation token if available
            invitationId: item.invitationToken || item.invitationId || null
          };
        });
        
        console.log('🔄 Transformed user data with invitation status:', transformedUsers);
        
        // Validate transformed user data
        const validUsers = transformedUsers.filter((user: any) =>
          user && 
          typeof user === 'object' && 
          user.userId && 
          typeof user.email === 'string'
        );
        
        console.log('✅ Valid users after filtering:', validUsers);
        
        // Debug: Log the final transformed users to see their structure
        console.log('🔍 Final transformed users structure:', transformedUsers.map((user: any) => ({
          userId: user.userId,
          email: user.email,
          name: user.name,
          isActive: user.isActive,
          onboardingCompleted: user.onboardingCompleted,
          invitationStatus: user.invitationStatus,
          userType: user.userType,
          isTenantAdmin: user.isTenantAdmin,
          roles: user.roles
        })));
        
        setUsers(validUsers);

        // Maintain per-entity user counts to annotate hierarchy options
        if (!entityId) {
          const entityCounts: Record<string, number> = {};

          userData.forEach((item: any) => {
            const membershipIds = new Set<string>();

            if (item.memberships && Array.isArray(item.memberships)) {
              item.memberships.forEach((membership: any) => {
                if (membership?.entityId) {
                  membershipIds.add(String(membership.entityId));
                }
              });
            }

            if (item.entityMemberships && Array.isArray(item.entityMemberships)) {
              item.entityMemberships.forEach((membership: any) => {
                if (membership?.entityId) {
                  membershipIds.add(String(membership.entityId));
                }
              });
            }

            const primaryEntity = item.primaryEntityId || item.primaryOrganizationId || item.user?.primaryOrganizationId;
            if (primaryEntity) {
              membershipIds.add(String(primaryEntity));
            }

            membershipIds.forEach((entityId: string) => {
              entityCounts[entityId] = (entityCounts[entityId] || 0) + 1;
            });
          });

          setEntityUserCounts(entityCounts);
        }
      } else {
        console.log('❌ API response not successful:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setUsers([]); // Set empty array on error
    } finally {
      setUsersLoading(false);
      setLoading(false);
    }

    // Load organization assignments
    try {
      setAssignmentsLoading(true);
      const assignmentsResponse = await api.get('/tenants/current/organization-assignments');
      if (assignmentsResponse.data.success) {
        setOrganizationAssignments(assignmentsResponse.data.data || []);
        console.log('✅ Organization assignments loaded:', assignmentsResponse.data.data?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load organization assignments:', error);
      // Don't show error toast for assignments as it's not critical
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const loadOrganizationAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const assignmentsResponse = await api.get('/tenants/current/organization-assignments');
      if (assignmentsResponse.data.success) {
        setOrganizationAssignments(assignmentsResponse.data.data || []);
        console.log('✅ Organization assignments loaded:', assignmentsResponse.data.data?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load organization assignments:', error);
      // Don't show error toast for assignments as it's not critical
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Helper function to build hierarchical tree
  const buildEntityTree = (entities: Entity[]): Entity[] => {
    const entityMap = new Map<string, Entity>();
    const rootEntities: Entity[] = [];

    // First pass: create map of all entities
    entities.forEach(entity => {
      entityMap.set(entity.entityId, { ...entity, children: [] });
    });

    // Second pass: build hierarchy
    entities.forEach(entity => {
      const entityWithChildren = entityMap.get(entity.entityId)!;

      if (entity.parentEntityId && entityMap.has(entity.parentEntityId)) {
        // Has parent, add to parent's children
        const parent = entityMap.get(entity.parentEntityId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(entityWithChildren);
      } else {
        // No parent, it's a root entity
        rootEntities.push(entityWithChildren);
      }
    });

    return rootEntities;
  };

  // Helper function to flatten hierarchy for dropdown (with indentation)
  const flattenEntityHierarchy = (entities: Entity[], prefix: string[] = []): Entity[] => {
    const result: Entity[] = [];

    entities.forEach((entity, index) => {
      const isLastChild = index === entities.length - 1;
      const branchPrefix = prefix.join('');
      const connector = prefix.length === 0 ? '' : isLastChild ? '└─ ' : '├─ ';
      const indentation = `${branchPrefix}${connector}`;

      result.push({
        ...entity,
        displayName: `${indentation}${entity.entityName}`,
        hierarchyLevel: prefix.length
      });

      if (entity.children && entity.children.length > 0) {
        const childPrefix = [...prefix, isLastChild ? '   ' : '│  '];
        result.push(...flattenEntityHierarchy(entity.children, childPrefix));
      }
    });

    return result;
  };

  const loadEntities = async () => {
    if (entitiesLoading) {
      console.log('⚠️ loadEntities already in progress, skipping...');
      return;
    }

    setEntitiesLoading(true);
    try {
      console.log('🔄 Loading organizations for filtering...');
      // Use organizations hierarchy endpoint which includes both organizations and locations
      const response = await api.get('/organizations/hierarchy/current');
      console.log('📊 Organizations API response:', response.data);

      if (response.data.success) {
        // Handle organizations hierarchy data structure
        const rawOrganizations = response.data.hierarchy || [];
        console.log('✅ Raw organizations loaded successfully:', rawOrganizations.length);

        // Flatten the nested hierarchy into a flat array that includes all descendants
        const flattenOrganizations = (
          orgs: Array<Record<string, any>>,
          parentId: string | null = null
        ): Entity[] => {
          const result: Entity[] = [];

          orgs.forEach((org) => {
            const entityId = String(org.organizationId || org.entityId);
            const mappedOrg: Entity = {
              entityId,
              entityName: org.organizationName || org.entityName,
              entityType: org.entityType || (org.locationType ? 'location' : 'organization'),
              hierarchyPath: org.hierarchyPath,
              fullHierarchyPath: org.fullHierarchyPath,
              parentEntityId: parentId,
              children: []
            };

            result.push(mappedOrg);

            if (org.children && Array.isArray(org.children) && org.children.length > 0) {
              result.push(...flattenOrganizations(org.children, entityId));
            }
          });

          return result;
        };

        const flattenedHierarchy = flattenOrganizations(rawOrganizations);

        // Build hierarchical tree in a single pass
        const tree = buildEntityTree(flattenedHierarchy);
        setEntityHierarchy(tree);

        // Flatten for dropdown display
        const flattened = flattenEntityHierarchy(tree);
        if (flattened.length === 0) {
          console.warn('⚠️ No entities available after hierarchy processing');
          setAvailableEntities([]);
        } else {
          setAvailableEntities(flattened);
        }

        // If an entity is selected but no longer exists in hierarchy, reset filter
        if (selectedEntityId && !flattenedHierarchy.some((entity) => entity.entityId === selectedEntityId)) {
          console.warn('⚠️ Selected entity not found in hierarchy, resetting filter');
          setSelectedEntityId(null);
        }
      } else {
        console.error('❌ Organizations API not successful:', response.data);
        setAvailableEntities([]);
        setEntityHierarchy([]);
      }
    } catch (error) {
      console.error('❌ Failed to load organizations:', error);
      setAvailableEntities([]);
      setEntityHierarchy([]);
    } finally {
      setEntitiesLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Email and name are required');
      return;
    }

    if (inviteForm.invitationType === 'multi-entity') {
      // Multi-entity invitation validation
      if (!inviteForm.entities || inviteForm.entities.length === 0) {
        toast.error('Please select at least one organization or location');
        return;
      }

      // Validate that each entity has a role assigned
      const invalidEntities = inviteForm.entities.filter(entity => !entity.roleId);
      if (invalidEntities.length > 0) {
        toast.error('Please assign a role to all selected entities');
        return;
      }

      // Validate primary entity
      if (inviteForm.primaryEntityId && !inviteForm.entities.some(e => e.entityId === inviteForm.primaryEntityId)) {
        toast.error('Primary entity must be one of the selected entities');
        return;
      }

      try {
        const response = await api.post('/invitations/create-multi-entity', {
          email: inviteForm.email,
          entities: inviteForm.entities,
          primaryEntityId: inviteForm.primaryEntityId || inviteForm.entities[0]?.entityId,
          message: inviteForm.message,
          name: inviteForm.name || inviteForm.email.split('@')[0]
        });

        if (response.data.success) {
          toast.success(`Multi-entity invitation sent to ${inviteForm.email}!`);
          setShowInviteModal(false);
          setInviteForm({
            email: '',
            name: '',
            entities: [],
            primaryEntityId: '',
            message: '',
            invitationType: 'multi-entity'
          });
          await loadUsers();
        }
      } catch (error: any) {
        console.error('Failed to send multi-entity invitation:', error);
        toast.error(error.response?.data?.message || 'Failed to send invitation');
      }
    } else {
      // Legacy single-entity invitation (backward compatibility)
      toast.error('Single-entity invitations are deprecated. Please use multi-entity invitations.');
    }
  };

  const handlePromoteUser = async (userId: string, userName: string) => {
    if (!confirm(`Promote ${userName} to organization admin?`)) return;

    try {
      await api.post(`/tenants/current/users/${userId}/promote`);
      toast.success(`${userName} promoted to admin!`);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to promote user');
    }
  };

  const handleDeactivateUser = async (userId: string, userName: string) => {
    if (!confirm(`Deactivate ${userName}? They will lose access to all applications but their data will remain.`)) return;

    try {
      await api.post(`/tenants/current/users/${userId}/deactivate`);
      toast.success(`${userName} deactivated!`);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to deactivate user');
    }
  };

  const handleReactivateUser = async (userId: string, userName: string) => {
    if (!confirm(`Reactivate ${userName}? They will regain access to applications.`)) return;

    try {
      await api.post(`/tenants/current/users/${userId}/reactivate`);
      toast.success(`${userName} reactivated!`);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to reactivate user');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await api.delete(`/tenants/current/users/${deletingUser.userId}`);
      toast.success(`${deletingUser.name} permanently deleted!`);
      setShowDeleteModal(false);
      setDeletingUser(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      title: user.title || '',
      department: user.department || '',
      isActive: user.isActive,
      isTenantAdmin: user.isTenantAdmin
    });
    setShowEditModal(true);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const response = await api.put(`/tenants/current/users/${editingUser.userId}`, editForm);
      
      if (response.data.success) {
        toast.success(`${editForm.name} updated successfully!`);
        setShowEditModal(false);
        setEditingUser(null);
        await loadUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleResendInvite = async (userId: string, userEmail: string) => {
    try {
      await api.post(`/tenants/current/users/${userId}/resend-invite`);
      toast.success(`Invitation resent to ${userEmail}`);
    } catch (error) {
      toast.error('Failed to resend invitation');
    }
  };

  const handleAssignRoles = async (user: User) => {
    console.log('🔧 Opening role assignment modal for user:', user.email);
    console.log('🔧 Current roles state:', roles);
    
    // Ensure roles are loaded before opening the modal
    if (roles.length === 0) {
      console.log('🔄 No roles loaded, fetching roles first...');
      await loadRoles();
    }
    
    setAssigningUser(user);
    
    // Filter out invalid role IDs (like 'unknown', 'No role assigned') and only include valid roles
    const validRoleIds = user.roles
      ?.filter(role => role.roleId && role.roleId !== 'unknown' && role.roleId !== 'No role assigned' && typeof role.roleId === 'string')
      ?.map(r => r.roleId) || [];
    
    console.log('🔧 Setting selected roles:', {
      userRoles: user.roles,
      validRoleIds,
      allRoles: roles.map(r => ({ roleId: r.roleId, roleName: r.roleName }))
    });
    
    setSelectedRoles(validRoleIds);
    setShowRoleAssignModal(true);
  };

  const handleSaveRoleAssignment = async () => {
    if (!assigningUser) return;

    // Filter out any invalid role IDs before sending to backend
    const validRoleIds = selectedRoles.filter(roleId =>
      roleId &&
      roleId !== 'unknown' &&
      roleId !== 'No role assigned' &&
      typeof roleId === 'string' &&
      roleId.trim() !== ''
    );

    console.log('🔧 Saving role assignment:', {
      userId: assigningUser.userId,
      selectedRoles,
      validRoleIds,
      roles: roles.map(r => ({ roleId: r.roleId, roleName: r.roleName }))
    });

    if (validRoleIds.length === 0) {
      toast.error('No valid roles selected');
      return;
    }

    try {
      const response = await api.post(`/tenants/current/users/${assigningUser.userId}/assign-roles`, {
        roleIds: validRoleIds
      });

      if (response.data.success) {
        toast.success(`Roles updated for ${assigningUser.name}!`);
        setShowRoleAssignModal(false);
        setAssigningUser(null);
        setSelectedRoles([]);
        await loadUsers();
      } else {
        toast.error(response.data.message || 'Failed to assign roles');
      }
    } catch (error: any) {
      console.error('Failed to assign roles:', error);
      toast.error(error.response?.data?.message || 'Failed to assign roles');
    }
  };

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => user && user.userId && user.email) // Filter out invalid user objects
      .filter(user => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesName = user.name?.toLowerCase().includes(query);
          const matchesEmail = user.email.toLowerCase().includes(query);
          
          if (!matchesName && !matchesEmail) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'active' && user.invitationStatus !== 'active') return false;
          if (statusFilter === 'pending' && user.invitationStatus !== 'pending') return false;
          if (statusFilter === 'inactive' && user.invitationStatus !== 'setup_required') return false;
        }

        // Role filter
        if (roleFilter !== 'all') {
          const userRoles = user.roles || [];
          if (roleFilter === 'admin' && !user.isTenantAdmin) return false;
          if (roleFilter !== 'admin' && !userRoles.some(role => role.roleId === roleFilter)) return false;
        }

        return true;
      }).sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name?.toLowerCase() || '';
            bValue = b.name?.toLowerCase() || '';
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'created':
            aValue = new Date(a.invitedAt || 0);
            bValue = new Date(b.invitedAt || 0);
            break;
          case 'lastLogin':
            aValue = new Date(a.lastLoginAt || 0);
            bValue = new Date(b.lastLoginAt || 0);
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [users, searchQuery, statusFilter, roleFilter, sortBy, sortOrder]);

  const selectAllUsers = useCallback(() => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.userId)));
  }, [filteredUsers]);

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  const getUserStatus = (user: User) => {
    if (!user.isActive) return 'Pending';
    if (!user.onboardingCompleted) return 'Setup Required';
    return 'Active';
  };

  const getStatusColor = (user: User) => {
    const status = getUserStatus(user);
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Setup Required': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Generate invitation URL for a user
  const generateInvitationUrl = (user: User) => {
    if (user.invitationStatus === 'pending' || user.userType === 'invited') {
      let invitationToken = null;
      let tokenSource = 'unknown';
      
      // Priority order for finding invitation token:
      // 1. Check invitationId field (extracted during transformation)
      if (user.invitationId && user.invitationId.length > 20) {
        invitationToken = user.invitationId;
        tokenSource = 'user.invitationId';
      }
      // 2. Check originalData.invitationToken (direct case - this is the actual token from database)
      else if (user.originalData?.invitationToken) {
        invitationToken = user.originalData.invitationToken;
        tokenSource = 'originalData.invitationToken';
      }
      // 3. Check originalData.user.invitationToken (nested case)
      else if (user.originalData?.user?.invitationToken) {
        invitationToken = user.originalData.user.invitationToken;
        tokenSource = 'originalData.user.invitationToken';
      }
      // 4. Check if this is a direct invitation (has invitationId starting with 'inv_')
      else if (user.userId && user.userId.startsWith('inv_')) {
        invitationToken = user.userId.replace('inv_', '');
        tokenSource = 'user.userId (inv_ prefix)';
      }
      // 5. Check if originalData.user has an invitationId field
      else if (user.originalData?.user?.invitationId) {
        invitationToken = user.originalData.user.invitationId;
        tokenSource = 'originalData.user.invitationId';
      }
      
      if (invitationToken) {
        const baseUrl = window.location.origin;
        const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
        console.log(`🔗 Generated invitation URL for ${user.email}:`, {
          invitationUrl,
          tokenSource,
          invitationToken
        });
        return invitationUrl;
      } else {
        console.warn(`⚠️ Could not find invitation token for user ${user.email}:`, {
          user,
          tokenSource
        });
        return null;
      }
    }
    return null;
  };

  // Copy invitation URL to clipboard
  const copyInvitationUrl = async (user: User) => {
    const invitationUrl = generateInvitationUrl(user);
    if (invitationUrl) {
      try {
        await navigator.clipboard.writeText(invitationUrl);
        toast.success('Invitation URL copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy invitation URL:', error);
        toast.error('Failed to copy invitation URL');
      }
    } else {
      toast.error('No invitation URL available for this user');
    }
  };

  // Organization Assignment Functions
  const getUserOrgAssignments = (userId: string) => {
    return organizationAssignments?.filter((assignment) => assignment.userId === userId) || [];
  };

  const getUserPrimaryOrgAssignment = (userId: string) => {
    return organizationAssignments?.find((assignment) =>
      assignment.userId === userId && assignment.isPrimary
    );
  };

  const getUserOrgAssignment = (userId: string) => {
    // For backward compatibility, return primary assignment
    return getUserPrimaryOrgAssignment(userId);
  };

  const handleAssignOrg = (user: User) => {
    setSelectedUserForOrg(user);
    setOrgAssignmentForm({
      organizationId: '',
      assignmentType: 'primary',
      priority: 1
    });
    setShowOrgAssignmentModal(true);
  };

  const handleSubmitOrgAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForOrg || !orgAssignmentForm.organizationId) {
      toast.error('Please select an organization');
      return;
    }

    try {
      const response = await api.post(`/tenants/current/users/${selectedUserForOrg.userId}/assign-organization`, {
        organizationId: orgAssignmentForm.organizationId,
        assignmentType: orgAssignmentForm.assignmentType,
        priority: orgAssignmentForm.priority
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Organization assigned successfully!');
        setShowOrgAssignmentModal(false);
        // Reload users and assignments
        await loadUsers();
      } else {
        toast.error(response.data.message || 'Failed to assign organization');
      }
    } catch (error: any) {
      console.error('Error assigning organization:', error);

      // Handle specific validation errors from backend
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 400) {
        toast.error('User already has an organization assigned. Remove the current assignment first.');
      } else {
        toast.error('Failed to assign organization');
      }
    }
  };

  const handleRemoveOrgAssignment = (userId: string, assignment: any) => {
    setOrgToRemove({ userId, assignment });
    setShowRemoveOrgModal(true);
  };

  const confirmRemoveOrgAssignment = async () => {
    if (!orgToRemove) return;

    try {
      const response = await api.delete(`/tenants/current/users/${orgToRemove.userId}/remove-organization`, {
        data: {
          organizationId: orgToRemove.assignment.entityId
        }
      });

      if (response.data.success) {
        toast.success('Organization assignment removed successfully!');
        // Reload users and assignments
        await loadUsers();
        await loadOrganizationAssignments();
      } else {
        toast.error(response.data.message || 'Failed to remove organization assignment');
      }
    } catch (error: any) {
      console.error('Error removing organization assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to remove organization assignment');
    } finally {
      setShowRemoveOrgModal(false);
      setOrgToRemove(null);
    }
  };

  // Generate dynamic actions for each user
  const getUserTableActions = (user: User): TableAction<User>[] => {
    const baseActions: TableAction<User>[] = [
      {
        key: 'view',
        label: 'View Details',
        icon: Eye,
        onClick: (user) => {
          setViewingUser(user);
          setShowUserModal(true);
        }
      },
      {
        key: 'edit',
        label: 'Edit User',
        icon: Edit,
        onClick: (user) => handleEditUser(user)
      },
      {
        key: 'assignRoles',
        label: 'Assign Roles',
        icon: UserCog,
        onClick: (user) => handleAssignRoles(user)
      },
      {
        key: 'assignOrg',
        label: 'Assign Organization',
        icon: Building2,
        onClick: (user) => handleAssignOrg(user)
      }
    ];

    // Add dynamic remove buttons for each organization assignment
    const userAssignments = getUserOrgAssignments(user.userId);
    const removeActions: TableAction<User>[] = userAssignments.map((assignment: any) => ({
      key: `removeOrg_${assignment.membershipId}`,
      label: `Remove from ${assignment.entityName}`,
      icon: UserX,
      onClick: () => handleRemoveOrgAssignment(user.userId, assignment)
    }));

    const finalActions: TableAction<User>[] = [
      ...baseActions,
      ...removeActions,
      {
        key: 'promote',
        label: 'Promote to Admin',
        icon: Crown,
        onClick: (user) => handlePromoteUser(user.userId, user.name || user.email),
        disabled: (user) => user.isTenantAdmin
      },
      {
        key: 'reactivate',
        label: 'Reactivate User',
        icon: UserCheck,
        onClick: (user) => handleReactivateUser(user.userId, user.name || user.email),
        disabled: (user) => user.isActive,
        separator: true
      },
      {
        key: 'deactivate',
        label: 'Deactivate User',
        icon: UserX,
        onClick: (user) => handleDeactivateUser(user.userId, user.name || user.email),
        disabled: (user) => !user.isActive
      },
      {
        key: 'delete',
        label: 'Delete User',
        icon: Trash2,
        onClick: (user) => {
          setDeletingUser(user);
          setShowDeleteModal(true);
        }
      }
    ];

    return finalActions;
  };

  // Table columns configuration
  const userTableColumns: TableColumn<User>[] = [
    {
      key: 'user',
      label: 'User',
      width: '300px',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
            style={{ 
              background: user.avatar ? `url(${user.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {!user.avatar && (user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {user.name || 'Unnamed User'}
            </div>
            <div className="text-sm text-gray-500 dark:text-white truncate">{user.email}</div>
            {user.department && (
              <div className="text-xs text-gray-400 dark:text-white truncate">{user.department}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'roles',
      label: 'Roles & Status',
      width: '200px',
      render: (user) => (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {user.isTenantAdmin && (
              <Badge className="bg-purple-100 text-purple-800">
                <Crown className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
            {user.roles?.map(role => (
              <Badge key={role.roleId} variant="outline" className="text-xs">
                {role.roleName}
              </Badge>
            ))}
            {!user.isTenantAdmin && (!user.roles || user.roles.length === 0) && (
              <Badge variant="outline" className="text-gray-500 dark:text-white">No roles</Badge>
            )}
          </div>
          <Badge className={getStatusColor(user)}>
            {getUserStatus(user)}
          </Badge>

          {/* Organization Assignment Display */}
          {(() => {
            const userAssignments = getUserOrgAssignments(user.userId);
            const primaryAssignment = userAssignments.find(a => a.isPrimary);
            const otherAssignments = userAssignments.filter(a => !a.isPrimary);

            return userAssignments.length > 0 ? (
              <div className="space-y-2 mt-2">
                {/* Primary Organization */}
                {primaryAssignment && (
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${
                      actualTheme === 'dark'
                        ? 'bg-purple-500/20'
                        : actualTheme === 'monochrome'
                        ? 'bg-gray-500/20'
                        : 'bg-blue-50'
                    }`}>
                      <Building2 className="h-3 w-3 text-blue-600" />
                  </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {primaryAssignment.entityName}
                      </div>
                      <Badge className={`text-xs px-1 py-0 ${
                        actualTheme === 'dark'
                          ? 'bg-blue-600 text-blue-100'
                          : actualTheme === 'monochrome'
                          ? 'bg-blue-600 text-blue-100'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        Primary
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Other Organizations Count */}
                {otherAssignments.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-white">
                    +{otherAssignments.length} other organization{otherAssignments.length !== 1 ? 's' : ''}
                  </div>
                )}

                {/* View All Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingOrganizationsUser(user)}
                  className={`h-6 px-2 text-xs ${
                    actualTheme === 'dark'
                      ? 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/20'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300 hover:text-gray-200 hover:bg-gray-500/20'
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View All
                </Button>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-white mt-2">
                <Building2 className="h-3 w-3 inline mr-1 opacity-50" />
                No organization assigned
              </div>
            );
          })()}
        </div>
      )
    },
    {
      key: 'activity',
      label: 'Last Activity',
      width: '150px',
      render: (user) => (
        <div className="text-sm">
          <div className="text-gray-900 dark:text-white">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
          </div>
          <div className="text-gray-500 dark:text-white">
            {user.lastLoginAt ? 'Last login' : 'No login'}
          </div>
        </div>
      )
    },
    {
      key: 'invited',
      label: 'Invited',
      width: '150px',
      render: (user) => (
        <div className="text-sm">
          <div className="text-gray-900 dark:text-white">
            {user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-gray-500 dark:text-white">
            {user.invitedBy ? `by ${user.invitedBy}` : ''}
          </div>
        </div>
      )
    },
    {
      key: 'invitationUrl',
      label: 'Invitation URL',
      width: '200px',
      render: (user) => {
        if (user.invitationStatus === 'pending') {
          const invitationUrl = generateInvitationUrl(user);
          return (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 dark:text-white">Pending Invitation</div>
              {invitationUrl ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invitationUrl}
                    readOnly
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-gray-50 flex-1"
                  />
                  <button
                    onClick={() => copyInvitationUrl(user)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="Copy invitation URL"
                  >
                    <Mail className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-red-600">No URL available</div>
              )}
            </div>
          );
        }
        return <div className="text-xs text-gray-400 dark:text-white">-</div>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '80px',
      render: (user) => {
        const userActions = getUserTableActions(user);
        const primaryActions = userActions.filter(action => action.key === 'view' || action.key === 'edit');
        const secondaryActions = userActions.filter(action => action.key !== 'view' && action.key !== 'edit');

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${
                  actualTheme === 'dark'
                    ? 'text-purple-300 hover:bg-purple-500/20'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300 hover:bg-gray-500/20'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={`w-56 ${
                actualTheme === 'dark'
                  ? 'bg-slate-800/95 border-purple-500/30'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/95 border-gray-500/30'
                  : 'bg-white'
              }`}
            >
              {/* Primary Actions */}
              {primaryActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  onClick={() => action.onClick(user)}
                  disabled={action.disabled?.(user)}
                  className={`${
                    action.variant === 'destructive'
                      ? actualTheme === 'dark'
                        ? 'text-red-400 focus:text-red-300 focus:bg-red-500/20'
                        : actualTheme === 'monochrome'
                        ? 'text-red-400 focus:text-red-300 focus:bg-red-500/20'
                        : 'text-red-600 focus:text-red-500 focus:bg-red-50'
                      : actualTheme === 'dark'
                      ? 'text-purple-300 focus:text-purple-200 focus:bg-purple-500/20'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300 focus:text-gray-200 focus:bg-gray-500/20'
                      : 'text-gray-700 focus:text-gray-900 focus:bg-gray-100'
                  }`}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {typeof action.label === 'function' ? action.label(user) : action.label}
                </DropdownMenuItem>
              ))}

              {/* Separator if there are both primary and secondary actions */}
              {primaryActions.length > 0 && secondaryActions.length > 0 && (
                <DropdownMenuSeparator className={
                  actualTheme === 'dark'
                    ? 'bg-purple-500/30'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-500/30'
                    : 'bg-gray-200'
                } />
              )}

              {/* Secondary Actions */}
              {secondaryActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  onClick={() => action.onClick(user)}
                  disabled={action.disabled?.(user)}
                  className={`${
                    action.variant === 'destructive'
                      ? actualTheme === 'dark'
                        ? 'text-red-400 focus:text-red-300 focus:bg-red-500/20'
                        : actualTheme === 'monochrome'
                        ? 'text-red-400 focus:text-red-300 focus:bg-red-500/20'
                        : 'text-red-600 focus:text-red-500 focus:bg-red-50'
                      : actualTheme === 'dark'
                      ? 'text-purple-300 focus:text-purple-200 focus:bg-purple-500/20'
                      : actualTheme === 'monochrome'
                      ? 'text-gray-300 focus:text-gray-200 focus:bg-gray-500/20'
                      : 'text-gray-700 focus:text-gray-900 focus:bg-gray-100'
                  }`}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {typeof action.label === 'function' ? action.label(user) : action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  // Table actions configuration

  return (
    <div className={`min-h-screen relative ${
      glassmorphismEnabled
        ? 'dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 dark:text-white bg-white text-gray-900'
        : 'dark:bg-black dark:text-white bg-white text-gray-900'
    }`}>
      {/* Background */}
      <div className={`absolute inset-0 ${glassmorphismEnabled ? 'bg-gradient-to-br from-violet-100/30 via-purple-100/15 to-indigo-100/10 dark:from-slate-950/40 dark:via-slate-900/25 dark:to-slate-950/40 backdrop-blur-3xl' : ''}`}></div>

      {/* Purple gradient glassy effect */}
      {glassmorphismEnabled && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/12 via-violet-200/8 to-indigo-200/10 dark:from-purple-500/10 dark:via-violet-500/6 dark:to-indigo-500/8 backdrop-blur-3xl"></div>
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30 dark:block hidden">
        <Pattern />
      </div>

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
      <div className="relative rounded-2xl z-10">
        {/* Purple gradient glassy effect */}
        {glassmorphismEnabled && (
          <div className="absolute inset-0 backdrop-blur-3xl bg-gradient-to-br from-purple-200/8 via-violet-200/5 to-indigo-200/6 dark:from-purple-500/6 dark:via-violet-500/3 dark:to-indigo-500/4 rounded-3xl"></div>
        )}
        <div className="bg-white dark:bg-black border dark:border-gray-600 rounded-lg">
          <div className="p-4 space-y-4">
      {/* Header */}
      <UserManagementHeader onInviteClick={() => setShowInviteModal(true)} />


      {/* Statistics Cards */}
      <UserStatsCards users={users} selectedEntityId={selectedEntityId} />


  

      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        columns={userTableColumns}
        loading={loading}
        selectedUsers={selectedUsers}
        onSelectionChange={setSelectedUsers}
      />

      {/* Enhanced Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roles={roles}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        onInvite={handleInviteUser}
        availableEntities={availableEntities}
        entitiesLoading={entitiesLoading}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        user={viewingUser}
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setViewingUser(null);
        }}
        generateInvitationUrl={generateInvitationUrl}
        copyInvitationUrl={copyInvitationUrl}
      />

      {/* Role Assignment Modal */}
      <Dialog open={showRoleAssignModal} onOpenChange={setShowRoleAssignModal}>
        <DialogContent className={`max-w-md ${
          glassmorphismEnabled
            ? actualTheme === 'dark'
              ? 'backdrop-blur-3xl bg-black/95 border border-purple-500/30 text-white'
              : actualTheme === 'monochrome'
              ? 'backdrop-blur-3xl bg-black/95 border border-gray-500/30 text-gray-100'
              : 'backdrop-blur-3xl bg-white/95 border border-purple-300/60 text-gray-900'
            : actualTheme === 'dark'
            ? 'bg-black/95 border border-slate-700 text-white'
            : actualTheme === 'monochrome'
            ? 'bg-black/95 border border-gray-500/30 text-gray-100'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }>
              Assign Roles
            </DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-600'
            }>
              Assign roles to {assigningUser?.name || assigningUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className={`text-sm font-medium ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                Available Roles
              </Label>
              
              {/* Debug info */}
              <div className={`text-xs p-2 rounded ${
                actualTheme === 'dark'
                  ? 'text-purple-300 bg-slate-800/50'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-300 bg-gray-800/50'
                  : 'text-gray-500 bg-gray-100'
              }`}>
                Debug: {roles.length} roles loaded
                {roles.length > 0 && (
                  <div className="mt-1">
                    {roles.map(role => `${role.roleName} (${role.roleId})`).join(', ')}
                  </div>
                )}
              </div>
              
              {roles.length === 0 ? (
                <div className={`text-center py-4 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-gray-500'
                }`}>
                  <div className={`animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2 ${
                    actualTheme === 'dark'
                      ? 'border-purple-400'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-300'
                      : 'border-blue-600'
                  }`}></div>
                  <p>Loading roles...</p>
                  <p className="text-xs">Please wait while we fetch available roles</p>
                </div>
              ) : (
                roles.map((role) => (
                  <div key={role.roleId} className="flex items-center space-x-3">
                    <Checkbox
                      id={role.roleId}
                      checked={selectedRoles.includes(role.roleId)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, role.roleId]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(id => id !== role.roleId));
                        }
                      }}
                      className={
                        actualTheme === 'dark'
                          ? 'border-purple-500/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600'
                          : actualTheme === 'monochrome'
                          ? 'border-gray-500/30 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600'
                          : ''
                      }
                    />
                    <label htmlFor={role.roleId} className="flex items-center gap-2 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${role.color}20`, color: role.color }}
                        >
                          {role.icon || '👤'}
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${
                            actualTheme === 'dark'
                              ? 'text-white'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-100'
                              : 'text-gray-900'
                          }`}>
                            {role.roleName}
                          </div>
                          <div className={`text-xs ${
                            actualTheme === 'dark'
                              ? 'text-white'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-300'
                              : 'text-gray-500'
                          }`}>
                            {role.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <PearlButton
                variant="secondary"
                onClick={() => setShowRoleAssignModal(false)}
                className="flex-1"
              >
                Cancel
              </PearlButton>
              <PearlButton
                onClick={handleSaveRoleAssignment}
                className="flex-1 text-xs px-3 py-2"
              >
                Save Changes
              </PearlButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className={`max-w-md ${
          glassmorphismEnabled
            ? actualTheme === 'dark'
              ? 'backdrop-blur-3xl bg-black/95 border border-purple-500/30 text-white'
              : actualTheme === 'monochrome'
              ? 'backdrop-blur-3xl bg-black/95 border border-gray-500/30 text-gray-100'
              : 'backdrop-blur-3xl bg-white/95 border border-purple-300/60 text-gray-900'
            : actualTheme === 'dark'
            ? 'bg-black/95 border border-slate-700 text-white'
            : actualTheme === 'monochrome'
            ? 'bg-black/95 border border-gray-500/30 text-gray-100'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }>
              Edit User
            </DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-600'
            }>
              Edit user details for {editingUser?.name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                Name *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg focus:ring-2 transition-colors ${
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                Email *
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg focus:ring-2 transition-colors ${
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                Title
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg focus:ring-2 transition-colors ${
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                Department
              </label>
              <input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg focus:ring-2 transition-colors ${
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Technology"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <PearlButton
                variant="secondary"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </PearlButton>
              <PearlButton
                onClick={handleSaveUserEdit}
                className="flex-1 text-xs px-3 py-2"
              >
                Save Changes
              </PearlButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className={`max-w-md ${
          glassmorphismEnabled
            ? actualTheme === 'dark'
              ? 'backdrop-blur-3xl bg-black/95 border border-purple-500/30 text-white'
              : actualTheme === 'monochrome'
              ? 'backdrop-blur-3xl bg-black/95 border border-gray-500/30 text-gray-100'
              : 'backdrop-blur-3xl bg-white/95 border border-purple-300/60 text-gray-900'
            : actualTheme === 'dark'
            ? 'bg-black/95 border border-slate-700 text-white'
            : actualTheme === 'monochrome'
            ? 'bg-black/95 border border-gray-500/30 text-gray-100'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }>
              Delete User
            </DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-600'
            }>
              Are you sure you want to delete {deletingUser?.name || deletingUser?.email}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className={`flex-1 ${
                actualTheme === 'dark'
                  ? 'border-purple-500/30 text-purple-200 hover:bg-purple-500/10'
                  : actualTheme === 'monochrome'
                  ? 'border-gray-500/30 text-gray-200 hover:bg-gray-500/10'
                  : ''
              }`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              className={`flex-1 ${
                actualTheme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700'
                  : actualTheme === 'monochrome'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }`}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Organization Assignment Modal */}
      {showOrgAssignmentModal && selectedUserForOrg && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 ${
          glassmorphismEnabled
            ? 'bg-black/60 backdrop-blur-sm'
            : 'bg-black bg-opacity-50'
        }`}>
          <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 ${
            glassmorphismEnabled
              ? actualTheme === 'dark'
                ? 'backdrop-blur-3xl bg-black/95 border border-purple-500/30'
                : actualTheme === 'monochrome'
                ? 'backdrop-blur-3xl bg-black/95 border border-gray-500/30'
                : 'backdrop-blur-3xl bg-white/95 border border-purple-300/60'
              : actualTheme === 'dark'
              ? 'bg-black border border-slate-700'
              : actualTheme === 'monochrome'
              ? 'bg-black border border-gray-500/30'
              : 'bg-white border border-gray-200'
          }`}>
            <div className={`flex items-center justify-between p-6 border-b ${
              actualTheme === 'dark'
                ? 'border-purple-500/30'
                : actualTheme === 'monochrome'
                ? 'border-gray-500/30'
                : 'border-gray-200'
            }`}>
              <div>
                <h2 className={`text-xl font-semibold ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-100'
                    : 'text-gray-900'
                }`}>
                  Assign to Organization
                </h2>
                <p className={`text-sm mt-1 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-gray-600'
                }`}>
                  {getUserOrgAssignment(selectedUserForOrg.userId)
                    ? 'Assign this user to an additional organization'
                    : 'Assign this user to an organization (users can belong to multiple organizations)'}
                </p>
              </div>
              <button
                onClick={() => setShowOrgAssignmentModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  actualTheme === 'dark'
                    ? 'hover:bg-purple-500/20 text-purple-200'
                    : actualTheme === 'monochrome'
                    ? 'hover:bg-gray-500/20 text-gray-200'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrgAssignment} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-gray-700'
                }`}>
                  Organization *
                </label>
                <Select
                  value={orgAssignmentForm.organizationId}
                  onValueChange={(value) => setOrgAssignmentForm(prev => ({ ...prev, organizationId: value }))}
                >
                  <SelectTrigger className={
                    actualTheme === 'dark'
                      ? 'bg-slate-800/50 border-purple-500/30 text-white'
                      : actualTheme === 'monochrome'
                      ? 'bg-gray-800/50 border-gray-500/30 text-gray-100'
                      : ''
                  }>
                    <SelectValue placeholder={entitiesLoading ? "Loading organizations..." : "Select organization"} />
                  </SelectTrigger>
                  <SelectContent>
                    {entitiesLoading ? (
                      <SelectItem value="loading" disabled>Loading organizations...</SelectItem>
                    ) : availableEntities.filter(entity => entity.entityType && entity.entityType === 'organization').length > 0 ? (
                      availableEntities
                        .filter(entity => entity.entityType && entity.entityType === 'organization')
                        .map((org) => (
                          <SelectItem key={org.entityId} value={org.entityId}>
                            {org.displayName || org.entityName}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="none" disabled>No organizations available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-gray-700'
                }`}>
                  Assignment Type
                </label>
                <Select
                  value={orgAssignmentForm.assignmentType}
                  onValueChange={(value: any) => setOrgAssignmentForm(prev => ({ ...prev, assignmentType: value }))}
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
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-gray-700'
                }`}>
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={orgAssignmentForm.priority}
                  onChange={(e) => setOrgAssignmentForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 rounded-md focus:ring-2 transition-colors ${
                    actualTheme === 'dark'
                      ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                      : actualTheme === 'monochrome'
                      ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <PearlButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowOrgAssignmentModal(false)}
                >
                  Cancel
                </PearlButton>
                <PearlButton
                  type="submit"
                  className="text-xs px-3 py-2"
                >
                  Assign Organization
                </PearlButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Organization Modal */}
      <Dialog open={showRemoveOrgModal} onOpenChange={setShowRemoveOrgModal}>
        <DialogContent className={`max-w-md ${
          glassmorphismEnabled
            ? actualTheme === 'dark'
              ? 'backdrop-blur-3xl bg-black/95 border border-purple-500/30 text-white'
              : actualTheme === 'monochrome'
              ? 'backdrop-blur-3xl bg-black/95 border border-gray-500/30 text-gray-100'
              : 'backdrop-blur-3xl bg-white/95 border border-purple-300/60 text-gray-900'
            : actualTheme === 'dark'
            ? 'bg-black/95 border border-slate-700 text-white'
            : actualTheme === 'monochrome'
            ? 'bg-black/95 border border-gray-500/30 text-gray-100'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }>
              Remove Organization Assignment
            </DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-600'
            }>
              Are you sure you want to remove {orgToRemove?.assignment.entityName} from{' '}
              {orgToRemove && users.find(u => u.userId === orgToRemove.userId)?.name}?
              {orgToRemove?.assignment.isPrimary && (
                <span className={`block mt-2 font-medium ${
                  actualTheme === 'dark'
                    ? 'text-orange-400'
                    : actualTheme === 'monochrome'
                    ? 'text-orange-400'
                    : 'text-orange-600'
                }`}>
                  ⚠️ This is their primary organization. Another organization will be set as primary if available.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <PearlButton
              variant="secondary"
              onClick={() => setShowRemoveOrgModal(false)}
              className="flex-1"
            >
              Cancel
            </PearlButton>
            <PearlButton
              onClick={confirmRemoveOrgAssignment}
              className="flex-1"
            >
              Remove
            </PearlButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* View All Organizations Modal */}
      <Dialog open={!!viewingOrganizationsUser} onOpenChange={() => setViewingOrganizationsUser(null)}>
        <DialogContent className={`max-w-2xl max-h-[80vh] overflow-y-auto ${
          glassmorphismEnabled
            ? actualTheme === 'dark'
              ? 'backdrop-blur-3xl bg-black/95 border border-purple-500/30 text-white'
              : actualTheme === 'monochrome'
              ? 'backdrop-blur-3xl bg-black/95 border border-gray-500/30 text-gray-100'
              : 'backdrop-blur-3xl bg-white/95 border border-purple-300/60 text-gray-900'
            : actualTheme === 'dark'
            ? 'bg-black/95 border border-slate-700 text-white'
            : actualTheme === 'monochrome'
            ? 'bg-black/95 border border-gray-500/30 text-gray-100'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-100'
                : 'text-gray-900'
            }>
              Organizations Assigned to {viewingOrganizationsUser?.name || viewingOrganizationsUser?.email}
            </DialogTitle>
            <DialogDescription className={
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-gray-600'
            }>
              {viewingOrganizationsUser && (() => {
                const assignments = getUserOrgAssignments(viewingOrganizationsUser.userId);
                return `${assignments.length} organization${assignments.length !== 1 ? 's' : ''} assigned`;
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {viewingOrganizationsUser && (() => {
              const assignments = getUserOrgAssignments(viewingOrganizationsUser.userId);
              return assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <div
                    key={assignment.membershipId}
                    className={`p-4 rounded-lg border ${
                      actualTheme === 'dark'
                        ? 'bg-slate-800/50 border-purple-500/20'
                        : actualTheme === 'monochrome'
                        ? 'bg-gray-800/50 border-gray-500/20'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          actualTheme === 'dark'
                            ? 'bg-purple-500/20 text-purple-300'
                            : actualTheme === 'monochrome'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={`font-medium ${
                            actualTheme === 'dark'
                              ? 'text-white'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-100'
                              : 'text-gray-900'
                          }`}>
                            {assignment.entityName}
                          </div>
                          <div className={`text-sm ${
                            actualTheme === 'dark'
                              ? 'text-white'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-300'
                              : 'text-gray-600'
                          }`}>
                            Access Level: {assignment.accessLevel}
                            {assignment.department && ` • Department: ${assignment.department}`}
                            {assignment.jobTitle && ` • ${assignment.jobTitle}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignment.isPrimary && (
                          <Badge className={`${
                            actualTheme === 'dark'
                              ? 'bg-blue-600 text-blue-100'
                              : actualTheme === 'monochrome'
                              ? 'bg-blue-600 text-blue-100'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            Primary
                          </Badge>
                        )}
            <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOrgAssignment(viewingOrganizationsUser.userId, assignment)}
                          className={`${
                actualTheme === 'dark'
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                  : actualTheme === 'monochrome'
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                              : 'text-red-600 hover:text-red-500 hover:bg-red-50'
              }`}
                          title={`Remove from ${assignment.entityName}`}
            >
                          <UserX className="w-4 h-4" />
            </Button>
                      </div>
                    </div>
                    {assignment.joinedAt && (
                      <div className={`text-xs mt-2 ${
                        actualTheme === 'dark'
                          ? 'text-white'
                          : actualTheme === 'monochrome'
                          ? 'text-gray-400'
                          : 'text-gray-500'
                      }`}>
                        Joined: {new Date(assignment.joinedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className={`text-center py-8 ${
                  actualTheme === 'dark'
                    ? 'text-white'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-gray-500'
                }`}>
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No organizations assigned</p>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end pt-4">
            <PearlButton
              variant="secondary"
              onClick={() => setViewingOrganizationsUser(null)}
            >
              Close
            </PearlButton>
          </div>
        </DialogContent>
      </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
