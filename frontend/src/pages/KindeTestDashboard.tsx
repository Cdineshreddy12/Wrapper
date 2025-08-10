import React, { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

interface Organization {
  tenantId: string;
  companyName: string;
  subdomain: string;
  adminEmail: string;
  industry: string;
  onboardedAt: string;
  userCount: number;
}

interface User {
  userId: string;
  kindeUserId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  roles: any[];
}

interface Role {
  roleId: string;
  roleName: string;
  description: string;
  permissions: any;
  restrictions: any;
  isSystemRole: boolean;
  priority: number;
  userCount: number;
}

interface TestResult {
  endpoint: string;
  method: string;
  success: boolean;
  responseTime: number;
  data?: any;
  error?: string;
}

const KindeTestDashboard: React.FC = () => {
  const { user, isAuthenticated, getToken } = useKindeAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Form states
  const [newOrg, setNewOrg] = useState({
    companyName: '',
    subdomain: '',
    adminEmail: '',
    adminName: '',
    industry: '',
    selectedPlan: 'basic'
  });
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    roleIds: [] as string[],
    message: ''
  });
  const [newRole, setNewRole] = useState({
    roleName: '',
    description: '',
    permissions: {},
    priority: 100
  });
  const [testEmail, setTestEmail] = useState('');
  const [apiTestUrl, setApiTestUrl] = useState('/admin/auth-status');
  const [apiTestMethod, setApiTestMethod] = useState('GET');
  const [apiTestBody, setApiTestBody] = useState('{}');
  const [removalMessage, setRemovalMessage] = useState('');
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string>('');

  // API helper function
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();
    const startTime = Date.now();
    
    try {
      const response = await fetch(`https://wrapper.zopkit.com${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      const testResult: TestResult = {
        endpoint,
        method: options.method || 'GET',
        success: response.ok,
        responseTime,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.message || 'Request failed' : undefined
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 19)]); // Keep last 20 results
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      const testResult: TestResult = {
        endpoint,
        method: options.method || 'GET',
        success: false,
        responseTime,
        error: err.message
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 19)]);
      throw err;
    }
  };

  // Load functions
  const loadAuthStatus = async () => {
    try {
      const data = await makeRequest('/admin/auth-status');
      setAuthStatus(data.authStatus);
    } catch (err: any) {
      setError(`Failed to load auth status: ${err.message}`);
    }
  };

  const loadOrganizations = async () => {
    try {
      const data = await makeRequest('/admin/organizations');
      setOrganizations(data.organizations);
      if (data.organizations.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data.organizations[0].tenantId);
      }
    } catch (err: any) {
      setError(`Failed to load organizations: ${err.message}`);
    }
  };

  const loadUsers = async (orgId: string) => {
    if (!orgId) return;
    try {
      const data = await makeRequest(`/admin/organizations/${orgId}/users`);
      setUsers(data.users);
    } catch (err: any) {
      setError(`Failed to load users: ${err.message}`);
    }
  };

  const loadRoles = async (orgId: string) => {
    if (!orgId) return;
    try {
      const data = await makeRequest(`/admin/organizations/${orgId}/roles`);
      setRoles(data.roles);
    } catch (err: any) {
      setError(`Failed to load roles: ${err.message}`);
    }
  };

  // Action functions
  const createOrganization = async () => {
    setLoading(true);
    try {
      await makeRequest('/onboarding/onboard', {
        method: 'POST',
        body: JSON.stringify(newOrg)
      });
      setSuccess('Organization created successfully!');
      setNewOrg({ companyName: '', subdomain: '', adminEmail: '', adminName: '', industry: '', selectedPlan: 'basic' });
      loadOrganizations();
    } catch (err: any) {
      setError(`Failed to create organization: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!selectedOrgId) {
      setError('Please select an organization first');
      return;
    }
    
    setLoading(true);
    try {
      await makeRequest(`/admin/organizations/${selectedOrgId}/invite-user`, {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setSuccess(`User ${newUser.email} invited successfully!`);
      setNewUser({ email: '', name: '', roleIds: [], message: '' });
      loadUsers(selectedOrgId);
    } catch (err: any) {
      setError(`Failed to invite user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    if (!selectedOrgId) {
      setError('Please select an organization first');
      return;
    }
    
    setLoading(true);
    try {
      await makeRequest(`/admin/organizations/${selectedOrgId}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          ...newRole,
          permissions: JSON.parse(newRole.permissions),
          restrictions: JSON.parse(newRole.restrictions)
        })
      });
      setSuccess(`Role ${newRole.roleName} created successfully!`);
      setNewRole({
        roleName: '',
        description: '',
        permissions: {},
        priority: 100
      });
      loadRoles(selectedOrgId);
    } catch (err: any) {
      setError(`Failed to create role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEmailService = async () => {
    setLoading(true);
    try {
      await makeRequest('/admin/test-email', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, name: 'Test User' })
      });
      setSuccess(`Test email sent to ${testEmail}!`);
    } catch (err: any) {
      setError(`Failed to send test email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCustomAPI = async () => {
    setLoading(true);
    try {
      const options: RequestInit = { method: apiTestMethod };
      if (apiTestMethod !== 'GET' && apiTestBody.trim()) {
        options.body = apiTestBody;
      }
      
      await makeRequest(apiTestUrl, options);
      setSuccess(`API test completed! Check results below.`);
    } catch (err: any) {
      setError(`API test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, roleIds: string[]) => {
    setLoading(true);
    try {
      await makeRequest(`/admin/organizations/${selectedOrgId}/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleIds })
      });
      setSuccess('Roles assigned successfully!');
      loadUsers(selectedOrgId);
    } catch (err: any) {
      setError(`Failed to assign roles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addSingleRole = async (userId: string, roleId: string) => {
    setLoading(true);
    try {
      await makeRequest(`/admin/organizations/${selectedOrgId}/users/${userId}/roles/${roleId}`, {
        method: 'POST'
      });
      setSuccess('Role added successfully!');
      loadUsers(selectedOrgId);
    } catch (err: any) {
      setError(`Failed to add role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeSingleRole = async (userId: string, roleId: string) => {
    setLoading(true);
    try {
      await makeRequest(`/admin/organizations/${selectedOrgId}/users/${userId}/roles/${roleId}`, {
        method: 'DELETE'
      });
      setSuccess('Role removed successfully!');
      loadUsers(selectedOrgId);
    } catch (err: any) {
      setError(`Failed to remove role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeUserWithMessage = async (userId: string, customMessage: string, sendEmail: boolean = true) => {
    setLoading(true);
    try {
      await makeRequest(`/admin/organizations/${selectedOrgId}/users/${userId}/remove`, {
        method: 'DELETE',
        body: JSON.stringify({ customMessage, sendEmail })
      });
      setSuccess('User removed successfully!');
      loadUsers(selectedOrgId);
    } catch (err: any) {
      setError(`Failed to remove user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAuthStatus();
      loadOrganizations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedOrgId) {
      loadUsers(selectedOrgId);
      loadRoles(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Kinde Test Dashboard</h1>
          <p className="text-gray-600 mb-4">Please log in to access the testing dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧪 Kinde Test Dashboard</h1>
              <p className="text-gray-600">Comprehensive testing interface for all Kinde operations</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Logged in as: <strong>{user?.email}</strong></p>
              <p className="text-xs text-gray-500">User ID: {user?.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 mx-4 mt-4 rounded">
          ✅ {success}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'organizations', label: '🏢 Organizations', icon: '🏢' },
              { id: 'users', label: '👥 Users', icon: '👥' },
              { id: 'roles', label: '🎭 Roles', icon: '🎭' },
              { id: 'email', label: '📧 Email Testing', icon: '📧' },
              { id: 'api', label: '🔧 API Testing', icon: '🔧' },
              { id: 'results', label: '📋 Test Results', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Authentication</h3>
                <p className="text-3xl font-bold text-green-600">{isAuthenticated ? '✅' : '❌'}</p>
                <p className="text-sm text-gray-600">
                  {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Organizations</h3>
                <p className="text-3xl font-bold text-blue-600">{organizations.length}</p>
                <p className="text-sm text-gray-600">Total organizations</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                <p className="text-3xl font-bold text-purple-600">{users.length}</p>
                <p className="text-sm text-gray-600">Users in selected org</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Roles</h3>
                <p className="text-3xl font-bold text-orange-600">{roles.length}</p>
                <p className="text-sm text-gray-600">Roles in selected org</p>
              </div>
            </div>

            {authStatus && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Auth Status Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>User ID:</strong> {authStatus.userId}</p>
                    <p><strong>Internal User ID:</strong> {authStatus.internalUserId}</p>
                    <p><strong>Email:</strong> {authStatus.email}</p>
                    <p><strong>Name:</strong> {authStatus.name}</p>
                  </div>
                  <div>
                    <p><strong>Tenant ID:</strong> {authStatus.tenantId}</p>
                    <p><strong>Kinde Org ID:</strong> {authStatus.kindeOrgId}</p>
                    <p><strong>Needs Onboarding:</strong> {authStatus.needsOnboarding ? '✅' : '❌'}</p>
                    <p><strong>Is Active:</strong> {authStatus.isActive ? '✅' : '❌'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={loadAuthStatus}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  🔄 Refresh Auth Status
                </button>
                <button
                  onClick={loadOrganizations}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  🔄 Refresh Organizations
                </button>
                <button
                  onClick={() => selectedOrgId && loadUsers(selectedOrgId)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  disabled={!selectedOrgId}
                >
                  🔄 Refresh Users
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Create New Organization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={newOrg.companyName}
                  onChange={(e) => setNewOrg({ ...newOrg, companyName: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Subdomain"
                  value={newOrg.subdomain}
                  onChange={(e) => setNewOrg({ ...newOrg, subdomain: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={newOrg.adminEmail}
                  onChange={(e) => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Admin Name"
                  value={newOrg.adminName}
                  onChange={(e) => setNewOrg({ ...newOrg, adminName: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Industry"
                  value={newOrg.industry}
                  onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <select
                  value={newOrg.selectedPlan}
                  onChange={(e) => setNewOrg({ ...newOrg, selectedPlan: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <button
                onClick={createOrganization}
                disabled={loading}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '⏳ Creating...' : '🏢 Create Organization'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Existing Organizations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Company</th>
                      <th className="text-left py-2">Subdomain</th>
                      <th className="text-left py-2">Admin Email</th>
                      <th className="text-left py-2">Users</th>
                      <th className="text-left py-2">Created</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.tenantId} className="border-b">
                        <td className="py-2">{org.companyName}</td>
                        <td className="py-2">{org.subdomain}</td>
                        <td className="py-2">{org.adminEmail}</td>
                        <td className="py-2">{org.userCount}</td>
                        <td className="py-2">{new Date(org.onboardedAt).toLocaleDateString()}</td>
                        <td className="py-2">
                          <button
                            onClick={() => setSelectedOrgId(org.tenantId)}
                            className={`px-3 py-1 rounded text-sm ${
                              selectedOrgId === org.tenantId
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {selectedOrgId === org.tenantId ? '✓ Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {!selectedOrgId ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                ⚠️ Please select an organization first from the Organizations tab.
              </div>
            ) : (
              <>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Invite New User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <select
                      multiple
                      value={newUser.roleIds}
                      onChange={(e) => setNewUser({ 
                        ...newUser, 
                        roleIds: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {roles.map((role) => (
                        <option key={role.roleId} value={role.roleId}>
                          {role.roleName} - {role.description}
                        </option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Invitation Message (optional)"
                      value={newUser.message}
                      onChange={(e) => setNewUser({ ...newUser, message: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={inviteUser}
                    disabled={loading}
                    className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? '⏳ Inviting...' : '📧 Send Invitation'}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Organization Users</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Name</th>
                          <th className="text-left py-2">Email</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Admin</th>
                          <th className="text-left py-2">Roles</th>
                          <th className="text-left py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.userId} className="border-b">
                            <td className="py-2">{user.name}</td>
                            <td className="py-2">{user.email}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.isActive ? 'Active' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-2">{user.isTenantAdmin ? '✅' : '❌'}</td>
                            <td className="py-2">
                              <div className="space-y-1">
                                {user.roles?.map(role => (
                                  <div key={role.roleId} className="flex items-center space-x-2">
                                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {role.roleName}
                                    </span>
                                    <button
                                      onClick={() => removeSingleRole(user.userId, role.roleId)}
                                      className="text-red-600 hover:text-red-800 text-xs"
                                      title="Remove this role"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                )) || <span className="text-gray-500">No roles</span>}
                              </div>
                            </td>
                            <td className="py-2">
                              <div className="space-x-2">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addSingleRole(user.userId, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="">+ Add Role</option>
                                  {roles.filter(role => !user.roles?.some(ur => ur.roleId === role.roleId)).map((role) => (
                                    <option key={role.roleId} value={role.roleId}>
                                      {role.roleName}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    setUserToRemove(user.userId);
                                    setShowRemovalModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-800 text-xs bg-red-100 px-2 py-1 rounded"
                                >
                                  🗑️ Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Removal Modal */}
                {showRemovalModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">🗑️ Remove User</h3>
                      <p className="text-gray-600 mb-4">
                        Are you sure you want to remove this user from the organization? This action cannot be undone.
                      </p>
                      <div className="space-y-4">
                        <textarea
                          placeholder="Custom message for the user (optional)"
                          value={removalMessage}
                          onChange={(e) => setRemovalMessage(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          rows={3}
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="sendEmail"
                            checked={true}
                            className="rounded"
                          />
                          <label htmlFor="sendEmail" className="text-sm text-gray-700">
                            Send notification email to user
                          </label>
                        </div>
                      </div>
                      <div className="flex space-x-3 mt-6">
                        <button
                          onClick={() => {
                            removeUserWithMessage(userToRemove, removalMessage, true);
                            setShowRemovalModal(false);
                            setRemovalMessage('');
                            setUserToRemove('');
                          }}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                          🗑️ Remove User
                        </button>
                        <button
                          onClick={() => {
                            setShowRemovalModal(false);
                            setRemovalMessage('');
                            setUserToRemove('');
                          }}
                          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {!selectedOrgId ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                ⚠️ Please select an organization first from the Organizations tab.
              </div>
            ) : (
              <>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🎭 Create New Role</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Role Name"
                      value={newRole.roleName}
                      onChange={(e) => setNewRole({ ...newRole, roleName: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Priority (1-100)"
                      value={newRole.priority}
                      onChange={(e) => setNewRole({ ...newRole, priority: parseInt(e.target.value) })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <div></div>
                    <textarea
                      placeholder="Permissions JSON"
                      value={JSON.stringify(newRole.permissions)}
                      onChange={(e) => setNewRole({ ...newRole, permissions: JSON.parse(e.target.value) })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      rows={4}
                    />
                    <textarea
                      placeholder="Restrictions JSON"
                      value={JSON.stringify(newRole.restrictions)}
                      onChange={(e) => setNewRole({ ...newRole, restrictions: JSON.parse(e.target.value) })}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      rows={4}
                    />
                  </div>
                  <button
                    onClick={createRole}
                    disabled={loading}
                    className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? '⏳ Creating...' : '🎭 Create Role'}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Organization Roles</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Role Name</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-left py-2">Priority</th>
                          <th className="text-left py-2">Users</th>
                          <th className="text-left py-2">System Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((role) => (
                          <tr key={role.roleId} className="border-b">
                            <td className="py-2 font-medium">{role.roleName}</td>
                            <td className="py-2">{role.description}</td>
                            <td className="py-2">{role.priority}</td>
                            <td className="py-2">{role.userCount}</td>
                            <td className="py-2">{role.isSystemRole ? '✅' : '❌'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Email Testing Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Email Service Testing</h3>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Test Email Address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  onClick={testEmailService}
                  disabled={loading || !testEmail}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '⏳ Sending...' : '📧 Send Test Email'}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Invitation URLs for Testing</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">❌ Wrong Email (Current URL):</h4>
                  <code className="text-sm bg-white p-2 rounded border block break-all">
                    https://wrapper.zopkit.com/invite/accept?org=org_aa9d25628de89&email=s211119@rguktsklm.ac.in
                  </code>
                  <p className="text-sm text-red-600 mt-1">This will fail - missing 't' in email</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">✅ Correct Email (Fixed URL):</h4>
                  <code className="text-sm bg-white p-2 rounded border block break-all">
                    https://wrapper.zopkit.com/invite/accept?org=org_aa9d25628de89&email=s211119@rgukttsklm.ac.in
                  </code>
                  <p className="text-sm text-green-600 mt-1">This should work - has correct email</p>
                  <button
                    onClick={() => window.open('https://wrapper.zopkit.com/invite/accept?org=org_aa9d25628de89&email=s211119@rgukttsklm.ac.in', '_blank')}
                    className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                  >
                    🔗 Test This URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Testing Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Custom API Testing</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={apiTestMethod}
                    onChange={(e) => setApiTestMethod(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    placeholder="API Endpoint (e.g., /admin/auth-status)"
                    value={apiTestUrl}
                    onChange={(e) => setApiTestUrl(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2"
                  />
                </div>
                {apiTestMethod !== 'GET' && (
                  <textarea
                    placeholder="Request Body (JSON)"
                    value={apiTestBody}
                    onChange={(e) => setApiTestBody(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={4}
                  />
                )}
                <button
                  onClick={testCustomAPI}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? '⏳ Testing...' : '🚀 Test API'}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Quick API Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Auth Status', endpoint: '/admin/auth-status', method: 'GET' },
                  { name: 'Organizations', endpoint: '/admin/organizations', method: 'GET' },
                  { name: 'Users (Selected Org)', endpoint: `/admin/organizations/${selectedOrgId}/users`, method: 'GET' },
                  { name: 'Roles (Selected Org)', endpoint: `/admin/organizations/${selectedOrgId}/roles`, method: 'GET' },
                  { name: 'Health Check', endpoint: '/health', method: 'GET' },
                  { name: 'Test Permission', endpoint: '/admin/test-permission', method: 'POST' },
                  { name: 'Debug All Org Users', endpoint: `/admin/debug/organization/${selectedOrgId}/all-users`, method: 'GET' },
                  { name: 'Debug Invitation (s211119)', endpoint: '/invitations/debug/org_aa9d25628de89/s211119@rguktsklm.ac.in', method: 'GET' },
                  { name: 'Test Invitation Details', endpoint: '/invitations/details?org=org_aa9d25628de89&email=s211119@rguktsklm.ac.in', method: 'GET' },
                  { name: 'Test CORRECT Email (with extra t)', endpoint: '/invitations/details?org=org_aa9d25628de89&email=s211119@rgukttsklm.ac.in', method: 'GET' }
                ].map((test) => (
                  <button
                    key={test.name}
                    onClick={() => {
                      setApiTestUrl(test.endpoint);
                      setApiTestMethod(test.method);
                      if (test.method === 'POST' && test.name === 'Test Permission') {
                        setApiTestBody('{"permission": "modules.crm.contacts.view"}');
                      }
                    }}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    disabled={test.name.includes('Selected Org') && !selectedOrgId}
                  >
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-gray-600">{test.method} {test.endpoint}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Test Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 API Test Results</h3>
              <div className="space-y-4">
                {testResults.length === 0 ? (
                  <p className="text-gray-500">No test results yet. Run some API tests to see results here.</p>
                ) : (
                  testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg ${result.success ? '✅' : '❌'}`}>
                            {result.success ? '✅' : '❌'}
                          </span>
                          <span className="font-medium">{result.method} {result.endpoint}</span>
                          <span className="text-sm text-gray-600">({result.responseTime}ms)</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      {result.error && (
                        <div className="text-red-700 text-sm mb-2">
                          <strong>Error:</strong> {result.error}
                        </div>
                      )}
                      {result.data && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            View Response Data
                          </summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KindeTestDashboard; 