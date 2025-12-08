import React from 'react';
import { X, Building, Badge } from 'lucide-react';
import { PearlButton } from '@/components/ui/pearl-button';
import { useTheme } from '@/components/theme/ThemeProvider';

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

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  inviteForm: {
    email: string;
    name: string;
    entities: Array<{
      entityId: string;
      roleId: string;
      entityType: string;
      membershipType: string;
    }>;
    primaryEntityId: string;
    message: string;
    invitationType: 'single-entity' | 'multi-entity';
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
  const { actualTheme, glassmorphismEnabled } = useTheme();

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      glassmorphismEnabled
        ? 'bg-black/60 backdrop-blur-sm'
        : 'bg-black bg-opacity-50'
    }`}>
      <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
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
        <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between ${
          glassmorphismEnabled
            ? actualTheme === 'dark'
              ? 'bg-slate-900/80 border-purple-500/20'
              : actualTheme === 'monochrome'
              ? 'bg-gray-900/80 border-gray-500/20'
              : 'bg-white/80 border-purple-300/40'
            : actualTheme === 'dark'
            ? 'bg-slate-900 border-slate-700'
            : actualTheme === 'monochrome'
            ? 'bg-gray-900 border-gray-500/30'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${
            actualTheme === 'dark'
              ? 'text-white'
              : actualTheme === 'monochrome'
              ? 'text-gray-100'
              : 'text-gray-900'
          }`}>Invite User to Organizations & Locations</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
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

        <div className="p-6 space-y-6">
          {/* Basic User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-gray-700'
              }`}>
                Email Address *
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev: any) => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors ${
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
                Full Name *
              </label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm((prev: any) => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors ${
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Entity Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              actualTheme === 'dark'
                ? 'text-white'
                : actualTheme === 'monochrome'
                ? 'text-gray-200'
                : 'text-gray-700'
            }`}>
              Select Organizations & Locations *
            </label>

            {entitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                  actualTheme === 'dark'
                    ? 'border-purple-400'
                    : actualTheme === 'monochrome'
                    ? 'border-gray-300'
                    : 'border-blue-600'
                }`}></div>
                <span className={`ml-2 ${
                  actualTheme === 'dark'
                    ? 'text-purple-200'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-gray-600'
                }`}>Loading organizations...</span>
              </div>
            ) : flattenedEntities.length === 0 ? (
              <div className={`text-center py-8 ${
                actualTheme === 'dark'
                  ? 'text-purple-200'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-300'
                  : 'text-gray-500'
              }`}>
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
            <PearlButton
              onClick={onClose}
              className="flex-1"
              variant="secondary"
            >
              Cancel
            </PearlButton>
            <PearlButton
              onClick={onInvite}
              disabled={!inviteForm.email || !inviteForm.name || inviteForm.entities.length === 0}
              className="flex-1"
            >
              Send Multi-Entity Invitation
            </PearlButton>
          </div>
        </div>
      </div>
    </div>
  );
};
