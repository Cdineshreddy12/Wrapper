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
  AlertTriangle
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
}

interface Role {
  roleId: string;
  roleName: string;
  description: string;
  color: string;
  icon: string;
  permissions: Record<string, any>;
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
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created' | 'lastLogin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Invitation form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    roleIds: [] as string[],
    message: ''
  });

  // Load users and roles
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tenants/current/users');
      if (response.data.success) {
        const userData = response.data.data || [];
        console.log('📊 Raw user data from API:', userData);
        
        // Transform the data structure: {user: {...}, role: {...}} => flat user object
        const transformedUsers = userData.map((item: any) => {
          const user = item.user || item; // Handle both structures
          const role = item.role;
          
          return {
            userId: user.userId,
            email: user.email,
            name: user.name,
            isActive: user.isActive !== false, // Default to true if undefined
            isTenantAdmin: user.isTenantAdmin || false,
            onboardingCompleted: user.onboardingCompleted !== false, // Default to true if undefined
            department: user.department,
            title: user.title,
            invitedBy: user.invitedBy,
            invitedAt: user.invitedAt,
            invitationAcceptedAt: user.invitationAcceptedAt,
            lastLoginAt: user.lastLoginAt,
            avatar: user.avatar,
            roles: role ? [role] : [] // Convert single role to array format
          };
        });
        
        console.log('🔄 Transformed user data:', transformedUsers);
        
        // Validate transformed user data
        const validUsers = transformedUsers.filter(user => 
          user && 
          typeof user === 'object' && 
          user.userId && 
          typeof user.email === 'string'
        );
        
        console.log('✅ Valid users after filtering:', validUsers);
        setUsers(validUsers);
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
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('/roles');
      if (response.data.success) {
        setRoles(response.data.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Email and name are required');
      return;
    }

    try {
      const response = await api.post('/admin/organizations/current/invite-user', {
        email: inviteForm.email,
        name: inviteForm.name,
        roleIds: inviteForm.roleIds,
        message: inviteForm.message
      });

      if (response.data.success) {
        toast.success(`Invitation sent to ${inviteForm.email}!`);
        setShowInviteModal(false);
        setInviteForm({ email: '', name: '', roleIds: [], message: '' });
        await loadUsers();
      }
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      toast.error(error.response?.data?.message || 'Failed to send invitation');
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

  const handleAssignRoles = (user: User) => {
    setAssigningUser(user);
    setSelectedRoles(user.roles?.map(r => r.roleId) || []);
    setShowRoleAssignModal(true);
  };

  const handleSaveRoleAssignment = async () => {
    if (!assigningUser) return;

    try {
      const response = await api.post(`/tenants/current/users/${assigningUser.userId}/assign-roles`, {
        roleIds: selectedRoles
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
          if (statusFilter === 'active' && !user.isActive) return false;
          if (statusFilter === 'pending' && (user.isActive || user.onboardingCompleted)) return false;
          if (statusFilter === 'inactive' && user.isActive) return false;
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
    }
  ];

  // Table actions configuration
  const userTableActions: TableAction<User>[] = [
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
      },
      destructive: true,
      separator: true
    },
    {
      key: 'resendInvite',
      label: 'Resend Invitation',
      icon: Mail,
      onClick: (user) => handleResendInvite(user.userId, user.email),
      disabled: (user) => user.isActive && user.onboardingCompleted
    }
  ];

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
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

      {/* Users Table */}
      <ReusableTable<User>
        data={filteredUsers}
        columns={userTableColumns}
        actions={userTableActions}
        selectable={true}
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        getItemId={(user) => user.userId}
        loading={loading}
        emptyMessage="No users found matching your filters"
      />

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roles={roles}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        onInvite={handleInviteUser}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        user={viewingUser}
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setViewingUser(null);
        }}
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
              {roles.map((role) => (
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
              ))}
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

// Invite User Modal Component
const InviteUserModal = ({ 
  isOpen, 
  onClose, 
  roles, 
  inviteForm, 
  setInviteForm, 
  onInvite 
}: {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  inviteForm: any;
  setInviteForm: (form: any) => void;
  onInvite: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Invite User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
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
              onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Roles (Optional)
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {roles.map(role => (
                <label key={role.roleId} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={inviteForm.roleIds.includes(role.roleId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setInviteForm(prev => ({ 
                          ...prev, 
                          roleIds: [...prev.roleIds, role.roleId] 
                        }));
                      } else {
                        setInviteForm(prev => ({ 
                          ...prev, 
                          roleIds: prev.roleIds.filter((id: string) => id !== role.roleId) 
                        }));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    <span style={{ color: role.color }}>{role.icon}</span>
                    <span className="text-sm">{role.roleName}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={inviteForm.message}
              onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Welcome to our team! We're excited to have you join us."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onInvite}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send Invitation
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
  onClose 
}: {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
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
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isTenantAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.isTenantAdmin ? 'Organization Admin' : 'Standard User'}
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