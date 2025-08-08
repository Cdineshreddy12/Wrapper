import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  Building, 
  Package, 
  Shield, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  Check,
  AlertCircle,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Layers
} from 'lucide-react';
import api from '@/lib/api';

interface Application {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  subscriptionTier: string;
  modules: Module[];
}

interface Module {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  description: string;
  isCore: boolean;
  permissions: Permission[];
}

interface Permission {
  code: string;
  name: string;
  description?: string;
  fullCode?: string;
}

interface RoleBuilderData {
  roleName: string;
  description: string;
  selectedApps: string[];
  selectedModules: Record<string, string[]>;
  selectedPermissions: Record<string, string[]>;
  restrictions: {
    timeRestrictions?: Record<string, any>;
    ipRestrictions?: Record<string, any>;
    dataRestrictions?: Record<string, any>;
    featureRestrictions?: Record<string, any>;
  };
}

interface ApplicationModuleRoleBuilderProps {
  onSave?: (role: any) => void;
  onCancel?: () => void;
  initialRole?: any;
}

export function ApplicationModuleRoleBuilder({ 
  onSave, 
  onCancel, 
  initialRole 
}: ApplicationModuleRoleBuilderProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Role builder state
  const [roleData, setRoleData] = useState<RoleBuilderData>(() => {
    if (initialRole) {
      return {
        roleName: initialRole.roleName || initialRole.name || '',
        description: initialRole.description || '',
        selectedApps: [],
        selectedModules: {},
        selectedPermissions: {},
        restrictions: {
          timeRestrictions: {},
          ipRestrictions: {},
          dataRestrictions: {},
          featureRestrictions: {}
        }
      };
    }
    
    return {
      roleName: '',
      description: '',
      selectedApps: [],
      selectedModules: {},
      selectedPermissions: {},
      restrictions: {
        timeRestrictions: {},
        ipRestrictions: {},
        dataRestrictions: {},
        featureRestrictions: {}
      }
    };
  });

  // Load applications and modules from backend
  useEffect(() => {
    const loadRoleBuilderOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Loading role builder options from applications/modules tables...');
        
        // Call the backend API that uses applications and modules tables
        const response = await api.get('/custom-roles/builder-options');
        
        if (response.data.success) {
          const { applications: apps, totalApps, totalModules, totalPermissions } = response.data.data;
          
          console.log(`✅ Loaded ${totalApps} applications, ${totalModules} modules, ${totalPermissions} permissions`);
          
          setApplications(apps);
          
          // Expand all apps by default for better UX
          setExpandedApps(new Set(apps.map((app: Application) => app.appCode)));
          
          // If editing an existing role, populate the selections
          if (initialRole) {
            // Parse existing role permissions to rebuild selections
            const permissions = initialRole.permissions || [];
            const parsedSelections = parseExistingPermissions(permissions, apps);
            setRoleData(prev => ({
              ...prev,
              ...parsedSelections
            }));
          }
          
        } else {
          setError('Failed to load applications and modules');
        }
        
      } catch (err) {
        console.error('❌ Error loading role builder options:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    loadRoleBuilderOptions();
  }, [initialRole]);

  // Parse existing role permissions into selection format
  const parseExistingPermissions = (permissions: string[] | Record<string, any>, apps: Application[]) => {
    const selectedApps: string[] = [];
    const selectedModules: Record<string, string[]> = {};
    const selectedPermissions: Record<string, string[]> = {};

    console.log('🔍 Parsing existing permissions:', permissions);

    // Handle flat array format (e.g., ["crm.contacts.read", "crm.contacts.create"])
    if (Array.isArray(permissions)) {
      permissions.forEach(permission => {
        const parts = permission.split('.');
        if (parts.length >= 3) {
          const [appCode, moduleCode, permCode] = parts;
          
          // Add app if not already selected
          if (!selectedApps.includes(appCode)) {
            selectedApps.push(appCode);
          }
          
          // Add module
          if (!selectedModules[appCode]) {
            selectedModules[appCode] = [];
          }
          if (!selectedModules[appCode].includes(moduleCode)) {
            selectedModules[appCode].push(moduleCode);
          }
          
          // Add permission
          const moduleKey = `${appCode}.${moduleCode}`;
          if (!selectedPermissions[moduleKey]) {
            selectedPermissions[moduleKey] = [];
          }
          selectedPermissions[moduleKey].push(permCode);
        }
      });
    } 
    // Handle hierarchical object format (e.g., { crm: { contacts: ["read", "create"] } })
    else if (typeof permissions === 'object' && permissions !== null) {
      Object.entries(permissions).forEach(([appCode, appPermissions]) => {
        if (typeof appPermissions === 'object' && appPermissions !== null) {
          // Add app
          if (!selectedApps.includes(appCode)) {
            selectedApps.push(appCode);
          }
          
          Object.entries(appPermissions).forEach(([moduleCode, modulePerms]) => {
            if (Array.isArray(modulePerms)) {
              // Add module
              if (!selectedModules[appCode]) {
                selectedModules[appCode] = [];
              }
              if (!selectedModules[appCode].includes(moduleCode)) {
                selectedModules[appCode].push(moduleCode);
              }
              
              // Add permissions
              const moduleKey = `${appCode}.${moduleCode}`;
              if (!selectedPermissions[moduleKey]) {
                selectedPermissions[moduleKey] = [];
              }
              selectedPermissions[moduleKey] = [...modulePerms];
            }
          });
        }
      });
    }

    console.log('✅ Parsed permissions result:', { selectedApps, selectedModules, selectedPermissions });
    return { selectedApps, selectedModules, selectedPermissions };
  };

  // Toggle application selection
  const toggleAppSelection = (appCode: string) => {
    setRoleData(prev => {
      const newSelectedApps = prev.selectedApps.includes(appCode)
        ? prev.selectedApps.filter(code => code !== appCode)
        : [...prev.selectedApps, appCode];
      
      // If deselecting app, remove all its modules and permissions
      const newSelectedModules = { ...prev.selectedModules };
      const newSelectedPermissions = { ...prev.selectedPermissions };
      
      if (!newSelectedApps.includes(appCode)) {
        delete newSelectedModules[appCode];
        // Remove all permissions for this app's modules
        Object.keys(newSelectedPermissions).forEach(key => {
          if (key.startsWith(`${appCode}.`)) {
            delete newSelectedPermissions[key];
          }
        });
      }
      
      return {
        ...prev,
        selectedApps: newSelectedApps,
        selectedModules: newSelectedModules,
        selectedPermissions: newSelectedPermissions
      };
    });
  };

  // Toggle module selection
  const toggleModuleSelection = (appCode: string, moduleCode: string) => {
    setRoleData(prev => {
      const appModules = prev.selectedModules[appCode] || [];
      const newAppModules = appModules.includes(moduleCode)
        ? appModules.filter(code => code !== moduleCode)
        : [...appModules, moduleCode];
      
      const newSelectedModules = {
        ...prev.selectedModules,
        [appCode]: newAppModules
      };
      
      // If deselecting module, remove all its permissions
      const newSelectedPermissions = { ...prev.selectedPermissions };
      const moduleKey = `${appCode}.${moduleCode}`;
      
      if (!newAppModules.includes(moduleCode)) {
        delete newSelectedPermissions[moduleKey];
      }
      
      return {
        ...prev,
        selectedModules: newSelectedModules,
        selectedPermissions: newSelectedPermissions
      };
    });
  };

  // Toggle permission selection
  const togglePermissionSelection = (appCode: string, moduleCode: string, permissionCode: string) => {
    const moduleKey = `${appCode}.${moduleCode}`;
    
    setRoleData(prev => {
      const modulePermissions = prev.selectedPermissions[moduleKey] || [];
      const newModulePermissions = modulePermissions.includes(permissionCode)
        ? modulePermissions.filter(code => code !== permissionCode)
        : [...modulePermissions, permissionCode];
      
      return {
        ...prev,
        selectedPermissions: {
          ...prev.selectedPermissions,
          [moduleKey]: newModulePermissions
        }
      };
    });
  };

  // Quick select all permissions for a module
  const selectAllModulePermissions = (appCode: string, moduleCode: string) => {
    const app = applications.find(a => a.appCode === appCode);
    const module = app?.modules.find(m => m.moduleCode === moduleCode);
    
    if (module) {
      const moduleKey = `${appCode}.${moduleCode}`;
      const allPermissions = module.permissions.map(p => p.code);
      
      setRoleData(prev => ({
        ...prev,
        selectedPermissions: {
          ...prev.selectedPermissions,
          [moduleKey]: allPermissions
        }
      }));
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalApps = roleData.selectedApps.length;
    const totalModules = Object.values(roleData.selectedModules).reduce((sum, modules) => sum + modules.length, 0);
    const totalPermissions = Object.values(roleData.selectedPermissions).reduce((sum, perms) => sum + perms.length, 0);
    
    return { totalApps, totalModules, totalPermissions };
  }, [roleData]);

  // Save role using the backend API
  const handleSave = async () => {
    if (!roleData.roleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    if (summary.totalPermissions === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      setSaving(true);
      
      // Check if we're editing an existing role or creating a new one
      const isEditing = initialRole?.roleId;
      const roleName = roleData.roleName;
      
      if (isEditing) {
        console.log('🔄 Updating existing role:', initialRole.roleId, 'with name:', roleName);
        
        // For editing, use the builder-specific update endpoint
        const response = await api.put(`/custom-roles/update-from-builder/${initialRole.roleId}`, {
          roleName: roleData.roleName,
          description: roleData.description,
          selectedApps: roleData.selectedApps,
          selectedModules: roleData.selectedModules,
          selectedPermissions: roleData.selectedPermissions,
          restrictions: roleData.restrictions
        });
        
        if (response.data.success) {
          console.log('✅ Role updated successfully:', response.data.data);
          toast.success(`Role "${roleData.roleName}" updated successfully with ${summary.totalPermissions} permissions!`);
          onSave?.(response.data.data);
        } else {
          toast.error('Failed to update role: ' + response.data.error);
        }
        
      } else {
        console.log('➕ Creating new role from applications and modules...', roleData);
        
        // Call the backend API that creates roles from apps/modules
        const response = await api.post('/custom-roles/create-from-builder', {
          roleName: roleData.roleName,
          description: roleData.description,
          selectedApps: roleData.selectedApps,
          selectedModules: roleData.selectedModules,
          selectedPermissions: roleData.selectedPermissions,
          restrictions: roleData.restrictions
        });
        
        if (response.data.success) {
          console.log('✅ Role created successfully:', response.data.data);
          toast.success(`Role "${roleData.roleName}" created successfully with ${summary.totalPermissions} permissions!`);
          onSave?.(response.data.data);
        } else {
          toast.error('Failed to create role: ' + response.data.error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error saving role:', error);
      toast.error(isEditing ? 'Failed to update role' : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications and modules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg p-6 md:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 mb-3">
              <Shield className="w-7 h-7 md:w-8 md:h-8" />
              {initialRole?.roleId ? 'Edit Custom Role' : 'Create Custom Role'}
            </h2>
            <p className="text-blue-100 text-base md:text-lg leading-relaxed">
              {initialRole?.roleId ? 'Update role permissions by selecting applications, modules, and specific permissions' : 'Build custom roles by selecting applications, modules, and specific permissions'}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[140px]">
              <div className="text-white/90 text-sm font-medium mb-1">Available Resources</div>
              <div className="text-3xl font-bold mb-1">{applications.length}</div>
              <div className="text-blue-100 text-sm">Applications</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Details Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Role Information
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Role Name *
            </label>
            <input
              type="text"
              value={roleData.roleName}
              onChange={(e) => setRoleData(prev => ({ ...prev, roleName: e.target.value }))}
              placeholder="e.g., Sales Manager, HR Specialist, Project Lead"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={roleData.description}
              onChange={(e) => setRoleData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this role's responsibilities"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Selection Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">{summary.totalApps}</div>
                <div className="text-blue-600 text-sm font-semibold">Applications Selected</div>
              </div>
            </div>
            <div className="text-blue-700 text-xs font-medium">
              {summary.totalApps > 0 ? `${summary.totalApps} of ${applications.length} apps chosen` : 'No applications selected yet'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">{summary.totalModules}</div>
                <div className="text-green-600 text-sm font-semibold">Modules Selected</div>
              </div>
            </div>
            <div className="text-green-700 text-xs font-medium">
              {summary.totalModules > 0 ? `${summary.totalModules} modules across selected apps` : 'No modules selected yet'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-800">{summary.totalPermissions}</div>
                <div className="text-purple-600 text-sm font-semibold">Permissions Selected</div>
              </div>
            </div>
            <div className="text-purple-700 text-xs font-medium">
              {summary.totalPermissions > 0 ? `${summary.totalPermissions} specific operations enabled` : 'No permissions selected yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Applications & Modules Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <Layers className="w-6 h-6 text-blue-600" />
            Select Applications & Configure Permissions
          </h3>
          <div className="text-sm text-gray-500 text-right">
            Click applications to expand and select modules and permissions
          </div>
        </div>

        <div className="space-y-8">
          {applications.map((app) => {
            const isAppSelected = roleData.selectedApps.includes(app.appCode);
            const isExpanded = expandedApps.has(app.appCode);
            const selectedModules = roleData.selectedModules[app.appCode] || [];
            
            return (
              <div 
                key={app.appCode} 
                className={`border-2 rounded-xl transition-all duration-200 ${
                  isAppSelected 
                    ? 'border-blue-300 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Application Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => toggleAppSelection(app.appCode)}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                          isAppSelected 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {isAppSelected && <Check className="w-5 h-5" />}
                      </button>
                      
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                          <Building className="w-6 h-6 text-blue-600" />
                          {app.appName}
                        </h4>
                        <p className="text-gray-600 mb-3">{app.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                            {app.modules.length} modules available
                          </span>
                          <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                            {app.subscriptionTier} tier
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {isAppSelected && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {selectedModules.length}/{app.modules.length}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">modules selected</div>
                        </div>
                      )}
                      <button
                        onClick={() => setExpandedApps(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(app.appCode)) {
                            newSet.delete(app.appCode);
                          } else {
                            newSet.add(app.appCode);
                          }
                          return newSet;
                        })}
                        className={`p-3 rounded-xl transition-colors ${
                          isExpanded ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                {isExpanded && isAppSelected && (
                  <div className="border-t border-blue-200 bg-white/70 p-6">
                    <div className="mb-6">
                      <h5 className="text-lg font-semibold text-gray-800 mb-2">Available Modules</h5>
                      <p className="text-sm text-gray-600">Select modules to enable specific functionality within {app.appName}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {app.modules.map((module) => {
                        const isModuleSelected = selectedModules.includes(module.moduleCode);
                        const moduleKey = `${app.appCode}.${module.moduleCode}`;
                        const selectedPermissions = roleData.selectedPermissions[moduleKey] || [];
                        
                        return (
                          <div 
                            key={module.moduleCode}
                            className={`border-2 rounded-xl transition-all duration-200 ${
                              isModuleSelected 
                                ? 'border-green-300 bg-green-50 shadow-md' 
                                : 'border-gray-200 bg-white hover:border-green-200'
                            }`}
                          >
                            {/* Module Header */}
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => toggleModuleSelection(app.appCode, module.moduleCode)}
                                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      isModuleSelected 
                                        ? 'bg-green-600 border-green-600 text-white' 
                                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                                    }`}
                                  >
                                    {isModuleSelected && <Check className="w-4 h-4" />}
                                  </button>
                                  
                                  <div className="flex-1">
                                    <h6 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                                      <Package className="w-4 h-4 text-green-600" />
                                      {module.moduleName}
                                      {module.isCore && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-medium">
                                          CORE
                                        </span>
                                      )}
                                    </h6>
                                    <p className="text-sm text-gray-600">{module.description}</p>
                                  </div>
                                </div>
                                
                                {isModuleSelected && (
                                  <div className="text-right">
                                    <div className="text-base font-bold text-green-600">
                                      {selectedPermissions.length}/{module.permissions.length}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium">permissions</div>
                                  </div>
                                )}
                              </div>

                              {/* Permissions */}
                              {isModuleSelected && (
                                <div className="mt-5 pt-5 border-t border-green-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <h6 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-purple-600" />
                                      Permissions ({module.permissions.length} available)
                                    </h6>
                                    <button
                                      onClick={() => selectAllModulePermissions(app.appCode, module.moduleCode)}
                                      className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md font-medium hover:bg-purple-200 transition-colors"
                                    >
                                      Select All
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                                    {module.permissions.map((permission) => {
                                      const isPermSelected = selectedPermissions.includes(permission.code);
                                      
                                      return (
                                        <label
                                          key={permission.code}
                                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                                            isPermSelected 
                                              ? 'border-purple-300 bg-purple-50 shadow-sm' 
                                              : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isPermSelected}
                                            onChange={() => togglePermissionSelection(app.appCode, module.moduleCode, permission.code)}
                                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                          />
                                          <div className="flex-1">
                                            <span className={`font-medium text-sm ${isPermSelected ? 'text-purple-800' : 'text-gray-700'}`}>
                                              {permission.name}
                                            </span>
                                            {permission.description && (
                                              <p className={`text-xs mt-1 ${isPermSelected ? 'text-purple-600' : 'text-gray-500'}`}>
                                                {permission.description}
                                              </p>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm">
            {summary.totalPermissions > 0 ? (
              <span className="text-green-600 font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Ready to {initialRole?.roleId ? 'update' : 'create'} role with {summary.totalPermissions} permissions
              </span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Please select at least one permission to continue
              </span>
            )}
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !roleData.roleName.trim() || summary.totalPermissions === 0}
              className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 shadow-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">{initialRole?.roleId ? 'Updating Role...' : 'Creating Role...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {initialRole?.roleId ? `Update Role (${summary.totalPermissions} permissions)` : `Create Role (${summary.totalPermissions} permissions)`}
                  </span>
                  <span className="sm:hidden">
                    {initialRole?.roleId ? 'Update' : 'Create'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 