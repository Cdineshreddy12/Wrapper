import React from 'react';
import { X, Check, Building2, ChevronDown, UserPlus, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Role {
  roleId: string;
  roleName: string;
}

interface Entity {
  entityId: string;
  entityName: string;
  entityType: string;
  displayName?: string;
  displayLevel?: number;
  hierarchyLevel?: number;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  inviteForm: {
    email: string;
    name: string;
    entities: any[];
    primaryEntityId: string;
    message: string;
  };
  setInviteForm: (form: any) => void;
  onInvite: () => void;
  availableEntities: Entity[];
  entitiesLoading: boolean;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  roles,
  inviteForm,
  setInviteForm,
  onInvite,
  availableEntities,
  entitiesLoading
}) => {
  
  // Flatten logic simplified for display
  const flattenEntities = (entities: any[], level = 0): any[] => {
    // Assuming entities passed are already flattened or structured, 
    // but preserving the recursive logic if the parent passes a tree.
    // Since the parent passes flattenedEntities usually, we might just map.
    // For this UI component, we'll assume availableEntities is the source.
    return availableEntities.map(e => ({...e, displayLevel: e.hierarchyLevel || 0})); 
  };
  
  const entitiesToRender = availableEntities; // Using direct prop

  const handleEntityToggle = (entityId: string, entityType: string) => {
    const isSelected = inviteForm.entities.some((e: any) => e.entityId === entityId);
    if (isSelected) {
      setInviteForm((prev: any) => ({
        ...prev,
        entities: prev.entities.filter((e: any) => e.entityId !== entityId),
        primaryEntityId: prev.primaryEntityId === entityId ? '' : prev.primaryEntityId
      }));
    } else {
      setInviteForm((prev: any) => ({
        ...prev,
        entities: [...prev.entities, { entityId, roleId: '', entityType, membershipType: 'direct' }],
        primaryEntityId: prev.entities.length === 0 ? entityId : prev.primaryEntityId // Auto set primary if first
      }));
    }
  };

  const handleEntityRoleChange = (entityId: string, roleId: string) => {
    setInviteForm((prev: any) => ({
      ...prev,
      entities: prev.entities.map((e: any) => e.entityId === entityId ? { ...e, roleId } : e)
    }));
  };

  const isEntitySelected = (id: string) => inviteForm.entities.some((e: any) => e.entityId === id);
  const getSelectedRole = (id: string) => inviteForm.entities.find((e: any) => e.entityId === id)?.roleId || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900">
        <div className="flex flex-col h-full max-h-[85vh]">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  Invite Team Member
                </DialogTitle>
                <DialogDescription className="mt-1 text-slate-500 dark:text-slate-400">
                  Send an invitation to join your organization hierarchy.
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            
            {/* 1. Personal Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((prev: any) => ({ ...prev, email: e.target.value }))}
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      placeholder="e.g. jane@company.com"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Organization Access */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Organization Access</h3>
                <span className="text-xs text-slate-400">Select at least one</span>
              </div>
              
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {entitiesLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading hierarchy...</div>
                  ) : entitiesToRender.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No organizations found.</div>
                  ) : (
                    entitiesToRender.map((entity) => {
                      const selected = isEntitySelected(entity.entityId);
                      return (
                        <div 
                          key={entity.entityId}
                          className={`flex items-center p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                            selected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center flex-1 min-w-0 gap-4">
                             <div 
                              className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all ${
                                selected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                              onClick={() => handleEntityToggle(entity.entityId, entity.entityType)}
                            >
                              {selected && <Check className="w-3 h-3" />}
                            </div>
                            
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-medium text-sm text-slate-900 dark:text-slate-200"
                                  style={{ marginLeft: `${(entity.hierarchyLevel || 0) * 16}px` }}
                                >
                                  {entity.displayLevel && entity.displayLevel > 0 ? '└─ ' : ''}{entity.entityName}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-slate-500 border-slate-200 dark:border-slate-700">
                                  {entity.entityType}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {selected && (
                            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                              <div className="relative">
                                <select
                                  value={getSelectedRole(entity.entityId)}
                                  onChange={(e) => handleEntityRoleChange(entity.entityId, e.target.value)}
                                  className="appearance-none h-9 pl-3 pr-8 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                >
                                  <option value="">Select Role</option>
                                  {roles.map(r => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>

                              <div 
                                className="flex items-center gap-2 cursor-pointer group"
                                onClick={() => setInviteForm((prev: any) => ({ ...prev, primaryEntityId: entity.entityId }))}
                              >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  inviteForm.primaryEntityId === entity.entityId 
                                    ? 'border-indigo-600' 
                                    : 'border-slate-300 group-hover:border-indigo-400'
                                }`}>
                                  {inviteForm.primaryEntityId === entity.entityId && (
                                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                  )}
                                </div>
                                <span className={`text-xs ${
                                  inviteForm.primaryEntityId === entity.entityId 
                                    ? 'text-indigo-600 font-medium' 
                                    : 'text-slate-500'
                                }`}>Primary</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* 3. Message */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invitation Message</h3>
              <textarea
                value={inviteForm.message}
                onChange={(e) => setInviteForm((prev: any) => ({ ...prev, message: e.target.value }))}
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                rows={3}
                placeholder="Welcome to the team! I've set up your account..."
              />
            </section>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="h-11 px-6 border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              Cancel
            </Button>
            <Button 
              onClick={onInvite}
              disabled={!inviteForm.email || !inviteForm.name || inviteForm.entities.length === 0}
              className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              Send Invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};