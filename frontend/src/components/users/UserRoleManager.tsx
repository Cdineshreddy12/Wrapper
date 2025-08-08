import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Save, AlertCircle, UserCheck, Shield, Edit2, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface User {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  roles?: Role[];
}

interface Role {
  roleId: string;
  roleName: string;
  description: string;
  color: string;
  isSystemRole: boolean;
}

interface RoleAssignment {
  id?: string; // Changed from assignmentId to match backend schema
  userId: string;
  roleId: string;
  isActive: boolean;
  assignedAt?: string;
  assignedBy?: string;
  expiresAt?: string;
}

interface UserRoleManagerProps {
  userId?: string;
  onRoleChange?: (userId: string, roles: Role[]) => void;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({ 
  userId, 
  onRoleChange 
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load users and roles
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // Auto-select user if userId prop is provided
  useEffect(() => {
    if (userId && users.length > 0) {
      const user = users.find(u => u.userId === userId);
      if (user) {
        setSelectedUser(user);
        loadUserRoles(userId);
      }
    }
  }, [userId, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading users from /admin/users...');
      const response = await api.get('/admin/users');
      console.log('👥 Users API Response:', response.data);
      
      if (response.data.success) {
        const userData = response.data.data;
        const usersList = userData.users || userData || [];
        console.log('✅ Users loaded:', usersList.length, 'users');
        setUsers(usersList);
      } else {
        console.error('❌ Users API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to load users');
      }
    } catch (error: any) {
      console.error('❌ Failed to load users:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load users';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      console.log('📥 Loading roles from /roles...');
      const response = await api.get('/roles');
      console.log('🎭 Roles API Response:', response.data);
      
      if (response.data.success) {
        const rolesData = response.data.data;
        const rolesList = rolesData.roles || rolesData || [];
        console.log('✅ Roles loaded:', rolesList.length, 'roles');
        setAvailableRoles(rolesList);
      } else {
        console.error('❌ Roles API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to load roles');
      }
    } catch (error: any) {
      console.error('❌ Failed to load roles:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load roles';
      toast.error(errorMessage);
    }
  };

  const loadUserRoles = async (selectedUserId: string) => {
    try {
      setLoading(true);
      console.log(`📥 Loading roles for user ${selectedUserId}...`);
      const response = await api.get(`/admin/users/${selectedUserId}/roles`);
      console.log('🔐 User roles API Response:', response.data);
      
      if (response.data.success) {
        const rolesData = response.data.data;
        const rolesList = rolesData.roles || rolesData || [];
        console.log('✅ User roles loaded:', rolesList.length, 'roles');
        setUserRoles(rolesList);
      } else {
        console.error('❌ User roles API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to load user roles');
        setUserRoles([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load user roles:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load user roles';
      toast.error(errorMessage);
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    loadUserRoles(user.userId);
    setShowRoleModal(true);
  };

  const handleAssignRole = async (roleId: string) => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      console.log(`🔄 Assigning role ${roleId} to user ${selectedUser.userId}...`);
      
      const requestData = {
        userId: selectedUser.userId,
        roleId: roleId
      };
      console.log('📤 Role assignment request:', requestData);
      
      const response = await api.post('/admin/users/assign-role', requestData);
      console.log('✅ Role assignment response:', response.data);

      if (response.data.success) {
        const assignedRole = availableRoles.find(r => r.roleId === roleId);
        toast.success(`Role "${assignedRole?.roleName || roleId}" assigned successfully to ${selectedUser.name}`);
        
        // Reload user roles to get fresh data
        await loadUserRoles(selectedUser.userId);
        
        // Trigger permission refresh notification
        localStorage.setItem('user_permissions_changed', Date.now().toString());
        console.log('🔔 Permission refresh notification triggered');
        
        // Notify parent component
        onRoleChange?.(selectedUser.userId, userRoles);
      } else {
        console.error('❌ Role assignment failed:', response.data);
        toast.error(response.data.message || 'Failed to assign role');
      }
    } catch (error: any) {
      console.error('❌ Role assignment error:', error);
      
      if (error.response?.status === 409) {
        // Handle duplicate assignment with detailed message
        const errorData = error.response.data;
        if (errorData.details?.existingAssignment) {
          const existingAssignment = errorData.details.existingAssignment;
          const assignedDate = new Date(existingAssignment.assignedAt).toLocaleDateString();
          toast.error(`Role already assigned since ${assignedDate}`, {
            duration: 4000,
            icon: '⚠️'
          });
          console.log('ℹ️ Existing assignment details:', existingAssignment);
        } else {
          toast.error(errorData.message || 'Role is already assigned to this user');
        }
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to assign role';
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      console.log(`🔄 Removing role ${roleId} from user ${selectedUser.userId}...`);
      
      const response = await api.delete(`/admin/users/${selectedUser.userId}/roles/${roleId}`);
      console.log('✅ Role removal response:', response.data);

      if (response.data.success) {
        const removedRole = userRoles.find(r => r.roleId === roleId);
        toast.success(`Role "${removedRole?.roleName || roleId}" removed successfully from ${selectedUser.name}`);
        
        // Reload user roles to get fresh data
        await loadUserRoles(selectedUser.userId);
        
        // Trigger permission refresh notification
        localStorage.setItem('user_permissions_changed', Date.now().toString());
        console.log('🔔 Permission refresh notification triggered');
        
        // Notify parent component
        onRoleChange?.(selectedUser.userId, userRoles);
      } else {
        console.error('❌ Role removal failed:', response.data);
        toast.error(response.data.message || 'Failed to remove role');
      }
    } catch (error: any) {
      console.error('❌ Role removal error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove role';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Refreshing all data...');
      await Promise.all([
        loadUsers(),
        loadRoles(),
        selectedUser ? loadUserRoles(selectedUser.userId) : Promise.resolve()
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const getRoleColor = (color: string) => {
    return color || '#6b7280';
  };

  const availableRolesToAssign = availableRoles.filter(
    role => !userRoles.some(userRole => userRole.roleId === role.roleId)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Role Management</h2>
            <p className="text-sm text-gray-600">Assign and manage user roles and permissions</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Users List */}
      {!userId && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-md font-medium text-gray-900">Select User</h3>
            <p className="text-sm text-gray-600">Choose a user to manage their roles</p>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No users found</p>
                <button
                  onClick={loadUsers}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map(user => (
                  <div
                    key={user.userId}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isTenantAdmin && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                          Admin
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {(showRoleModal || userId) && selectedUser && (
        <div className={userId ? '' : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'}>
          <div className={`bg-white rounded-lg ${userId ? 'border border-gray-200' : 'max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'}`}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manage Roles: {selectedUser.name}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectedUser && loadUserRoles(selectedUser.userId)}
                    disabled={loading}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  {!userId && (
                    <button
                      onClick={() => setShowRoleModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Current Roles */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-3">Current Roles</h4>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2 text-sm">Loading roles...</p>
                </div>
              ) : userRoles.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No roles assigned</p>
                  <p className="text-sm text-gray-500 mt-1">Assign roles below to grant permissions</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {userRoles.map(role => (
                    <div
                      key={role.roleId}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getRoleColor(role.color) }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{role.roleName}</p>
                          {role.description && (
                            <p className="text-sm text-gray-600">{role.description}</p>
                          )}
                        </div>
                        {role.isSystemRole && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            System
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveRole(role.roleId)}
                        disabled={saving}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Roles to Assign */}
            <div className="p-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Assign New Role</h4>
              {availableRolesToAssign.length === 0 ? (
                <div className="text-center py-6">
                  <UserCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">All available roles are already assigned</p>
                  <p className="text-sm text-gray-500 mt-1">Remove existing roles to assign different ones</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {availableRolesToAssign.map(role => (
                    <div
                      key={role.roleId}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getRoleColor(role.color) }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{role.roleName}</p>
                          {role.description && (
                            <p className="text-sm text-gray-600">{role.description}</p>
                          )}
                        </div>
                        {role.isSystemRole && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            System
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssignRole(role.roleId)}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleManager; 