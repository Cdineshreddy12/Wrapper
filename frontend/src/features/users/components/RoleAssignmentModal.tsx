import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Role } from '@/types/user-management';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  selectedRoles: string[];
  setSelectedRoles: (roles: string[]) => void;
  onSave: () => void;
}

export function RoleAssignmentModal({
  isOpen,
  onClose,
  user,
  roles,
  selectedRoles,
  setSelectedRoles,
  onSave
}: RoleAssignmentModalProps) {
  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>
            Assign roles to {user?.name || user?.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Available Roles</Label>
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              Debug: {roles.length} roles loaded
              {roles.length > 0 && (
                <div className="mt-1">
                  {roles.map(role => `${role.roleName} (${role.roleId})`).join(', ')}
                </div>
              )}
            </div>
            
            {roles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Loading roles...</p>
                <p className="text-xs">Please wait while we fetch available roles</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {roles.map((role) => (
                  <div key={role.roleId} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={role.roleId}
                      checked={selectedRoles.includes(role.roleId)}
                      onCheckedChange={(checked) => handleRoleToggle(role.roleId, checked as boolean)}
                    />
                    <label htmlFor={role.roleId} className="flex items-center gap-3 cursor-pointer flex-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${role.color}20`, color: role.color }}
                      >
                        {role.icon || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{role.roleName}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                      {selectedRoles.includes(role.roleId) && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
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
          <Button onClick={onSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
