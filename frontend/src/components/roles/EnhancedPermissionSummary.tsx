import React, { useState } from 'react';
import { 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Edit, 
  Trash, 
  Settings,
  Users,
  Database,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Package,
  Layers,
  Grid,
  Activity,
  AlertTriangle,
  Clock,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PermissionSummaryProps {
  permissions: Record<string, any> | string[];
  roleName: string;
  restrictions?: Record<string, any>;
  isSystemRole?: boolean;
  userCount?: number;
  className?: string;
}

/**
 * Enhanced Permission Summary Component
 * Shows truly granular permission details: Application → Module → Permission
 * Updated to use the actual permission matrix structure
 */
export function EnhancedPermissionSummary({ 
  permissions, 
  roleName, 
  restrictions,
  isSystemRole = false,
  userCount = 0,
  className = "" 
}: PermissionSummaryProps) {
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  // Enhanced permission analysis with detailed breakdown
  const analyzePermissions = () => {
    let totalPermissions = 0;
    let adminCount = 0;
    let writeCount = 0;
    let readCount = 0;
    const applications: Record<string, any> = {};
    
    // Handle hierarchical permissions (like Super Administrator)
    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      Object.entries(permissions).forEach(([appKey, appPerms]) => {
        if (appKey === 'metadata') return;
        
        if (typeof appPerms === 'object' && appPerms !== null) {
          const appName = getApplicationDisplayName(appKey);
          applications[appKey] = {
            key: appKey,
            name: appName,
            modules: {},
            totalPerms: 0,
            adminPerms: 0,
            writePerms: 0,
            readPerms: 0,
            icon: getApplicationIcon(appKey)
          };
          
          Object.entries(appPerms).forEach(([moduleKey, modulePerms]) => {
            if (Array.isArray(modulePerms)) {
              const moduleName = getModuleDisplayName(moduleKey);
              const moduleId = `${appKey}.${moduleKey}`;
              
              applications[appKey].modules[moduleId] = {
                key: moduleKey,
                name: moduleName,
                permissions: modulePerms as string[],
                permissionCount: (modulePerms as string[]).length,
                adminPerms: 0,
                writePerms: 0,
                readPerms: 0,
                permissionDetails: []
              };
              
              applications[appKey].totalPerms += (modulePerms as string[]).length;
              totalPermissions += (modulePerms as string[]).length;
              
              // Categorize permissions with details
              (modulePerms as string[]).forEach((perm: string) => {
                const permissionDetail = analyzePermissionType(perm);
                applications[appKey].modules[moduleId].permissionDetails.push(permissionDetail);
                
                if (permissionDetail.category === 'admin') {
                  adminCount++;
                  applications[appKey].adminPerms++;
                  applications[appKey].modules[moduleId].adminPerms++;
                } else if (permissionDetail.category === 'write') {
                  writeCount++;
                  applications[appKey].writePerms++;
                  applications[appKey].modules[moduleId].writePerms++;
                } else {
                  readCount++;
                  applications[appKey].readPerms++;
                  applications[appKey].modules[moduleId].readPerms++;
                }
              });
            }
          });
        }
      });
    }
    
    // Handle flat array permissions
    else if (Array.isArray(permissions)) {
      const permArray = permissions as string[];
      totalPermissions = permArray.length;
      
      permArray.forEach(perm => {
        const parts = perm.split('.');
        if (parts.length >= 3) {
          const [appCode, moduleCode, action] = parts;
          const appName = getApplicationDisplayName(appCode);
          const moduleName = getModuleDisplayName(moduleCode);
          const moduleId = `${appCode}.${moduleCode}`;
          
          if (!applications[appCode]) {
            applications[appCode] = {
              key: appCode,
              name: appName,
              modules: {},
              totalPerms: 0,
              adminPerms: 0,
              writePerms: 0,
              readPerms: 0,
              icon: getApplicationIcon(appCode)
            };
          }
          
          if (!applications[appCode].modules[moduleId]) {
            applications[appCode].modules[moduleId] = {
              key: moduleCode,
              name: moduleName,
              permissions: [],
              permissionCount: 0,
              adminPerms: 0,
              writePerms: 0,
              readPerms: 0,
              permissionDetails: []
            };
          }
          
          const permissionDetail = analyzePermissionType(action);
          applications[appCode].modules[moduleId].permissions.push(action);
          applications[appCode].modules[moduleId].permissionDetails.push(permissionDetail);
          applications[appCode].modules[moduleId].permissionCount++;
          applications[appCode].totalPerms++;
          
          // Categorize permissions
          if (permissionDetail.category === 'admin') {
            adminCount++;
            applications[appCode].adminPerms++;
            applications[appCode].modules[moduleId].adminPerms++;
          } else if (permissionDetail.category === 'write') {
            writeCount++;
            applications[appCode].writePerms++;
            applications[appCode].modules[moduleId].writePerms++;
          } else {
            readCount++;
            applications[appCode].readPerms++;
            applications[appCode].modules[moduleId].readPerms++;
          }
        }
      });
    }
    
    return {
      totalPermissions,
      adminCount,
      writeCount,
      readCount,
      applications,
      applicationCount: Object.keys(applications).length,
      moduleCount: Object.values(applications).reduce((sum, app) => sum + Object.keys(app.modules).length, 0)
    };
  };

  // Enhanced permission type analysis based on actual permission matrix
  const analyzePermissionType = (permission: string) => {
    const perm = permission.toLowerCase();
    
    // Admin permissions (high risk) - based on actual permission matrix
    if (perm.includes('delete') || perm.includes('admin') || perm.includes('manage') || 
        perm.includes('approve') || perm.includes('assign') || perm.includes('change_role') ||
        perm.includes('process') || perm.includes('pay') || perm.includes('dispute') ||
        perm.includes('change_status') || perm.includes('calculate') || perm.includes('close') ||
        perm.includes('reject') || perm.includes('cancel')) {
      return {
        name: permission,
        category: 'admin',
        risk: 'high',
        description: getPermissionDescription(permission),
        icon: <Trash className="w-3 h-3 text-red-500" />,
        color: 'text-red-700 bg-red-50 border-red-200'
      };
    }
    
    // Write permissions (medium risk) - based on actual permission matrix
    else if (perm.includes('create') || perm.includes('update') || perm.includes('edit') ||
             perm.includes('import') || perm.includes('send') || perm.includes('invite') ||
             perm.includes('upload') || perm.includes('modify') || perm.includes('generate_pdf') ||
             perm.includes('customize')) {
      return {
        name: permission,
        category: 'write',
        risk: 'medium',
        description: getPermissionDescription(permission),
        icon: <Edit className="w-3 h-3 text-orange-500" />,
        color: 'text-orange-700 bg-orange-50 border-orange-200'
      };
    }
    
    // Read permissions (low risk) - based on actual permission matrix
    else {
      return {
        name: permission,
        category: 'read',
        risk: 'low',
        description: getPermissionDescription(permission),
        icon: <Eye className="w-3 h-3 text-green-500" />,
        color: 'text-green-700 bg-green-50 border-green-200'
      };
    }
  };

  // Updated helper functions based on actual permission matrix
  const getApplicationDisplayName = (appCode: string) => {
    const names: Record<string, string> = {
      'crm': 'Customer Relationship Management',
      'hr': 'Human Resources Management',
      'affiliate': 'Affiliate Management',
      'system': 'System Administration',
      'finance': 'Financial Management',
      'inventory': 'Inventory Management',
      'analytics': 'Analytics & Reporting'
    };
    return names[appCode] || appCode.toUpperCase();
  };

  const getModuleDisplayName = (moduleCode: string) => {
    const names: Record<string, string> = {
      // CRM modules
      'leads': 'Lead Management',
      'accounts': 'Account Management', 
      'contacts': 'Contact Management',
      'opportunities': 'Opportunity Management',
      'quotations': 'Quote Management',
      'dashboard': 'Dashboard',
      
      // HR modules
      'employees': 'Employee Management',
      'payroll': 'Payroll Management',
      'leave': 'Leave Management',
      
      // Affiliate modules
      'partners': 'Partner Management',
      'commissions': 'Commission Tracking',
      
      // Legacy mappings
      'deals': 'Deal Management',
      'companies': 'Company Management',
      'attendance': 'Time & Attendance',
      'recruitment': 'Recruitment',
      'users': 'User Management',
      'settings': 'System Settings',
      'roles': 'Role Management',
      'permissions': 'Permission Management',
      'reports': 'Reports & Analytics'
    };
    return names[moduleCode] || moduleCode.charAt(0).toUpperCase() + moduleCode.slice(1);
  };

  const getApplicationIcon = (appCode: string) => {
    const icons: Record<string, React.ReactNode> = {
      'crm': <Users className="w-4 h-4" />,
      'hr': <Users className="w-4 h-4" />,
      'affiliate': <Activity className="w-4 h-4" />,
      'system': <Settings className="w-4 h-4" />,
      'finance': <Database className="w-4 h-4" />,
      'inventory': <Package className="w-4 h-4" />,
      'analytics': <Grid className="w-4 h-4" />
    };
    return icons[appCode] || <Layers className="w-4 h-4" />;
  };

  const getPermissionDescription = (permission: string) => {
    // Updated descriptions based on actual permission matrix
    const descriptions: Record<string, string> = {
      // CRM permissions
      'read': 'View and browse information',
      'read_all': 'View all records in organization',
      'create': 'Add new records to the system',
      'update': 'Modify existing information',
      'delete': 'Remove records from the system',
      'export': 'Export data to various formats',
      'import': 'Import data from external files',
      'assign': 'Assign records to other users',
      'view_contacts': 'View contacts associated with accounts',
      'close': 'Mark opportunities as won/lost',
      'generate_pdf': 'Generate PDF versions',
      'send': 'Send documents to customers',
      'approve': 'Approve for processing',
      'customize': 'Customize layout and settings',
      
      // HR permissions
      'view_salary': 'Access employee salary details',
      'process': 'Run payroll calculations',
      'reject': 'Reject requests',
      'cancel': 'Cancel requests',
      'generate_reports': 'Generate reports',
      
      // Affiliate permissions
      'calculate': 'Calculate commission amounts',
      'pay': 'Process commission payments',
      'dispute': 'Manage commission disputes',
      
      // Generic permissions
      'view': 'Access and view',
      'manage': 'Full management access',
      'admin': 'Administrative privileges'
    };
    
    return descriptions[permission.toLowerCase()] || `${permission.replace('_', ' ')} access`;
  };

  const analysis = analyzePermissions();

  const toggleAppExpansion = (appKey: string) => {
    const newExpanded = new Set(expandedApps);
    if (newExpanded.has(appKey)) {
      newExpanded.delete(appKey);
    } else {
      newExpanded.add(appKey);
    }
    setExpandedApps(newExpanded);
  };

  const toggleModuleExpansion = (moduleKey: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleKey)) {
      newExpanded.delete(moduleKey);
    } else {
      newExpanded.add(moduleKey);
    }
    setExpandedModules(newExpanded);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Permission Details</CardTitle>
            {isSystemRole && <Badge variant="outline">System Role</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {userCount > 0 && <span>{userCount} users</span>}
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{analysis.totalPermissions}</div>
            <div className="text-xs text-gray-600">Total Permissions</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{analysis.adminCount}</div>
            <div className="text-xs text-red-600">Admin Permissions</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">{analysis.writeCount}</div>
            <div className="text-xs text-orange-600">Write Permissions</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{analysis.readCount}</div>
            <div className="text-xs text-green-600">Read Permissions</div>
          </div>
        </div>

        {/* Risk Assessment */}
        {analysis.adminCount > 10 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              <strong>High-Risk Role:</strong> This role has {analysis.adminCount} administrative permissions. Use with caution.
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Application Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Applications & Modules</h4>
            <Badge variant="outline">{analysis.applicationCount} apps, {analysis.moduleCount} modules</Badge>
          </div>

          {Object.entries(analysis.applications).map(([appKey, app]: [string, any]) => (
            <div key={appKey} className="border border-gray-200 rounded-lg">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleAppExpansion(appKey)}
              >
                <div className="flex items-center gap-3">
                  {expandedApps.has(appKey) ? 
                    <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  }
                  {app.icon}
                  <div>
                    <div className="font-medium text-gray-900">{app.name}</div>
                    <div className="text-xs text-gray-500">
                      {Object.keys(app.modules).length} modules • {app.totalPerms} permissions
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.adminPerms > 0 && <Badge variant="outline" className="text-red-600">Admin: {app.adminPerms}</Badge>}
                  {app.writePerms > 0 && <Badge variant="outline" className="text-orange-600">Write: {app.writePerms}</Badge>}
                  {app.readPerms > 0 && <Badge variant="outline" className="text-green-600">Read: {app.readPerms}</Badge>}
                </div>
              </div>

              {expandedApps.has(appKey) && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {Object.entries(app.modules).map(([moduleId, module]: [string, any]) => (
                    <div key={moduleId} className="border-b border-gray-100 last:border-b-0">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleModuleExpansion(moduleId)}
                      >
                        <div className="flex items-center gap-3 ml-6">
                          {expandedModules.has(moduleId) ? 
                            <ChevronDown className="w-3 h-3 text-gray-400" /> : 
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                          }
                          <Layers className="w-3 h-3 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{module.name}</div>
                            <div className="text-xs text-gray-500">{module.permissionCount} permissions</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {module.adminPerms > 0 && <Badge variant="outline" className="text-xs text-red-600">A:{module.adminPerms}</Badge>}
                          {module.writePerms > 0 && <Badge variant="outline" className="text-xs text-orange-600">W:{module.writePerms}</Badge>}
                          {module.readPerms > 0 && <Badge variant="outline" className="text-xs text-green-600">R:{module.readPerms}</Badge>}
                        </div>
                      </div>

                      {expandedModules.has(moduleId) && (
                        <div className="bg-white p-3 ml-12">
                          <div className="grid grid-cols-1 gap-2">
                            {module.permissionDetails && module.permissionDetails.slice(0, showAllPermissions ? undefined : 5).map((perm: any, index: number) => (
                              <div key={index} className={`flex items-center gap-2 p-2 rounded border ${perm.color}`}>
                                {perm.icon}
                                <span className="text-sm font-mono">{perm.name}</span>
                                <Badge variant="outline" className={`text-xs ${
                                  perm.risk === 'high' ? 'border-red-300 text-red-700' :
                                  perm.risk === 'medium' ? 'border-orange-300 text-orange-700' :
                                  'border-green-300 text-green-700'
                                }`}>
                                  {perm.risk}
                                </Badge>
                                <span className="text-xs text-gray-500 ml-auto">{perm.description}</span>
                              </div>
                            ))}
                            {module.permissionDetails && module.permissionDetails.length > 5 && !showAllPermissions && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowAllPermissions(true)}
                                className="text-xs"
                              >
                                Show {module.permissionDetails.length - 5} more permissions...
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(analysis.applications).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No permissions assigned to this role</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 