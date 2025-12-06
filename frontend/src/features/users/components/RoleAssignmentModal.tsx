import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Trash2 } from 'lucide-react';
import { User, Role } from '@/types/user-management';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  selectedRoles: string[];
  setSelectedRoles: (roles: string[]) => void;
  onSave: () => void;
  onDeassignRole?: (userId: string, roleId: string) => void;
}

export function RoleAssignmentModal({
  isOpen,
  onClose,
  user,
  roles,
  selectedRoles,
  setSelectedRoles,
  onSave,
  onDeassignRole
}: RoleAssignmentModalProps) {
  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!user?.userId || !onDeassignRole) return;
    
    if (confirm(`Are you sure you want to remove this role from ${user.name || user.email}?`)) {
      await onDeassignRole(user.userId, roleId);
      // Remove from selected roles if it's there
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    }
  };

  // Get currently assigned roles (roles that are in selectedRoles)
  const assignedRoles = roles.filter(role => selectedRoles.includes(role.roleId));
  // Get available roles to assign (roles not in selectedRoles)
  const availableRoles = roles.filter(role => !selectedRoles.includes(role.roleId));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Roles for {user?.name || user?.email}</DialogTitle>
          <DialogDescription>
            Assign new roles or remove existing roles for this user
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Currently Assigned Roles Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Currently Assigned Roles</Label>
            {assignedRoles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">No roles assigned</p>
                <p className="text-xs mt-1">Select roles below to assign them</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {assignedRoles.map((role) => (
                  <div
                    key={role.roleId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${role.color}20`, color: role.color }}
                      >
                        {role.icon || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{role.roleName}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                    </div>
                    {onDeassignRole && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(role.roleId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Roles to Assign Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Available Roles to Assign</Label>
            
            {availableRoles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">All available roles are assigned</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableRoles.map((role) => (
                  <div
                    key={role.roleId}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 border"
                  >
                    <Checkbox
                      id={role.roleId}
                      checked={false}
                      onCheckedChange={(checked) => handleRoleToggle(role.roleId, checked as boolean)}
                    />
                    <label
                      htmlFor={role.roleId}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${role.color}20`, color: role.color }}
                      >
                        {role.icon || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{role.roleName}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={selectedRoles.length === 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
