import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export const RoleAssignmentTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateTest = (testName: string, status: TestResult['status'], message: string, data?: any) => {
    setTests(prev => prev.map(test => 
      test.test === testName 
        ? { ...test, status, message, data }
        : test
    ));
  };

  const runTests = async () => {
    setRunning(true);
    setTests([
      { test: 'Load Users', status: 'pending', message: 'Testing...' },
      { test: 'Load Roles', status: 'pending', message: 'Testing...' },
      { test: 'Load User Roles', status: 'pending', message: 'Testing...' },
      { test: 'Assign Role', status: 'pending', message: 'Testing...' },
      { test: 'Duplicate Assignment', status: 'pending', message: 'Testing...' },
      { test: 'Remove Role', status: 'pending', message: 'Testing...' }
    ]);

    let testUserId: string = '';
    let testRoleId: string = '';

    try {
      // Test 1: Load Users
      console.log('🧪 Test 1: Loading users...');
      const usersResponse = await api.get('/admin/users');
      if (usersResponse.data.success && usersResponse.data.data) {
        const users = usersResponse.data.data.users || usersResponse.data.data;
        if (users.length > 0) {
          testUserId = users[0].userId;
          updateTest('Load Users', 'success', `Loaded ${users.length} users`, users);
        } else {
          updateTest('Load Users', 'error', 'No users found', null);
          return;
        }
      } else {
        updateTest('Load Users', 'error', 'Failed to load users', usersResponse.data);
        return;
      }

      // Test 2: Load Roles
      console.log('🧪 Test 2: Loading roles...');
      const rolesResponse = await api.get('/roles');
      if (rolesResponse.data.success && rolesResponse.data.data) {
        const roles = rolesResponse.data.data.roles || rolesResponse.data.data;
        if (roles.length > 0) {
          testRoleId = roles[0].roleId;
          updateTest('Load Roles', 'success', `Loaded ${roles.length} roles`, roles);
        } else {
          updateTest('Load Roles', 'error', 'No roles found', null);
          return;
        }
      } else {
        updateTest('Load Roles', 'error', 'Failed to load roles', rolesResponse.data);
        return;
      }

      // Test 3: Load User Roles
      console.log('🧪 Test 3: Loading user roles...');
      const userRolesResponse = await api.get(`/admin/users/${testUserId}/roles`);
      if (userRolesResponse.data.success) {
        const userRoles = userRolesResponse.data.data.roles || userRolesResponse.data.data || [];
        updateTest('Load User Roles', 'success', `User has ${userRoles.length} roles`, userRoles);
      } else {
        updateTest('Load User Roles', 'error', 'Failed to load user roles', userRolesResponse.data);
      }

      // Test 4: Assign Role
      console.log('🧪 Test 4: Assigning role...');
      try {
        const assignResponse = await api.post('/admin/users/assign-role', {
          userId: testUserId,
          roleId: testRoleId
        });
        if (assignResponse.data.success) {
          updateTest('Assign Role', 'success', 'Role assigned successfully', assignResponse.data);
        } else {
          updateTest('Assign Role', 'error', assignResponse.data.message || 'Assignment failed', assignResponse.data);
        }
      } catch (assignError: any) {
        if (assignError.response?.status === 409) {
          updateTest('Assign Role', 'success', 'Role already assigned (expected behavior)', assignError.response.data);
        } else {
          updateTest('Assign Role', 'error', assignError.response?.data?.message || 'Assignment failed', assignError.response?.data);
        }
      }

      // Test 5: Test Duplicate Assignment
      console.log('🧪 Test 5: Testing duplicate assignment...');
      try {
        const duplicateResponse = await api.post('/admin/users/assign-role', {
          userId: testUserId,
          roleId: testRoleId
        });
        updateTest('Duplicate Assignment', 'error', 'Should have returned 409 conflict', duplicateResponse.data);
      } catch (duplicateError: any) {
        if (duplicateError.response?.status === 409) {
          const errorData = duplicateError.response.data;
          if (errorData.details?.existingAssignment) {
            updateTest('Duplicate Assignment', 'success', 'Duplicate prevention working correctly', errorData);
          } else {
            updateTest('Duplicate Assignment', 'success', 'Got 409 conflict as expected', errorData);
          }
        } else {
          updateTest('Duplicate Assignment', 'error', 'Unexpected error response', duplicateError.response?.data);
        }
      }

      // Test 6: Remove Role
      console.log('🧪 Test 6: Removing role...');
      try {
        const removeResponse = await api.delete(`/admin/users/${testUserId}/roles/${testRoleId}`);
        if (removeResponse.data.success) {
          updateTest('Remove Role', 'success', 'Role removed successfully', removeResponse.data);
          
          // Re-assign for next test run
          await api.post('/admin/users/assign-role', {
            userId: testUserId,
            roleId: testRoleId
          });
        } else {
          updateTest('Remove Role', 'error', removeResponse.data.message || 'Removal failed', removeResponse.data);
        }
      } catch (removeError: any) {
        updateTest('Remove Role', 'error', removeError.response?.data?.message || 'Removal failed', removeError.response?.data);
      }

    } catch (error: any) {
      console.error('🚨 Test suite error:', error);
      toast.error('Test suite failed: ' + error.message);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Role Assignment API Tests</h2>
              <p className="text-sm text-gray-600">Test the API integration for role management</p>
            </div>
            <button
              onClick={runTests}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Play className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
              {running ? 'Running Tests...' : 'Run Tests'}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div
                key={test.test}
                className={`p-4 rounded-lg border ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{test.test}</h3>
                      <p className="text-sm text-gray-600">{test.message}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                </div>
                
                {test.data && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {tests.length === 0 && (
            <div className="text-center py-12">
              <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click "Run Tests" to start testing the API integration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleAssignmentTest; 