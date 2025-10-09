import { useMemo } from 'react';
import { 
  Mail, 
  Edit,
  Trash2,
  Eye,
  Crown,
  UserCog,
  UserX,
  UserCheck
} from 'lucide-react';
import { ReusableTable, TableColumn, TableAction } from '@/components/common/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { User } from '@/types/user-management';
import { useUserManagement } from '../context/UserManagementContext';
import { useUserActions } from '../hooks/useUserActions';

interface UserTableProps {
  users: User[];
  selectedUsers: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
  onUserAction: (action: string, user: User) => void;
  loading: boolean;
}

/**
 * User Table Component
 * 
 * Features:
 * - Configurable table columns
 * - User actions (view, edit, delete, etc.)
 * - Selection handling
 * - Status badges and role display
 * - Invitation URL handling
 */
export function UserTable({ 
  users, 
  selectedUsers, 
  onSelectionChange, 
  onUserAction, 
  loading 
}: UserTableProps) {
  const { userMutations } = useUserManagement();
  const { 
    getUserStatus, 
    getStatusColor, 
    generateInvitationUrl, 
    copyInvitationUrl 
  } = useUserActions();
  
  // Table columns configuration
  const userTableColumns: TableColumn<User>[] = useMemo(() => [
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
      label: 'Roles',
      width: '200px',
      render: (user) => (
          <div className="flex gap-2">
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
      )
    },
    { key: 'status', label: 'Status', width: '150px', render: (user) => (
      <Badge className={getStatusColor(user)}>
        {getUserStatus(user)}
      </Badge>
    )},
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
      width: '250px',
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
    }
  ], [getUserStatus, getStatusColor, generateInvitationUrl, copyInvitationUrl]);
  
  // Table actions configuration
  const userTableActions: TableAction<User>[] = useMemo(() => [
    {
      key: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (user) => onUserAction('view', user)
    },
    {
      key: 'edit',
      label: 'Edit User',
      icon: Edit,
      onClick: (user) => onUserAction('edit', user)
    },
    {
      key: 'assignRoles',
      label: 'Assign Roles',
      icon: UserCog,
      onClick: (user) => onUserAction('assignRoles', user)
    },
    {
      key: 'promote',
      label: 'Promote to Admin',
      icon: Crown,
      onClick: (user) => {
        if (confirm(`Promote ${user.name || user.email} to organization admin?`)) {
          userMutations.promoteUser.mutate(user.userId);
        }
      },
      disabled: (user) => user.isTenantAdmin
    },
    {
      key: 'reactivate',
      label: 'Reactivate User',
      icon: UserCheck,
      onClick: (user) => {
        if (confirm(`Reactivate ${user.name || user.email}? They will regain access to applications.`)) {
          userMutations.reactivateUser.mutate(user.userId);
        }
      },
      disabled: (user) => user.isActive,
      separator: true
    },
    {
      key: 'deactivate',
      label: 'Deactivate User',
      icon: UserX,
      onClick: (user) => {
        if (confirm(`Deactivate ${user.name || user.email}? They will lose access to all applications but their data will remain.`)) {
          userMutations.deactivateUser.mutate(user.userId);
        }
      },
      disabled: (user) => !user.isActive
    },
    {
      key: 'delete',
      label: 'Delete User',
      icon: Trash2,
      onClick: (user) => onUserAction('delete', user),
      destructive: true,
      separator: true
    },
    {
      key: 'resendInvite',
      label: 'Resend Invite',
      icon: Mail,
      onClick: (user) => userMutations.resendInvite.mutate(user.userId),
      disabled: (user) => user.isActive && user.onboardingCompleted
    },
    {
      key: 'copyInvitationUrl',
      label: 'Copy Invitation URL',
      icon: Mail,
      onClick: (user) => copyInvitationUrl(user),
      disabled: (user) => user.invitationStatus !== 'pending'
    }
  ], [onUserAction, userMutations, copyInvitationUrl]);
  
  return (
    <ReusableTable<User>
      data={users}
      columns={userTableColumns}
      actions={userTableActions}
      selectable={true}
      selectedItems={selectedUsers}
      onSelectionChange={onSelectionChange}
      getItemId={(user) => user.userId}
      loading={loading}
      emptyMessage="No users found matching your filters"
    />
  );
}
