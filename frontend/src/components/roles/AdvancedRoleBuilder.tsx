import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Shield, 
  Save,
  X,
  Plus, 
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Check,
  HelpCircle,
  Building,
  Users2,
  MapIcon,
  Layers
} from 'lucide-react';
import api from '@/lib/api';

interface CustomRole {
  roleId?: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  permissions: Record<string, {
    level: 'none' | 'read' | 'write' | 'admin';
    operations: string[];
    restrictions?: {
      timeRestrictions?: any;
      ipRestrictions?: any;
      dataRestrictions?: any;
      featureRestrictions?: any;
    };
  }>;
  restrictions: {
    timeRestrictions: any;
    ipRestrictions: any;
    dataRestrictions: any;
    featureRestrictions: any;
  };
  inheritance: {
    parentRoles: string[];
    inheritanceMode: 'additive' | 'restrictive' | 'override';
    priority: number;
  };
  metadata: {
    tags: string[];
    department: string;
    level: 'entry' | 'intermediate' | 'senior' | 'executive';
    isTemplate: boolean;
  };
}

interface AdvancedRoleBuilderProps {
  onSave?: (role: CustomRole) => void;
  onCancel?: () => void;
  initialRole?: CustomRole | any;
  availableRoles?: CustomRole[];
}

// Enhanced Permission Level Definitions
const PERMISSION_LEVELS = {
  none: {
    label: 'No Access',
    description: 'Cannot access this module/application at all - completely hidden from user',
    color: 'bg-gray-100 text-gray-800',
    operations: []
  },
  read: {
    label: 'View Only',
    description: 'Can view and search data but cannot create, edit, or delete anything',
    color: 'bg-green-100 text-green-800',
    operations: ['view', 'list', 'search', 'export']
      },
  write: {
    label: 'Edit Access',
    description: 'Can view, create, and modify data but cannot delete or perform admin functions',
    color: 'bg-orange-100 text-orange-800',
    operations: ['view', 'list', 'search', 'export', 'create', 'edit', 'update']
      },
  admin: {
    label: 'Full Control',
    description: 'Complete access including delete, configure, manage users, and all admin functions',
    color: 'bg-red-100 text-red-800',
    operations: ['view', 'list', 'search', 'export', 'create', 'edit', 'update', 'delete', 'manage', 'configure', 'admin']
      }
} as const;

