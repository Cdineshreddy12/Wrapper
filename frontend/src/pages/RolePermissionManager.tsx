import React, { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Settings, 
  Crown,
  CheckCircle,
  AlertCircle,
  Mail,
  UserPlus,
  UserMinus,
  Key,
  Building2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const PREDEFINED_PERMISSIONS = [
  { id: 'dashboard.view', label: 'View Dashboard', category: 'Dashboard' },
  { id: 'dashboard.edit', label: 'Edit Dashboard', category: 'Dashboard' },
  
  { id: 'users.view', label: 'View Users', category: 'User Management' },
  { id: 'users.create', label: 'Create Users', category: 'User Management' },
  { id: 'users.edit', label: 'Edit Users', category: 'User Management' },
  { id: 'users.delete', label: 'Delete Users', category: 'User Management' },
  { id: 'users.invite', label: 'Invite Users', category: 'User Management' },
  
  { id: 'roles.view', label: 'View Roles', category: 'Role Management' },
  { id: 'roles.create', label: 'Create Roles', category: 'Role Management' },
  { id: 'roles.edit', label: 'Edit Roles', category: 'Role Management' },
  { id: 'roles.delete', label: 'Delete Roles', category: 'Role Management' },
  { id: 'roles.assign', label: 'Assign Roles', category: 'Role Management' },
  
  { id: 'billing.view', label: 'View Billing', category: 'Billing' },
  { id: 'billing.edit', label: 'Edit Billing', category: 'Billing' },
  
  { id: 'analytics.view', label: 'View Analytics', category: 'Analytics' },
  { id: 'analytics.export', label: 'Export Analytics', category: 'Analytics' },
  
  { id: 'settings.view', label: 'View Settings', category: 'Settings' },
  { id: 'settings.edit', label: 'Edit Settings', category: 'Settings' },
  { id: 'settings.admin', label: 'Admin Settings', category: 'Settings' },
];

export function RolePermissionManager() {
  const { user } = useKindeAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  
  // Form states
  const [editingRole, setEditingRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState({
    roleName: '',
    description: '',
    permissions: [],
    restrictions: {},
    priority: 100
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    roleIds: []
  });

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Load organization data when selected
  useEffect(() => {
    if (selectedOrgId) {
      loadOrganizationData();
    }
  }, [selectedOrgId]);

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/admin/organizations');
      console.log('🏢 Loaded organizations:', response.data.organizations);
      setOrganizations(response.data.organizations);
      
      // Auto-select first organization if available
      if (response.data.organizations.length > 0) {
        console.log('🎯 Auto-selecting organization:', response.data.organizations[0].tenantId);
        setSelectedOrgId(response.data.organizations[0].tenantId);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Failed to load organizations');
    }
  };

  const loadOrganizationData = async () => {
    if (!selectedOrgId) return;
    
    setLoading(true);
    try {
      // Load roles and users in parallel
      const [rolesResponse, usersResponse] = await Promise.all([
        api.get(`/admin/organizations/${selectedOrgId}/roles`),
        api.get(`/admin/organizations/${selectedOrgId}/users`)
      ]);

      setRoles(rolesResponse.data.roles);
      setUsers(usersResponse.data.users);
      setError(null);
    } catch (error) {
      console.error('Error loading organization data:', error);
      setError('Failed to load organization data');
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    try {
      await api.post(`/admin/organizations/${selectedOrgId}/roles`, newRole);
      toast.success('Role created successfully with Kinde integration!');
      setIsCreateRoleOpen(false);
      setNewRole({
        roleName: '',
        description: '',
        permissions: [],
        restrictions: {},
        priority: 100
      });
      loadOrganizationData();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const updateRole = async () => {
    try {
      await api.put(`/admin/organizations/${selectedOrgId}/roles/${editingRole.roleId}`, editingRole);
      toast.success('Role updated successfully!');
      setIsEditRoleOpen(false);
      setEditingRole(null);
      loadOrganizationData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const deleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await api.delete(`/admin/organizations/${selectedOrgId}/roles/${roleId}`);
      toast.success('Role deleted successfully!');
      loadOrganizationData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const inviteUser = async () => {
    try {
      await api.post(`/admin/organizations/${selectedOrgId}/invite-user`, inviteForm);
      toast.success(`Invitation sent to ${inviteForm.email}!`);
      setIsInviteUserOpen(false);
      setInviteForm({ email: '', name: '', roleIds: [] });
      loadOrganizationData();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(error.response?.data?.message || 'Failed to invite user');
    }
  };

  const removeUser = async (userId) => {
    const userToRemove = users.find(u => u.userId === userId);
    if (!confirm(`Are you sure you want to remove ${userToRemove?.name} from this organization?`)) return;
    
    try {
      await api.delete(`/admin/organizations/${selectedOrgId}/users/${userId}`);
      toast.success('User removed successfully!');
      loadOrganizationData();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error(error.response?.data?.message || 'Failed to remove user');
    }
  };

  const assignRoles = async () => {
    try {
      await api.post(`/admin/organizations/${selectedOrgId}/users/${selectedUser.userId}/roles`, {
        roleIds: selectedUser.assignedRoles
      });
      toast.success('Roles assigned successfully with Kinde sync!');
      setIsAssignRoleOpen(false);
      setSelectedUser(null);
      loadOrganizationData();
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign roles');
    }
  };

  const handlePermissionToggle = (permissionId, isSelected) => {
    const currentPermissions = isEditRoleOpen ? editingRole.permissions : newRole.permissions;
    const updatedPermissions = isSelected
      ? [...currentPermissions, permissionId]
      : currentPermissions.filter(p => p !== permissionId);

    if (isEditRoleOpen) {
      setEditingRole({ ...editingRole, permissions: updatedPermissions });
    } else {
      setNewRole({ ...newRole, permissions: updatedPermissions });
    }
  };

  const openEditRole = (role) => {
    setEditingRole({
      ...role,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions
    });
    setIsEditRoleOpen(true);
  };

  const openAssignRole = (user) => {
    setSelectedUser({
      ...user,
      assignedRoles: user.roles?.map(r => r.roleId) || []
    });
    setIsAssignRoleOpen(true);
  };

  const handleRoleAssignmentToggle = (roleId, isAssigned) => {
    const updatedRoles = isAssigned
      ? [...selectedUser.assignedRoles, roleId]
      : selectedUser.assignedRoles.filter(r => r !== roleId);
    
    setSelectedUser({ ...selectedUser, assignedRoles: updatedRoles });
  };

  const selectedOrg = organizations.find(org => org.tenantId === selectedOrgId);

  // Group permissions by category
  const permissionsByCategory = PREDEFINED_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {});

  if (loading && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="h-8 w-8 mr-3 text-blue-600" />
              Role & Permission Manager
            </h1>
            <p className="text-gray-600 mt-1">
              Manage roles, permissions, and users with Kinde integration
            </p>
          </div>
        </div>

        {/* Organization Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Select Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Debug info */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p><strong>Debug Info:</strong></p>
              <p>Total Organizations: {organizations.length}</p>
              <p>Selected ID: {selectedOrgId}</p>
              <p>Available Organizations: {organizations.map(org => org.companyName).join(', ')}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedOrgId} 
                onValueChange={(newValue) => {
                  console.log('🔄 Organization changed from', selectedOrgId, 'to', newValue);
                  setSelectedOrgId(newValue);
                }}
              >
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.tenantId} value={org.tenantId}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{org.companyName}</span>
                        <Badge variant="secondary">{org.subdomain}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedOrg && (
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Users: {selectedOrg.userCount}</span>
                  <span>Industry: {selectedOrg.industry}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedOrgId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please select an organization to manage roles and permissions</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <Button onClick={loadOrganizationData} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Roles Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Roles ({roles.length})
                </CardTitle>
                <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
                        Create a new role with Kinde integration and custom permissions
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Role Name</label>
                          <Input
                            value={newRole.roleName}
                            onChange={(e) => setNewRole({ ...newRole, roleName: e.target.value })}
                            placeholder="e.g., Sales Manager"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Priority</label>
                          <Input
                            type="number"
                            value={newRole.priority}
                            onChange={(e) => setNewRole({ ...newRole, priority: parseInt(e.target.value) })}
                            placeholder="100"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <Textarea
                          value={newRole.description}
                          onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                          placeholder="Describe the role responsibilities..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Permissions</label>
                        <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                          {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                            <div key={category}>
                              <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {permissions.map((permission) => (
                                  <div key={permission.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={permission.id}
                                      checked={newRole.permissions.includes(permission.id)}
                                      onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                                    />
                                    <label htmlFor={permission.id} className="text-sm">
                                      {permission.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createRole}>
                        <Key className="h-4 w-4 mr-2" />
                        Create Role with Kinde
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading roles...</p>
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No roles found</p>
                    <p className="text-sm text-gray-500">Create your first role to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div key={role.roleId} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{role.roleName}</h3>
                              {role.isSystemRole && (
                                <Badge variant="secondary">System</Badge>
                              )}
                              {role.kindeRoleId && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <Key className="h-3 w-3 mr-1" />
                                  Kinde
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{role.userCount} users</span>
                              <span>Priority: {role.priority}</span>
                              {role.kindeRoleKey && (
                                <span>Key: {role.kindeRoleKey}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditRole(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRole(role.roleId)}
                              disabled={role.isSystemRole}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Users ({users.length})
                </CardTitle>
                <Dialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite New User</DialogTitle>
                      <DialogDescription>
                        Send an email invitation to join this organization
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Email Address</label>
                        <Input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          placeholder="user@company.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name</label>
                        <Input
                          value={inviteForm.name}
                          onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Assign Roles (Optional)</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                          {roles.map((role) => (
                            <div key={role.roleId} className="flex items-center space-x-2">
                              <Checkbox
                                id={`invite-role-${role.roleId}`}
                                checked={inviteForm.roleIds.includes(role.roleId)}
                                onCheckedChange={(checked) => {
                                  const updatedRoles = checked
                                    ? [...inviteForm.roleIds, role.roleId]
                                    : inviteForm.roleIds.filter(r => r !== role.roleId);
                                  setInviteForm({ ...inviteForm, roleIds: updatedRoles });
                                }}
                              />
                              <label htmlFor={`invite-role-${role.roleId}`} className="text-sm">
                                {role.roleName}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsInviteUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={inviteUser}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No users found</p>
                    <p className="text-sm text-gray-500">Invite your first user to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((userItem) => (
                      <div key={userItem.userId} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{userItem.name}</h3>
                              {userItem.isTenantAdmin && (
                                <Badge variant="destructive">Admin</Badge>
                              )}
                              {!userItem.isActive && (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                              {userItem.onboardingCompleted && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{userItem.email}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              {userItem.roles?.map((role) => (
                                <Badge key={role.roleId} variant="outline" className="text-xs">
                                  {role.roleName}
                                </Badge>
                              ))}
                              {(!userItem.roles || userItem.roles.length === 0) && (
                                <span className="text-xs text-gray-500">No roles assigned</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignRole(userItem)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeUser(userItem.userId)}
                              disabled={userItem.isTenantAdmin}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Role Dialog */}
        <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update role details and permissions
              </DialogDescription>
            </DialogHeader>
            
            {editingRole && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Role Name</label>
                    <Input
                      value={editingRole.roleName}
                      onChange={(e) => setEditingRole({ ...editingRole, roleName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <Input
                      type="number"
                      value={editingRole.priority}
                      onChange={(e) => setEditingRole({ ...editingRole, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={editingRole.description || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                      <div key={category}>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${permission.id}`}
                                checked={editingRole.permissions.includes(permission.id)}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                              />
                              <label htmlFor={`edit-${permission.id}`} className="text-sm">
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {editingRole.kindeRoleId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-green-800">
                      <Key className="h-4 w-4" />
                      <span className="text-sm font-medium">Kinde Integration Active</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Role ID: {editingRole.kindeRoleId} | Key: {editingRole.kindeRoleKey}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateRole}>
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Roles Dialog */}
        <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User Roles</DialogTitle>
              <DialogDescription>
                Assign or remove roles for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{selectedUser.name}</span>
                  </div>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Available Roles</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-3">
                    {roles.map((role) => (
                      <div key={role.roleId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`assign-${role.roleId}`}
                            checked={selectedUser.assignedRoles.includes(role.roleId)}
                            onCheckedChange={(checked) => handleRoleAssignmentToggle(role.roleId, checked)}
                          />
                          <label htmlFor={`assign-${role.roleId}`} className="text-sm">
                            {role.roleName}
                          </label>
                        </div>
                        <div className="flex items-center space-x-1">
                          {role.kindeRoleId && (
                            <Key className="h-3 w-3 text-green-600" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {role.userCount} users
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignRoleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={assignRoles}>
                <Settings className="h-4 w-4 mr-2" />
                Update Roles
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 