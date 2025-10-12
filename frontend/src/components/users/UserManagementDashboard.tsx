import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Settings,
  CheckSquare,
  Square,
  RefreshCw,
  Shield,
  Crown,
  Activity,
  Clock,
  ChevronDown,
  Send,
  X,
  Building,
  Calendar,
  UserCog,
  UserX,
  UserCheck,
  Save,
  AlertTriangle,
  Building2
} from 'lucide-react';
import api from '@/lib/api';
import { ReusableTable, TableColumn, TableAction } from '@/components/common/ReusableTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

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

export function UserManagementDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [organizationAssignments, setOrganizationAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showOrgAssignmentModal, setShowOrgAssignmentModal] = useState(false);
  const [showRemoveOrgModal, setShowRemoveOrgModal] = useState(false);
  const [selectedUserForOrg, setSelectedUserForOrg] = useState<User | null>(null);
  const [orgToRemove, setOrgToRemove] = useState<{ userId: string; assignment: any } | null>(null);
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

  // Load users, roles, and entities
  useEffect(() => {
    loadRoles();
    loadEntities();
  }, []);

  // Load users after roles are loaded
  useEffect(() => {
    if (roles.length > 0) {
      loadUsers(selectedEntityId);
    }
  }, [roles, selectedEntityId]);

  // Load entities when invite modal opens (fallback, entities are now loaded on mount)
  useEffect(() => {
    if (showInviteModal && availableEntities.length === 0) {
      loadEntities();
    }
  }, [showInviteModal, availableEntities.length]);

  const loadUsers = async (entityId?: string | null) => {
    setLoading(true);
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
        const validUsers = transformedUsers.filter(user => 
          user && 
          typeof user === 'object' && 
          user.userId && 
          typeof user.email === 'string'
        );
        
        console.log('✅ Valid users after filtering:', validUsers);
        
        // Debug: Log the final transformed users to see their structure
        console.log('🔍 Final transformed users structure:', transformedUsers.map(user => ({
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

            if (Array.isArray(item.memberships)) {
              item.memberships.forEach((membership: any) => {
                if (membership?.entityId) {
                  membershipIds.add(String(membership.entityId));
                }
              });
            }

            if (Array.isArray(item.entityMemberships)) {
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

  const selectAllUsers = useCallback(() => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.userId)));
  }, [users]);

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set());
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
    return organizationAssignments?.filter((assignment: any) => assignment.userId === userId) || [];
  };

  const getUserPrimaryOrgAssignment = (userId: string) => {
    return organizationAssignments?.find((assignment: any) =>
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
          organizationId: orgToRemove.assignment.organizationId
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
        onClick: (user) => handleAssignOrg(user),
        variant: 'ghost' as const,
        className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
      }
    ];

    // Add dynamic remove buttons for each organization assignment
    const userAssignments = getUserOrgAssignments(user.userId);
    const removeActions: TableAction<User>[] = userAssignments.map((assignment: any) => ({
      key: `removeOrg_${assignment.assignmentId}`,
      label: `Remove from ${assignment.organizationName}`,
      icon: UserX,
      onClick: () => handleRemoveOrgAssignment(user.userId, assignment),
      variant: 'ghost' as const,
      className: 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
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
            <div className="font-medium text-gray-900 truncate">
              {user.name || 'Unnamed User'}
            </div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>
            {user.department && (
              <div className="text-xs text-gray-400 truncate">{user.department}</div>
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
              <Badge variant="outline" className="text-gray-500">No roles</Badge>
            )}
          </div>
          <Badge className={getStatusColor(user)}>
            {getUserStatus(user)}
          </Badge>

          {/* Organization Assignment Display */}
          {(() => {
            const userAssignments = getUserOrgAssignments(user.userId);
            return userAssignments.length > 0 ? (
              <div className="space-y-1 mt-1">
                {userAssignments.slice(0, 2).map((assignment: any) => (
                  <div key={assignment.assignmentId} className="flex items-center gap-1 text-xs text-gray-600">
                    <Building2 className="h-3 w-3" />
                    <span>
                      {assignment.organizationName}
                      {assignment.isPrimary && <Badge className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0">Primary</Badge>}
                      ({assignment.assignmentType})
                    </span>
                  </div>
                ))}
                {userAssignments.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{userAssignments.length - 2} more organizations
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">No organization assigned</div>
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
          <div className="text-gray-900">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
          </div>
          <div className="text-gray-500">
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
          <div className="text-gray-900">
            {user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-gray-500">
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
              <div className="text-xs text-gray-600">Pending Invitation</div>
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
        return <div className="text-xs text-gray-400">-</div>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '400px',
      render: (user) => {
        const userActions = getUserTableActions(user);
        return (
          <div className="flex flex-wrap gap-1">
            {userActions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant || 'ghost'}
                size="sm"
                onClick={() => action.onClick(user)}
                disabled={action.disabled?.(user)}
                className={`text-xs ${action.className || ''}`}
                title={typeof action.label === 'function' ? action.label(user) : action.label}
              >
                <action.icon className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">
                  {typeof action.label === 'function' ? action.label(user) : action.label}
                </span>
              </Button>
            ))}
          </div>
        );
      }
    }
  ];

  // Table actions configuration

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage team members, roles, and permissions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Entity Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter by Organization:</span>
          </div>
          <Select value={selectedEntityId || "all"} onValueChange={(value) => setSelectedEntityId(value === "all" ? null : value)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {availableEntities.map((entity) => (
                <SelectItem key={entity.entityId} value={entity.entityId}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <Building className="w-3 h-3 flex-shrink-0" />
                        <span className="font-mono">
                          {entity.displayName || entity.entityName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Badge variant="outline" className="flex-shrink-0">
                          {entity.entityType}
                        </Badge>
                        {entityUserCounts[entity.entityId] !== undefined && (
                          <span>
                            {entityUserCounts[entity.entityId]} user
                            {entityUserCounts[entity.entityId] === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEntityId && (
            <button
              onClick={() => setSelectedEntityId(null)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear filter
            </button>
          )}
          <button
            onClick={() => loadEntities()}
            disabled={entitiesLoading}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${entitiesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {selectedEntityId && (
          <div className="mt-2 text-sm text-gray-600">
            Showing users for: <span className="font-medium">
              {availableEntities.find(e => e.entityId === selectedEntityId)?.entityName || 'Unknown Organization'}
            </span>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Users {selectedEntityId ? '(Filtered)' : ''}
              </p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.isActive && u.onboardingCompleted).length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Invites</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => !u.isActive).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.isTenantAdmin).length}
              </p>
            </div>
            <Crown className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRoleFilter('all');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Organization Admin</option>
                {roles.map(role => (
                  <option key={role.roleId} value={role.roleId}>{role.roleName}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="email-asc">Email A-Z</option>
                <option value="email-desc">Email Z-A</option>
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="lastLogin-desc">Recent Login</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadUsers}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-800 font-medium">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Bulk Actions
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Assignments Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Organization Assignments</h3>
          </div>
          <span className="text-sm text-gray-500">{organizationAssignments.length} assignments</span>
        </div>

        {assignmentsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading assignments...</p>
          </div>
        ) : organizationAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizationAssignments.slice(0, 6).map((assignment: any) => (
              <div key={assignment.assignmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{assignment.userName}</div>
                    <div className="text-xs text-gray-600">{assignment.organizationName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.isPrimary && (
                    <Badge className="text-xs bg-blue-100 text-blue-800">Primary</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {assignment.assignmentType}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No organization assignments yet</p>
            <p className="text-xs">Assign users to organizations to get started</p>
          </div>
        )}

        {organizationAssignments.length > 6 && (
          <div className="text-sm text-gray-500 text-center mt-4">
            And {organizationAssignments.length - 6} more assignments...
          </div>
        )}
      </div>

      {/* Users Table */}
      <ReusableTable<User>
        data={filteredUsers}
        columns={userTableColumns}
        selectable={true}
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        getItemId={(user) => user.userId}
        loading={loading}
        emptyMessage="No users found matching your filters"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Roles</DialogTitle>
            <DialogDescription>
              Assign roles to {assigningUser?.name || assigningUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Available Roles</Label>
              
              {/* Debug info */}
              <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                Debug: {roles.length} roles loaded
                {roles.length > 0 && (
                  <div className="mt-1">
                    {roles.map(role => `${role.roleName} (${role.roleId})`).join(', ')}
                  </div>
                )}
              </div>
              
              {roles.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
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
                          <div className="font-medium text-sm">{role.roleName}</div>
                          <div className="text-xs text-gray-500">{role.description}</div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRoleAssignModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRoleAssignment}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Edit user details for {editingUser?.name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Technology"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUserEdit}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingUser?.name || deletingUser?.email}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Organization Assignment Modal */}
      {showOrgAssignmentModal && selectedUserForOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Assign to Organization
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {getUserOrgAssignment(selectedUserForOrg.userId)
                    ? 'Assign this user to an additional organization'
                    : 'Assign this user to an organization (users can belong to multiple organizations)'}
                </p>
              </div>
              <button
                onClick={() => setShowOrgAssignmentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrgAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization *
                </label>
                <Select
                  value={orgAssignmentForm.organizationId}
                  onValueChange={(value) => setOrgAssignmentForm(prev => ({ ...prev, organizationId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={entitiesLoading ? "Loading organizations..." : "Select organization"} />
                  </SelectTrigger>
                  <SelectContent>
                    {entitiesLoading ? (
                      <SelectItem value="loading" disabled>Loading organizations...</SelectItem>
                    ) : availableEntities.filter(entity => entity.entityType === 'organization').length > 0 ? (
                      availableEntities
                        .filter(entity => entity.entityType === 'organization')
                        .map((org) => (
                          <SelectItem key={org.entityId} value={org.entityId}>
                            {org.displayName || org.entityName} ({org.entityCode})
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="none" disabled>No organizations available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Type
                </label>
                <Select
                  value={orgAssignmentForm.assignmentType}
                  onValueChange={(value: any) => setOrgAssignmentForm(prev => ({ ...prev, assignmentType: value }))}
                >
                  <SelectTrigger>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={orgAssignmentForm.priority}
                  onChange={(e) => setOrgAssignmentForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOrgAssignmentModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Assign Organization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Organization Modal */}
      <Dialog open={showRemoveOrgModal} onOpenChange={setShowRemoveOrgModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Organization Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {orgToRemove?.assignment.organizationName} from{' '}
              {orgToRemove && users.find(u => u.userId === orgToRemove.userId)?.name}?
              {orgToRemove?.assignment.isPrimary && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ This is their primary organization. Another organization will be set as primary if available.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveOrgModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRemoveOrgAssignment}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Row Component
const UserRow = ({ 
  user, 
  isSelected, 
  onToggleSelect, 
  onView, 
  onPromote, 
  onDeactivate, 
  onResendInvite,
  getStatusColor,
  getUserStatus 
}: {
  user: User;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onPromote: () => void;
  onDeactivate: () => void;
  onResendInvite: () => void;
  getStatusColor: (user: User) => string;
  getUserStatus: (user: User) => string;
}) => {
  const [showActions, setShowActions] = useState(false);

  // Safety check to prevent errors with invalid user data
  if (!user || !user.userId) {
    return null;
  }

  return (
    <div className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSelect}
          className="text-gray-400 hover:text-gray-600"
        >
          {isSelected ? 
            <CheckSquare className="w-4 h-4" /> : 
            <Square className="w-4 h-4" />
          }
        </button>
      </div>
      
      <div className="col-span-4 flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
          style={{ 
            background: user.avatar ? `url(${user.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          {!user.avatar && (user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-gray-900">{user.name || 'Unnamed User'}</div>
          <div className="text-sm text-gray-600">{user.email || 'No email provided'}</div>
          {user.department && (
            <div className="text-xs text-gray-500">{user.department} • {user.title}</div>
          )}
        </div>
      </div>
      
      <div className="col-span-2 flex flex-col gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user)}`}>
          {getUserStatus(user)}
        </span>
        {user.isTenantAdmin && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            Admin
          </span>
        )}
      </div>
      
      <div className="col-span-2 text-sm text-gray-600">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
      </div>
      
      <div className="col-span-2 text-sm text-gray-600">
        {user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}
      </div>
      
      <div className="col-span-1 flex items-center justify-end">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  onView();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              
              {!user.onboardingCompleted && (
                <button
                  onClick={() => {
                    onResendInvite();
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-blue-700"
                >
                  <Send className="w-4 h-4" />
                  Resend Invite
                </button>
              )}
              
              {!user.isTenantAdmin && (
                <button
                  onClick={() => {
                    onPromote();
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-purple-700"
                >
                  <Crown className="w-4 h-4" />
                  Promote to Admin
                </button>
              )}
              
              {user.isActive && !user.isTenantAdmin && (
                <button
                  onClick={() => {
                    onDeactivate();
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Deactivate User
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Invite User Modal Component with Multi-Entity Support
const InviteUserModal = ({
  isOpen,
  onClose,
  roles,
  inviteForm,
  setInviteForm,
  onInvite,
  availableEntities,
  entitiesLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  inviteForm: any;
  setInviteForm: (form: any) => void;
  onInvite: () => void;
  availableEntities: any[];
  entitiesLoading: boolean;
}) => {
  if (!isOpen) return null;

  // Flatten entities for easier selection (recursive function)
  const flattenEntities = (entities: any[], level = 0): any[] => {
    let result: any[] = [];
    entities.forEach(entity => {
      result.push({ ...entity, displayLevel: level });
      if (entity.children && entity.children.length > 0) {
        result = result.concat(flattenEntities(entity.children, level + 1));
      }
    });
    return result;
  };

  const flattenedEntities = flattenEntities(availableEntities);

  const handleEntityToggle = (entityId: string, entityType: string) => {
    const isSelected = inviteForm.entities.some((e: any) => e.entityId === entityId);

    if (isSelected) {
      // Remove entity
      setInviteForm((prev: any) => ({
        ...prev,
        entities: prev.entities.filter((e: any) => e.entityId !== entityId),
        primaryEntityId: prev.primaryEntityId === entityId ? '' : prev.primaryEntityId
      }));
    } else {
      // Add entity
      setInviteForm((prev: any) => ({
        ...prev,
        entities: [...prev.entities, {
          entityId,
          roleId: '',
          entityType,
          membershipType: 'direct'
        }]
      }));
    }
  };

  const handleEntityRoleChange = (entityId: string, roleId: string) => {
    setInviteForm((prev: any) => ({
      ...prev,
      entities: prev.entities.map((e: any) =>
        e.entityId === entityId ? { ...e, roleId } : e
      )
    }));
  };

  const isEntitySelected = (entityId: string) => {
    return inviteForm.entities.some((e: any) => e.entityId === entityId);
  };

  const getSelectedEntityRole = (entityId: string) => {
    const entity = inviteForm.entities.find((e: any) => e.entityId === entityId);
    return entity?.roleId || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Invite User to Organizations & Locations</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev: any) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm((prev: any) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Entity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Organizations & Locations *
            </label>

            {entitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading organizations...</span>
              </div>
            ) : flattenedEntities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No organizations available. Please create organizations first.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {flattenedEntities.map((entity) => (
                  <div
                    key={entity.entityId}
                    className={`border-b border-gray-100 last:border-b-0 ${
                      isEntitySelected(entity.entityId) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center p-3">
                      <input
                        type="checkbox"
                        checked={isEntitySelected(entity.entityId)}
                        onChange={() => handleEntityToggle(entity.entityId, entity.entityType)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />

                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <div style={{ marginLeft: `${entity.displayLevel * 20}px` }}>
                            {entity.displayLevel > 0 && <span className="text-gray-400 mr-2">└─</span>}
                            <span className="font-medium text-gray-900">{entity.entityName}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {entity.entityType}
                            </Badge>
                          </div>
                        </div>

                        {isEntitySelected(entity.entityId) && (
                          <div className="mt-2 ml-6">
                            <select
                              value={getSelectedEntityRole(entity.entityId)}
                              onChange={(e) => handleEntityRoleChange(entity.entityId, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Role</option>
                              {roles.map((role) => (
                                <option key={role.roleId} value={role.roleId}>
                                  {role.roleName}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {isEntitySelected(entity.entityId) && (
                        <input
                          type="radio"
                          name="primaryEntity"
                          checked={inviteForm.primaryEntityId === entity.entityId}
                          onChange={() => setInviteForm((prev: any) => ({ ...prev, primaryEntityId: entity.entityId }))}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          title="Set as primary organization"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              • Select organizations and locations where the user should have access<br/>
              • Assign appropriate roles for each selected entity<br/>
              • Choose one entity as the user's primary organization (marked with radio button)
            </p>
          </div>

          {/* Selected Entities Summary */}
          {inviteForm.entities.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Selected Entities Summary</h4>
              <div className="space-y-1">
                {inviteForm.entities.map((entity: any) => {
                  const entityData = flattenedEntities.find(e => e.entityId === entity.entityId);
                  const roleData = roles.find(r => r.roleId === entity.roleId);
                  return (
                    <div key={entity.entityId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="font-medium">{entityData?.entityName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {entityData?.entityType}
                        </Badge>
                        {inviteForm.primaryEntityId === entity.entityId && (
                          <Badge className="ml-2 text-xs bg-blue-600">Primary</Badge>
                        )}
                      </div>
                      <span className="text-gray-600">
                        {roleData?.roleName || 'No role selected'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={inviteForm.message}
              onChange={(e) => setInviteForm((prev: any) => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Welcome to our team! We're excited to have you join us."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onInvite}
              disabled={!inviteForm.email || !inviteForm.name || inviteForm.entities.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Multi-Entity Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ 
  user, 
  isOpen, 
  onClose, 
  generateInvitationUrl,
  copyInvitationUrl
}: {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  generateInvitationUrl: (user: User) => string | null;
  copyInvitationUrl: (user: User) => Promise<void>;
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
              style={{ 
                background: user.avatar ? `url(${user.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              {!user.avatar && (user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name || 'Unnamed User'}</h2>
              <p className="text-sm text-gray-600">{user.email || 'No email provided'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Role Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Account Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.invitationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {user.invitationStatus === 'pending' ? 'Pending Invitation' :
                     user.isActive ? 'Active' : 'Setup Required'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role:</span>
                  <span className="text-gray-900">
                    {user.roles && user.roles.length > 0 
                      ? user.roles.map(role => role.roleName).join(', ')
                      : 'No roles assigned'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Activity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invited:</span>
                  <span className="text-gray-900">{user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Login:</span>
                  <span className="text-gray-900">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Onboarding:</span>
                  <span className={user.onboardingCompleted ? 'text-green-600' : 'text-orange-600'}>
                    {user.onboardingCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invitation URL Section - Show prominently for pending invitations */}
          {user.invitationStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Invitation URL
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-blue-800">
                  Share this URL with {user.name || user.email} to complete their invitation:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generateInvitationUrl(user) || 'No invitation URL available'}
                    readOnly
                    className="flex-1 px-3 py-2 border border-blue-300 rounded bg-white text-sm font-mono"
                  />
                  <button
                    onClick={() => copyInvitationUrl(user)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-blue-600">
                  The user can click this link to accept the invitation and join your organization.
                </p>
              </div>
            </div>
          )}

          {/* Assigned Roles */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Assigned Roles</h3>
            {user.roles && user.roles.length > 0 ? (
              <div className="space-y-2">
                {user.roles.map(role => (
                  <div key={role.roleId} className="flex items-center gap-3 p-2 bg-white rounded border">
                    <span style={{ color: role.color }}>{role.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{role.roleName}</div>
                      <div className="text-sm text-gray-600">{role.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No roles assigned</p>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Edit User
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Reset Password
              </button>
              {!user.onboardingCompleted && (
                <button className="px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                  Resend Invite
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 