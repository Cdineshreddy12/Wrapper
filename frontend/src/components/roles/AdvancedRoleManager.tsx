import React, { useState, useMemo } from 'react'
import { mockRoles, mockPermissions, PermissionItem, Role } from '../../data/mockPermissions'
import { 
  mockRoleTemplates, 
  mockEnhancedRoles, 
  mockCustomRestrictions,
  RoleTemplate, 
  EnhancedRole,
  CustomRestriction 
} from '../../data/extendedMockData'
import { useEnhancedDragDrop } from '../dnd/EnhancedDragDropProvider'
import { PermissionCard } from '../dnd/PermissionCard'

interface AdvancedRoleManagerProps {
  onRoleCreate?: (role: EnhancedRole) => void
  onRoleUpdate?: (roleId: string, updates: Partial<EnhancedRole>) => void
  onRoleClone?: (roleId: string) => void
}

export function AdvancedRoleManager({ 
  onRoleCreate, 
  onRoleUpdate, 
  onRoleClone 
}: AdvancedRoleManagerProps) {
  const [selectedTab, setSelectedTab] = useState<'roles' | 'templates' | 'builder' | 'restrictions'>('roles')
  const [roles, setRoles] = useState<EnhancedRole[]>(mockEnhancedRoles)
  const [isBuilderMode, setIsBuilderMode] = useState(false)
  const [builderRole, setBuilderRole] = useState<Partial<EnhancedRole>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const { 
    selectedPermissions, 
    selectedRoles, 
    togglePermissionSelection, 
    toggleRoleSelection,
    startDrag,
    endDrag,
    isMultiSelectMode 
  } = useEnhancedDragDrop()

  // Role Builder Component
  const RoleBuilder = () => {
    const [newRole, setNewRole] = useState<Partial<EnhancedRole>>({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: '👤',
      type: 'custom',
      permissions: [],
      restrictions: {},
      featureFlags: [],
      customRestrictions: [],
      isTemplate: false,
      inheritsFrom: []
    })

    const handleCreateRole = () => {
      const role: EnhancedRole = {
        ...newRole,
        id: `role_${Date.now()}`,
        userCount: 0,
        createdAt: new Date().toISOString(),
        isDefault: false,
        lastModified: new Date().toISOString(),
        modifiedBy: 'current-user@company.com'
      } as EnhancedRole

      setRoles(prev => [...prev, role])
      onRoleCreate?.(role)
      setNewRole({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: '👤',
        type: 'custom',
        permissions: [],
        restrictions: {},
        featureFlags: [],
        customRestrictions: [],
        isTemplate: false,
        inheritsFrom: []
      })
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">🎨 Create Custom Role</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
              <input
                type="text"
                value={newRole.name || ''}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Senior Developer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <div className="flex gap-2">
                {['👤', '👔', '👑', '⚡', '🎯', '🔧', '📊', '🛡️'].map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewRole(prev => ({ ...prev, icon }))}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${
                      newRole.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newRole.description || ''}
                onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the role's responsibilities and scope..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewRole(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      newRole.color === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inherits From</label>
              <select
                value={newRole.inheritsFrom?.[0] || ''}
                onChange={(e) => setNewRole(prev => ({ 
                  ...prev, 
                  inheritsFrom: e.target.value ? [e.target.value] : [] 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No inheritance</option>
                {mockRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permission assignment zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
            <h4 className="font-medium mb-3">🎯 Drag permissions here to assign them</h4>
            <div className="flex flex-wrap gap-2">
              {(newRole.permissions || []).map(permId => {
                const perm = mockPermissions.find(p => p.id === permId)
                return perm ? (
                  <div
                    key={permId}
                    className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg"
                  >
                    <span>{perm.icon}</span>
                    <span className="text-sm">{perm.name}</span>
                    <button
                      onClick={() => setNewRole(prev => ({
                        ...prev,
                        permissions: prev.permissions?.filter(id => id !== permId) || []
                      }))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ) : null
              })}
              {(newRole.permissions || []).length === 0 && (
                <p className="text-gray-500 text-sm">No permissions assigned yet</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateRole}
              disabled={!newRole.name}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Role
            </button>
            <button
              onClick={() => setIsBuilderMode(false)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Role Template Card
  const RoleTemplateCard = ({ template }: { template: RoleTemplate }) => {
    const handleUseTemplate = () => {
      setNewRole({
        name: template.displayName,
        description: template.description,
        color: template.color,
        icon: template.icon,
        type: 'custom',
        permissions: template.permissions,
        restrictions: template.restrictions,
        templateSource: template.id,
        isTemplate: false
      })
      setSelectedTab('builder')
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: template.color + '20', color: template.color }}
            >
              {template.icon}
            </div>
            <div>
              <h3 className="font-medium">{template.displayName}</h3>
              <p className="text-sm text-gray-600">{template.category}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{template.usageCount} uses</div>
            <div className="text-xs text-gray-500">{template.permissions.length} permissions</div>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 mb-3">{template.description}</p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleUseTemplate}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Use Template
          </button>
          <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Preview
          </button>
        </div>
      </div>
    )
  }

  // Enhanced Role Card
  const EnhancedRoleCard = ({ role }: { role: EnhancedRole }) => {
    const handleCloneRole = () => {
      const clonedRole: EnhancedRole = {
        ...role,
        id: `role_${Date.now()}`,
        name: `${role.name} (Copy)`,
        userCount: 0,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modifiedBy: 'current-user@company.com'
      }
      setRoles(prev => [...prev, clonedRole])
      onRoleClone?.(role.id)
    }

    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => toggleRoleSelection(role.id)}
      >
        {/* Role header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border-2"
              style={{ 
                backgroundColor: role.color + '20', 
                color: role.color,
                borderColor: role.color + '40'
              }}
            >
              {role.icon}
            </div>
            <div>
              <h3 className="font-medium">{role.name}</h3>
              <p className="text-sm text-gray-600">{role.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {selectedRoles.includes(role.id) && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Role inheritance */}
        {role.inheritsFrom && role.inheritsFrom.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <span>⬇️</span>
              <span>Inherits from: {role.inheritsFrom.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Permission count and stats */}
        <div className="grid grid-cols-3 gap-3 mb-3 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{role.permissions.length}</div>
            <div className="text-xs text-gray-500">Permissions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{role.userCount}</div>
            <div className="text-xs text-gray-500">Users</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{role.customRestrictions.length}</div>
            <div className="text-xs text-gray-500">Restrictions</div>
          </div>
        </div>

        {/* Feature flags */}
        {role.featureFlags && role.featureFlags.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {role.featureFlags.map(flagId => (
                <span key={flagId} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  🚩 {flagId.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last modified */}
        <div className="text-xs text-gray-500 mb-3">
          Modified {new Date(role.lastModified).toLocaleDateString()} by {role.modifiedBy}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCloneRole()
            }}
            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Clone
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎭 Advanced Role Manager</h1>
            <p className="text-gray-600">Create, manage, and assign roles with advanced permissions</p>
          </div>
          
          <button
            onClick={() => setSelectedTab('builder')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            + Create Role
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { id: 'roles', label: 'Current Roles', icon: '👥' },
            { id: 'templates', label: 'Templates', icon: '📋' },
            { id: 'builder', label: 'Role Builder', icon: '🎨' },
            { id: 'restrictions', label: 'Restrictions', icon: '🔒' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on selected tab */}
      {selectedTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <EnhancedRoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {selectedTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockRoleTemplates.map(template => (
            <RoleTemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      {selectedTab === 'builder' && <RoleBuilder />}

      {selectedTab === 'restrictions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">🔒 Custom Restrictions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockCustomRestrictions.map(restriction => (
                <div key={restriction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{restriction.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{restriction.type.replace('_', ' ')}</p>
                    </div>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                      {restriction.affectedPermissions.length} permissions
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{restriction.description}</p>
                  
                  <div className="text-xs text-gray-500">
                    <div className="font-medium mb-1">Configuration:</div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(restriction.value, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 