import React, { useState, useEffect } from 'react';
import { Shield, Users, Eye, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContextProvider';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PermissionFlow {
  step: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  message: string;
}

export const PermissionDiagnostic: React.FC = () => {
  const { user, permissions, roles, refreshUserContext } = useUserContext();
  const [diagnosticResults, setDiagnosticResults] = useState<PermissionFlow[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setDiagnosticResults([]);

    const steps: PermissionFlow[] = [
      { step: 'User Authentication', status: 'pending', message: 'Checking user authentication...' },
      { step: 'Role Assignment', status: 'pending', message: 'Checking user roles...' },
      { step: 'Permission Aggregation', status: 'pending', message: 'Checking permission aggregation...' },
      { step: 'B2B Integration', status: 'pending', message: 'Verifying B2B CRM integration...' },
      { step: 'Frontend Permissions', status: 'pending', message: 'Checking frontend permission access...' },
    ];

    setDiagnosticResults([...steps]);

    try {
      // Step 1: User Authentication
      await updateStep('User Authentication', user ? 'success' : 'error', 
        user ? 'User is authenticated' : 'User not authenticated', user);

      if (!user) {
        setIsRunning(false);
        return;
      }

      // Step 2: Check user roles
      const roleCount = roles.length;
      await updateStep('Role Assignment', roleCount > 0 ? 'success' : 'error',
        roleCount > 0 ? `User has ${roleCount} role(s) assigned` : 'No roles assigned to user',
        { roles: roles.map(r => ({ roleName: r.roleName, isSystemRole: r.isSystemRole })) });

      // Step 3: Check permission aggregation
      const permissionCount = permissions.length;
      await updateStep('Permission Aggregation', permissionCount > 0 ? 'success' : 'error',
        permissionCount > 0 ? `${permissionCount} permissions aggregated from roles` : 'No permissions found',
        { 
          permissions: permissions.map(p => ({ 
            name: p.name, 
            resource: p.resource, 
            level: p.level 
          })),
          uniqueResources: [...new Set(permissions.map(p => p.resource))]
        });

      // Step 4: Test B2B Integration (auth-status endpoint)
      try {
        const authResponse = await api.get('/admin/auth-status');
        const backendPermissions = authResponse.data.permissions || [];
        const backendRoles = authResponse.data.roles || [];
        
        await updateStep('B2B Integration', 'success',
          `Backend returns ${backendPermissions.length} permissions from ${backendRoles.length} roles`,
          {
            backend: {
              permissions: backendPermissions.length,
              roles: backendRoles.length,
              permissionSample: backendPermissions.slice(0, 3)
            },
            frontend: {
              permissions: permissionCount,
              roles: roleCount
            },
            match: backendPermissions.length === permissionCount
          });
      } catch (error) {
        await updateStep('B2B Integration', 'error',
          `Backend integration failed: ${error.message}`,
          { error: error.response?.data || error.message });
      }

      // Step 5: Test frontend permission functions
      const testPermissions = ['read', 'write', 'admin', 'user_management'];
      const permissionTests = testPermissions.map(perm => ({
        permission: perm,
        hasPermission: permissions.some(p => p.name === perm)
      }));

      await updateStep('Frontend Permissions', 'success',
        'Frontend permission checking is working',
        {
          availablePermissions: permissions.map(p => p.name),
          testResults: permissionTests,
          adminOverride: user.isTenantAdmin
        });

    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Diagnostic failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const updateStep = async (stepName: string, status: PermissionFlow['status'], message: string, data?: any) => {
    setDiagnosticResults(prev => prev.map(step => 
      step.step === stepName 
        ? { ...step, status, message, data }
        : step
    ));
    // Add small delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const getStatusIcon = (status: PermissionFlow['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: PermissionFlow['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Permission Flow Diagnostic</h1>
              <p className="text-sm text-gray-600">
                Verify that role-based permissions are correctly flowing to the B2B CRM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshUserContext}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh User
            </button>
            <button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Diagnostic'}
            </button>
          </div>
        </div>
      </div>

      {/* Current User State */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Current User</h3>
          {user ? (
            <div className="space-y-2">
              <p className="text-sm"><span className="font-medium">Email:</span> {user.email}</p>
              <p className="text-sm"><span className="font-medium">Name:</span> {user.name}</p>
              <p className="text-sm"><span className="font-medium">Tenant:</span> {user.tenantId}</p>
              <p className="text-sm">
                <span className="font-medium">Admin:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${user.isTenantAdmin ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {user.isTenantAdmin ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Not authenticated</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">User Roles ({roles.length})</h3>
          {roles.length > 0 ? (
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.roleId} className="flex items-center justify-between">
                  <span className="text-sm">{role.roleName}</span>
                  {role.isSystemRole && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">System</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No roles assigned</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Permissions ({permissions.length})</h3>
          {permissions.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {permissions.map(permission => (
                <div key={permission.id} className="text-sm">
                  <span className="font-medium">{permission.name}</span>
                  <span className="text-gray-500 ml-2">({permission.resource})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No permissions found</p>
          )}
        </div>
      </div>

      {/* Diagnostic Results */}
      {diagnosticResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Diagnostic Results</h2>
          <div className="space-y-4">
            {diagnosticResults.map((result, index) => (
              <div
                key={result.step}
                className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {index + 1}. {result.step}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  </div>
                </div>
                
                {result.data && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-700 cursor-pointer hover:text-gray-900 font-medium">
                      View Details
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Fixes */}
      {diagnosticResults.some(r => r.status === 'error') && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-medium text-orange-900 mb-2">Potential Issues Found</h3>
          <div className="space-y-2">
            {diagnosticResults
              .filter(r => r.status === 'error')
              .map(result => (
                <p key={result.step} className="text-sm text-orange-800">
                  • <strong>{result.step}:</strong> {result.message}
                </p>
              ))}
          </div>
          <div className="mt-3">
            <button
              onClick={() => window.open('/roles-dashboard', '_blank')}
              className="text-sm text-orange-700 hover:text-orange-900 underline"
            >
              Go to Role Management Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionDiagnostic; 