export function AdvancedRoleBuilder({ 
  onSave, 
  onCancel, 
  initialRole,
  availableRoles = [] 
}: AdvancedRoleBuilderProps) {
  const [currentTab, setCurrentTab] = useState<'basic' | 'permissions'>('basic');
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [permissionStructure, setPermissionStructure] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [expandedApplications, setExpandedApplications] = useState<Set<string>>(new Set());
  const [showModuleRestrictions, setShowModuleRestrictions] = useState<Record<string, boolean>>({});

  const [role, setRole] = useState<CustomRole>(() => {
    if (initialRole?.roleId) {
      return {
        roleId: initialRole.roleId,
        name: initialRole.roleName || initialRole.name || '',
        description: initialRole.description || '',
        color: initialRole.color || '#6b7280',
        icon: initialRole.metadata?.icon || initialRole.icon || '👤',
        permissions: initialRole.permissions || {},
        restrictions: initialRole.restrictions || {
          timeRestrictions: {},
          ipRestrictions: {},
          dataRestrictions: {},
          featureRestrictions: {}
        },
        inheritance: initialRole.inheritance || {
          parentRoles: [],
          inheritanceMode: 'additive',
          priority: 0
        },
        metadata: {
          tags: initialRole.metadata?.tags || [],
          department: initialRole.metadata?.department || '',
          level: initialRole.metadata?.level || 'entry',
          isTemplate: initialRole.metadata?.isTemplate || false
        }
      };
    }
    
    return {
      name: '',
      description: '',
      color: '#6b7280',
      icon: '👤',
      permissions: {},
        restrictions: {
        timeRestrictions: {},
        ipRestrictions: {},
        dataRestrictions: {},
        featureRestrictions: {}
        },
        inheritance: {
        parentRoles: [],
        inheritanceMode: 'additive',
        priority: 0
        },
        metadata: {
        tags: [],
        department: '',
        level: 'entry',
        isTemplate: false
      }
    };
  });

  // Load available permissions and templates
  useEffect(() => {
    const loadPermissions = async () => {
      setIsLoading(true);
      try {
        console.log('🔄 Loading applications and modules from database...');
        
        // Use the new applications/modules API
        const response = await api.get('/custom-roles/builder-options');
        console.log('📊 Applications/modules response:', response.data);
        
        if (response.data.success) {
          const { applications } = response.data.data;
          
          // Transform applications/modules data into the format expected by the role builder
          const transformedStructure = {
            applications: applications.map((app: any) => ({
              key: app.appCode,
              name: app.appName,
              description: app.description,
              modules: app.modules.map((module: any) => ({
                key: module.moduleCode,
                name: module.moduleName,
                description: module.description,
                isCore: module.isCore,
                operations: module.permissions.map((perm: any) => ({
                  id: `${app.appCode}.${module.moduleCode}.${perm.code}`,
                  name: perm.name,
                  description: perm.description,
                  code: perm.code
                }))
              }))
            })),
            summary: {
              totalApplications: applications.length,
              totalModules: applications.reduce((sum: number, app: any) => sum + app.modules.length, 0),
              totalPermissions: applications.reduce((sum: number, app: any) => 
                sum + app.modules.reduce((moduleSum: number, module: any) => 
                  moduleSum + module.permissions.length, 0
                ), 0
              )
            }
          };
          
          setPermissionStructure(transformedStructure);
          console.log('✅ Applications and modules loaded:', transformedStructure.summary);
          
          // Expand all applications by default for better UX
          const allAppKeys = applications.map((app: any) => app.appCode);
          setExpandedApplications(new Set(allAppKeys));
          
          // Set available permissions from apps/modules structure
          const allApps = applications.map((app: any) => ({
            name: app.appName,
            modules: app.modules.reduce((acc: any, module: any) => {
              acc[module.moduleCode] = {
                name: module.moduleName,
                permissions: module.permissions,
                category: app.appCode
              };
              return acc;
            }, {})
          }));
          setAvailablePermissions(allApps);
          
        } else {
          console.error('❌ Failed to load applications/modules:', response.data.message);
          setAvailablePermissions([]);
        }
      } catch (error) {
        console.error('🚨 Error loading applications/modules:', error);
        setAvailablePermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, []);

  // Load role templates
  useEffect(() => {
  const loadRoleTemplates = async () => {
    try {
      const response = await api.get('/roles/templates');
      if (response.data.success) {
          const templates = response.data.data.map((t: any) => ({
            id: t.roleId,
            name: t.roleName,
            description: t.description,
            permissions: t.permissions,
            restrictions: t.restrictions,
            inheritance: t.inheritance,
            metadata: t.metadata
          }));
          // setRoleTemplates(templates); // Commented out as we removed this state
      }
    } catch (error) {
        console.error('Failed to load role templates:', error);
    }
  };

    loadRoleTemplates();
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    // const template = roleTemplates.find(t => t.id === templateId); // Commented out
    // if (!template) return;

      setRole(prev => ({
        ...prev,
      permissions: {}, // template.permissions ? JSON.parse(JSON.stringify(template.permissions)) : prev.permissions,
        restrictions: {
        timeRestrictions: {},
        ipRestrictions: {},
        dataRestrictions: {},
        featureRestrictions: {}
      }
    }));
  }, []);

  const handleTemplateSelect = useCallback(async (templateId: string) => {
    // const template = roleTemplates.find(t => t.templateId === templateId); // Removed roleTemplates reference
    // if (!template) return;

    setRole(prev => ({
      ...prev,
      // Apply template later when we have templates working
      permissions: {},
      restrictions: {
        timeRestrictions: {},
        ipRestrictions: {},
        dataRestrictions: {},
        featureRestrictions: {}
      }
    }));
  }, []); // Removed roleTemplates dependency

  const validateRole = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!role.name.trim()) {
      errors.name = 'Role name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [role]);

  const handleSave = useCallback(() => {
    console.log('💾 Save button clicked');
    console.log('📋 Current role data:', role);
    
    if (validateRole()) {
      console.log('✅ Validation passed, calling onSave');
      onSave?.(role);
    } else {
      console.log('❌ Validation failed');
    }
  }, [role, validateRole, onSave]);

  const togglePermission = useCallback((permissionId: string, moduleKey: string) => {
    console.log(`togglePermission: Called for ${permissionId} in ${moduleKey}`);
    setRole(prev => {
      console.log(`togglePermission - BEFORE update for ${moduleKey}:`, prev.permissions[moduleKey]);
      const newPermissions = { ...(prev.permissions || {}) };
      const modulePermissions = { ...(newPermissions[moduleKey] || { level: 'none', operations: [] }) };
      const operations = new Set(modulePermissions.operations || []);

      if (operations.has(permissionId)) {
        operations.delete(permissionId);
      } else {
        operations.add(permissionId);
      }
      modulePermissions.operations = Array.from(operations);

      // Auto-adjust permission level logic (ensure this is correct)
      if (operations.size === 0) {
        modulePermissions.level = 'none';
      } else {
        const hasWrite = Array.from(operations).some(op => 
          op.includes('create') || op.includes('edit') || op.includes('manage')
        );
        const hasAdmin = Array.from(operations).some(op => 
          op.includes('delete') || op.includes('approve') || op.includes('admin')
        );
        if (hasAdmin) modulePermissions.level = 'admin';
        else if (hasWrite) modulePermissions.level = 'write';
        else modulePermissions.level = 'read';
      }
      newPermissions[moduleKey] = modulePermissions;
      console.log(`togglePermission - AFTER update for ${moduleKey}:`, newPermissions[moduleKey]);
      return { ...prev, permissions: newPermissions };
    });
  }, []);

  const updatePermissionLevel = useCallback((moduleKey: string, level: 'none' | 'read' | 'write' | 'admin') => {
    setRole(prev => {
      const newPermissions = { ...prev.permissions };
      const currentModule = newPermissions[moduleKey] || { operations: [], restrictions: {} };
      
      // Auto-select operations based on permission level
      let selectedOperations: string[] = [];
      
      if (level !== 'none') {
        // Get the module's available operations from permission structure
        const app = permissionStructure?.applications?.find((app: any) => 
          app.modules.some((mod: any) => mod.key === moduleKey)
        );
        const module = app?.modules.find((mod: any) => mod.key === moduleKey);
        
        if (module?.operations) {
          const levelOps = PERMISSION_LEVELS[level].operations;
          selectedOperations = module.operations
            .filter((op: any) => levelOps.some((levelOp: string) => 
              op.id.includes(levelOp) || 
              (levelOp === 'view' && (op.id.includes('get') || op.id.includes('list') || op.id.includes('read'))) ||
              (levelOp === 'create' && op.id.includes('create')) ||
              (levelOp === 'edit' && (op.id.includes('edit') || op.id.includes('update'))) ||
              (levelOp === 'delete' && op.id.includes('delete')) ||
              (levelOp === 'admin' && (op.id.includes('admin') || op.id.includes('manage')))
            ))
            .map((op: any) => op.id);
        }
      }
      
      newPermissions[moduleKey] = {
        ...currentModule,
        level,
        operations: selectedOperations
      };
      
      return { ...prev, permissions: newPermissions };
    });
  }, [permissionStructure]);

  const toggleApplicationSelection = useCallback((appKey: string) => {
    // This function is no longer needed - removed for simplicity
  }, []);

  // Quick permission templates - simplified for new structure
  const applyPermissionTemplate = useCallback((templateType: 'viewer' | 'editor' | 'admin') => {
    if (!permissionStructure?.applications) return;
    
    let templatePermissions: Record<string, any> = {};
    
    permissionStructure.applications.forEach((app: any) => {
      app.modules.forEach((module: any) => {
        templatePermissions[module.key] = {
            level: templateType === 'viewer' ? 'read' : templateType === 'editor' ? 'write' : 'admin',
            operations: templateType === 'viewer' 
            ? module.operations.filter((op: any) => op.id.includes('view')).map((op: any) => op.id)
              : templateType === 'editor'
            ? module.operations.filter((op: any) => !op.id.includes('delete') && !op.id.includes('approve')).map((op: any) => op.id)
            : module.operations.map((op: any) => op.id)
          };
        });
    });

    setRole(prev => ({ ...prev, permissions: templatePermissions }));
  }, [permissionStructure]);

  // Apply inheritance and merge permissions - removed for simplicity
  // Apply bulk permissions to an entire application - removed for simplicity

  const renderBasicInfo = () => (
    <div className="space-y-6">
      {/* Basic Role Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Role Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name *
            </label>
            <input
              type="text"
              value={role.name}
              onChange={(e) => setRole(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Senior Developer, Sales Manager, Customer Support Lead"
            />
            {validationErrors.name && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={role.description}
              onChange={(e) => setRole(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the role's responsibilities, access requirements, and scope..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {['👤', '👔', '👑', '⚡', '🎯', '🔧', '📊', '🛡️', '💼', '🚀', '📢', '🤝', '💰', '👥', '⚙️', '🏢', '💻', '📋', '🔐', '📈'].map(icon => (
                <button
                  key={icon}
                  onClick={() => setRole(prev => ({ ...prev, icon }))}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg hover:bg-gray-50 ${
                    role.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
            <div className="flex gap-2 flex-wrap">
              {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#7C3AED', '#DC2626', '#059669', '#6B7280'].map(color => (
                <button
                  key={color}
                  onClick={() => setRole(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-lg border-2 ${
                    role.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Apply application-level permissions - FIXED to properly update operations
  const applyApplicationPermissions = useCallback((appKey: string, level: 'none' | 'read' | 'write' | 'admin') => {
    if (!permissionStructure?.applications) return;
    
    const app = permissionStructure.applications.find((a: any) => a.key === appKey);
    if (!app) return;

    setRole(prev => {
      const newPermissions = { ...prev.permissions };
      
      app.modules.forEach((module: any) => {
        // Get all operations for this module and filter based on level
        let selectedOperations: string[] = [];
        
        if (level !== 'none') {
          const levelOps = PERMISSION_LEVELS[level].operations;
          selectedOperations = module.operations
            .filter((op: any) => levelOps.some((levelOp: string) => 
              op.id.includes(levelOp) || levelOp === 'view' && (op.id.includes('get') || op.id.includes('list'))
            ))
            .map((op: any) => op.id);
        }
        
        newPermissions[module.key] = {
          level,
          operations: selectedOperations,
          restrictions: newPermissions[module.key]?.restrictions || {}
        };
      });
      
      return { ...prev, permissions: newPermissions };
    });
  }, [permissionStructure]);

  // Update module restrictions
  const updateModuleRestrictions = useCallback((moduleKey: string, restrictionType: string, value: any) => {
    setRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...(prev.permissions[moduleKey] || { level: 'none', operations: [] }),
          restrictions: {
            ...(prev.permissions[moduleKey]?.restrictions || {}),
            [restrictionType]: value
          }
        }
      }
    }));
  }, []);

  const renderPermissionMatrix = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
              Application & Module Permissions
          </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure permissions at application level or drill down to individual modules for granular control.
            </p>
        </div>

          {/* Global Quick Templates */}
              <div className="flex gap-2">
                <button
                  onClick={() => applyPermissionTemplate('viewer')}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
              📖 Global Viewer
                </button>
                <button
                  onClick={() => applyPermissionTemplate('editor')}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
              ✏️ Global Editor
                </button>
                <button
                  onClick={() => applyPermissionTemplate('admin')}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
              🔧 Global Admin
                </button>
              </div>
            </div>
            
        {/* Permission Level Legend */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Permission Levels Explained:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
              <div key={level} className={`p-2 rounded text-xs ${config.color}`}>
                <div className="font-medium">{config.label}</div>
                <div className="text-gray-600 mt-1">{config.description}</div>
            </div>
            ))}
          </div>
        </div>

        {permissionStructure?.applications ? (
        <div className="space-y-4">
            {permissionStructure.applications.map((app: any) => {
              // Calculate application-level permission status
              const appModules = app.modules;
              const appPermissions = appModules.map((module: any) => 
                role.permissions[module.key]?.level || 'none'
              );
              const hasUniform = appPermissions.every((level: string) => level === appPermissions[0]);
              const uniformLevel = hasUniform ? appPermissions[0] : 'mixed';
              const isExpanded = expandedApplications.has(app.key);

              return (
                <div key={app.key} className="border rounded-lg">
                  {/* Application Header with Accordion Toggle */}
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
              <button
                          onClick={() => toggleApplicationExpansion(app.key)}
                          className="p-1 hover:bg-gray-200 rounded"
              >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                    <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <h4 className="font-medium text-gray-900">{app.name}</h4>
                          <p className="text-sm text-gray-600">{app.description}</p>
                </div>
                      </div>
                      
                      {/* Application-Level Permission Buttons */}
                      <div className="flex gap-2">
                        <span className="text-xs text-gray-500 mr-2">App-wide:</span>
                        {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
                          <button
                            key={level}
                            onClick={() => applyApplicationPermissions(app.key, level as 'none' | 'read' | 'write' | 'admin')}
                            className={`px-2 py-1 text-xs rounded ${
                              uniformLevel === level
                                ? config.color
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={`Set ${config.label} for entire ${app.name} application`}
                          >
                            {config.label}
              </button>
                        ))}
                        {uniformLevel === 'mixed' && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Mixed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Collapsible Module-Level Controls */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {app.modules.map((module: any) => {
                        const modulePermissions = role.permissions[module.key] || {
                          level: 'none',
                          operations: [],
                          restrictions: {}
                        };

                      return (
                          <div key={module.key} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900">{module.name}</h5>
                                <p className="text-xs text-gray-600">{module.description}</p>
                              </div>
                              
                              {/* Module-Level Permission Selector */}
                              <div className="flex gap-2">
                                {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
                                  <button
                                    key={level}
                                    onClick={() => updatePermissionLevel(module.key, level as 'none' | 'read' | 'write' | 'admin')}
                                    className={`px-2 py-1 text-xs rounded ${
                                      modulePermissions.level === level
                                        ? config.color
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                    title={config.description}
                                  >
                                    {config.label}
                                  </button>
                                ))}
                            </div>
                          </div>

                            {modulePermissions.level !== 'none' && (
                              <div className="space-y-3">
                                {/* Operational Permissions */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Specific Operations ({modulePermissions.operations.length} selected)
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {module.operations.map((operation: any) => {
                                      const isSelected = modulePermissions.operations.includes(operation.id);
                                return (
                                        <label
                                    key={operation.id}
                                          className={`flex items-center space-x-2 p-2 rounded border cursor-pointer text-xs ${
                                      isSelected 
                                              ? 'border-blue-500 bg-blue-50'
                                              : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => togglePermission(operation.id, module.key)}
                                            className="w-3 h-3"
                                          />
                                          <span className={isSelected ? 'text-blue-700' : 'text-gray-700'}>
                                            {operation.name}
                                        </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Optional Module Restrictions */}
                                <div className="border-t pt-3 mt-3">
                                  <button
                                    onClick={() => toggleModuleRestrictions(module.key)}
                                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
                                  >
                                    {showModuleRestrictions[module.key] ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                    🛡️ Custom Security Restrictions (Optional)
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      Advanced
                                        </span>
                                  </button>
                                  
                                  {showModuleRestrictions[module.key] && (
                                    <div className="mt-3 space-y-3 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                      <div className="text-sm text-blue-800 mb-3">
                                        ⚠️ Configure additional security restrictions for this module
                                    </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          ⏰ Time-Based Access Control
                                        </label>
                                        <select
                                          value={modulePermissions.restrictions?.timeRestrictions?.type || 'none'}
                                          onChange={(e) => updateModuleRestrictions(module.key, 'timeRestrictions', {
                                            ...modulePermissions.restrictions?.timeRestrictions,
                                            type: e.target.value
                                          })}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="none">No Time Restrictions</option>
                                          <option value="business_hours">Business Hours Only (9 AM - 5 PM)</option>
                                          <option value="weekdays">Weekdays Only (Mon-Fri)</option>
                                          <option value="custom">Custom Schedule</option>
                                        </select>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          🌐 IP Address Restrictions
                                        </label>
                                        <input
                                          type="text"
                                          value={modulePermissions.restrictions?.ipRestrictions?.allowedIPs?.join(', ') || ''}
                                          onChange={(e) => updateModuleRestrictions(module.key, 'ipRestrictions', {
                                            allowedIPs: e.target.value.split(',').map(ip => ip.trim()).filter(ip => ip)
                                          })}
                                          placeholder="e.g., 192.168.1.100, 10.0.0.0/24 (comma-separated)"
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                          Leave empty to allow access from any IP address
                                        </p>
                                  </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          📊 Data Access Scope Limits
                                        </label>
                                        <select
                                          value={modulePermissions.restrictions?.dataRestrictions?.scope || 'unlimited'}
                                          onChange={(e) => updateModuleRestrictions(module.key, 'dataRestrictions', {
                                            scope: e.target.value
                                          })}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="unlimited">No Data Restrictions</option>
                                          <option value="own_records">Own Records Only</option>
                                          <option value="assigned_records">Assigned Records Only</option>
                                          <option value="recent_records">Recent Records (Last 30 Days)</option>
                                          <option value="team_records">Team Records Only</option>
                                        </select>
                          </div>
                                      
                                      {(modulePermissions.restrictions?.timeRestrictions?.type !== 'none' ||
                                        modulePermissions.restrictions?.ipRestrictions?.allowedIPs?.length > 0 ||
                                        modulePermissions.restrictions?.dataRestrictions?.scope !== 'unlimited') && (
                                        <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                                          <div className="text-sm text-yellow-800">
                                            ✅ <strong>Active Restrictions:</strong>
                                            <ul className="mt-1 space-y-1">
                                              {modulePermissions.restrictions?.timeRestrictions?.type !== 'none' && (
                                                <li>• Time: {modulePermissions.restrictions?.timeRestrictions?.type}</li>
                                              )}
                                              {modulePermissions.restrictions?.ipRestrictions?.allowedIPs?.length > 0 && (
                                                <li>• IP: {modulePermissions.restrictions?.ipRestrictions?.allowedIPs?.length} addresses</li>
                                              )}
                                              {modulePermissions.restrictions?.dataRestrictions?.scope !== 'unlimited' && (
                                                <li>• Data: {modulePermissions.restrictions?.dataRestrictions?.scope}</li>
                                              )}
                                            </ul>
                        </div>
                  </div>
                                      )}
                </div>
              )}
            </div>
        </div>
                            )}
    </div>
  );
                      })}
                    </div>
                  )}
    </div>
  );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Loading permission structure...</p>
            <p className="text-sm mt-2">Configured permissions: {Object.keys(role.permissions).length} modules</p>
          </div>
        )}
      </div>
    </div>
  );

  // Toggle application expansion
  const toggleApplicationExpansion = useCallback((appKey: string) => {
    setExpandedApplications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appKey)) {
        newSet.delete(appKey);
      } else {
        newSet.add(appKey);
      }
      return newSet;
    });
  }, []);

  // Toggle module restrictions
  const toggleModuleRestrictions = useCallback((moduleKey: string) => {
    setShowModuleRestrictions(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  }, []);

  console.log('AdvancedRoleBuilder rendering. Current role:', role);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {initialRole ? 'Edit Role' : 'Create New Role'}
              </h1>
              <p className="text-blue-100 mt-1">
                Build custom roles with department-based permissions and restrictions
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-white text-blue-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: 'Basic Info', icon: Users },
              { id: 'permissions', label: 'Permissions', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {currentTab === 'basic' && renderBasicInfo()}
          {currentTab === 'permissions' && renderPermissionMatrix()}
        </div>
      </div>
    </div>
  );
}