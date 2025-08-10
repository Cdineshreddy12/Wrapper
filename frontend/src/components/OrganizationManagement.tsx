import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Shield, 
  Crown, 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Package, 
  Building,
  TrendingUp,
  Clock,
  Eye,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Employee {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  department?: string;
  title?: string;
}

interface Application {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  icon: string;
  baseUrl: string;
  isEnabled: boolean;
  subscriptionTier: string;
  enabledModules: string[];
  maxUsers: number;
}

interface OrganizationManagementProps {
  employees: Employee[];
  applications: Application[];
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadDashboardData: () => void;
  inviteEmployee: () => void;
}

export function OrganizationUserManagement({ 
  employees, 
  isAdmin, 
  makeRequest, 
  loadDashboardData, 
  inviteEmployee 
}: Omit<OrganizationManagementProps, 'applications'>) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const promoteUser = async (userId: string, userName: string) => {
    if (confirm(`Promote ${userName} to organization admin?`)) {
      try {
        await makeRequest(`/tenants/current/users/${userId}/promote`, {
          method: 'POST'
        })
        toast.success('User promoted to admin!')
        loadDashboardData()
      } catch (error) {
        toast.error('Failed to promote user')
      }
    }
  }

  const deactivateUser = async (userId: string, userName: string) => {
    if (confirm(`Deactivate ${userName}? They will lose access to all applications.`)) {
      try {
        await makeRequest(`/tenants/current/users/${userId}/deactivate`, {
          method: 'POST'
        })
        toast.success('User deactivated!')
        loadDashboardData()
      } catch (error) {
        toast.error('Failed to deactivate user')
      }
    }
  }

  const resendInvite = async (userId: string, userEmail: string) => {
    try {
      await makeRequest(`/tenants/current/users/${userId}/resend-invite`, {
        method: 'POST'
      })
      toast.success(`Invitation resent to ${userEmail}`)
    } catch (error) {
      toast.error('Failed to resend invitation')
    }
  }

  return (
    <div className="space-y-6">
      {/* Team Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization Users</h2>
          <p className="text-gray-600">Manage team members, roles, and access across your organization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.open('/tenants/current/users/export', '_blank')}>
            <Package className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button onClick={inviteEmployee} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(e => e.isTenantAdmin).length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(e => e.isActive).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Setup</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(e => !e.onboardingCompleted).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Management Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Team Members ({employees.length})
            </span>
            <div className="flex items-center gap-2">
              {selectedUsers.length > 0 && (
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Bulk Actions ({selectedUsers.length})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.map((employee) => (
              <div 
                key={employee.userId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {employee.name?.charAt(0) || employee.email?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{employee.name || 'Unnamed User'}</div>
                    <div className="text-sm text-gray-600">{employee.email}</div>
                    {employee.department && (
                      <div className="text-xs text-gray-500">{employee.department} • {employee.title}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Role Badge */}
                  <Badge 
                    variant={employee.isTenantAdmin ? "default" : "secondary"}
                    className={employee.isTenantAdmin ? "bg-purple-100 text-purple-800 border-purple-300" : ""}
                  >
                    {employee.isTenantAdmin ? 'Organization Admin' : 'Standard User'}
                  </Badge>
                  
                  {/* Status Badge */}
                  <Badge 
                    variant={employee.isActive ? "default" : "destructive"}
                    className={employee.isActive ? "bg-green-100 text-green-800 border-green-300" : ""}
                  >
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  {/* Onboarding Status */}
                  {!employee.onboardingCompleted && (
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      Pending Setup
                    </Badge>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toast.success('User profile editing coming soon!')}
                      title="Edit user"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {!employee.onboardingCompleted && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => resendInvite(employee.userId, employee.email)}
                        title="Resend invitation"
                      >
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    
                    {isAdmin && !employee.isTenantAdmin && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => promoteUser(employee.userId, employee.name || employee.email)}
                        title="Promote to admin"
                      >
                        <Crown className="h-4 w-4 text-purple-600" />
                      </Button>
                    )}
                    
                    {isAdmin && employee.isActive && !employee.isTenantAdmin && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deactivateUser(employee.userId, employee.name || employee.email)}
                        title="Deactivate user"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {employees.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                <p className="text-gray-600 mb-4">Start building your team by inviting users</p>
                <Button onClick={inviteEmployee}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First User
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Recent User Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-sm">New user invited: john@example.com</span>
              <span className="text-xs text-gray-500 ml-auto">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">User activated: sarah@example.com</span>
              <span className="text-xs text-gray-500 ml-auto">1 day ago</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <span className="text-sm">Admin role assigned to mike@example.com</span>
              <span className="text-xs text-gray-500 ml-auto">3 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function OrganizationPermissionManagement({ applications }: { applications: Application[] }) {
  const [permissionMatrix, setPermissionMatrix] = useState({
    admin: { crm: 'full', hr: 'full', affiliate: 'full', analytics: 'full', billing: 'full' },
    manager: { crm: 'full', hr: 'limited', affiliate: 'full', analytics: 'full', billing: 'none' },
    sales: { crm: 'full', hr: 'none', affiliate: 'limited', analytics: 'limited', billing: 'none' },
    hr: { crm: 'none', hr: 'full', affiliate: 'none', analytics: 'limited', billing: 'none' },
    viewer: { crm: 'limited', hr: 'none', affiliate: 'limited', analytics: 'limited', billing: 'none' }
  })

  const togglePermission = (role: string, app: string) => {
    const current = permissionMatrix[role]?.[app] || 'none'
    const next = current === 'none' ? 'limited' : current === 'limited' ? 'full' : 'none'
    
    setPermissionMatrix(prev => ({
      ...prev,
      [role]: { ...prev[role], [app]: next }
    }))
    
    toast.success(`${role} ${app} permission updated to ${next}`)
  }

  const getPermissionColor = (level: string) => {
    switch (level) {
      case 'full': return 'bg-green-500'
      case 'limited': return 'bg-yellow-500'
      default: return 'bg-red-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Permission Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization Permissions</h2>
          <p className="text-gray-600">Control user access across all your business applications and features</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Export Permissions
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Role Template
          </Button>
        </div>
      </div>

      {/* Permission Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Roles</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Custom Permissions</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Role Templates
          </CardTitle>
          <CardDescription>
            Pre-configured permission sets for common organizational roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Admin Template */}
            <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-red-900">Organization Admin</h3>
                <Crown className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-sm text-red-700 mb-3">Full access to all features and settings</p>
              <div className="space-y-2">
                <Badge className="bg-red-100 text-red-800 text-xs mr-1">All Applications</Badge>
                <Badge className="bg-red-100 text-red-800 text-xs mr-1">User Management</Badge>
                <Badge className="bg-red-100 text-red-800 text-xs mr-1">Billing</Badge>
                <Badge className="bg-red-100 text-red-800 text-xs">Analytics</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 border-red-300 text-red-700">
                Assign Role
              </Button>
            </div>

            {/* Manager Template */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900">Manager</h3>
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 mb-3">Team leadership with limited admin access</p>
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-800 text-xs mr-1">CRM</Badge>
                <Badge className="bg-blue-100 text-blue-800 text-xs mr-1">HR</Badge>
                <Badge className="bg-blue-100 text-blue-800 text-xs mr-1">Reports</Badge>
                <Badge className="bg-blue-100 text-blue-800 text-xs">Team Mgmt</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 border-blue-300 text-blue-700">
                Assign Role
              </Button>
            </div>

            {/* Sales Rep Template */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-900">Sales Representative</h3>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700 mb-3">CRM access with deal management</p>
              <div className="space-y-2">
                <Badge className="bg-green-100 text-green-800 text-xs mr-1">CRM</Badge>
                <Badge className="bg-green-100 text-green-800 text-xs mr-1">Contacts</Badge>
                <Badge className="bg-green-100 text-green-800 text-xs mr-1">Deals</Badge>
                <Badge className="bg-green-100 text-green-800 text-xs">Reports</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 border-green-300 text-green-700">
                Assign Role
              </Button>
            </div>

            {/* HR Specialist Template */}
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-900">HR Specialist</h3>
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 mb-3">Human resources and employee management</p>
              <div className="space-y-2">
                <Badge className="bg-purple-100 text-purple-800 text-xs mr-1">HR</Badge>
                <Badge className="bg-purple-100 text-purple-800 text-xs mr-1">Employees</Badge>
                <Badge className="bg-purple-100 text-purple-800 text-xs mr-1">Payroll</Badge>
                <Badge className="bg-purple-100 text-purple-800 text-xs">Documents</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 border-purple-300 text-purple-700">
                Assign Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Interactive Application Permissions Matrix
          </CardTitle>
          <CardDescription>
            Click on permission dots to toggle access levels: Full → Limited → None
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application / Feature
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Rep
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HR Specialist
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Viewer
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* CRM Application */}
                <tr className="hover:bg-blue-25">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-900">
                    📊 CRM Application
                  </td>
                  {Object.keys(permissionMatrix).map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <button
                        onClick={() => togglePermission(role, 'crm')}
                        className={`w-4 h-4 rounded-full mx-auto cursor-pointer hover:scale-110 transition-transform ${getPermissionColor(permissionMatrix[role]?.crm || 'none')}`}
                        title={`${role}: ${permissionMatrix[role]?.crm || 'none'} access to CRM`}
                      />
                    </td>
                  ))}
                </tr>
                
                {/* HR Management */}
                <tr className="hover:bg-purple-25">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-purple-900">
                    👥 HR Management
                  </td>
                  {Object.keys(permissionMatrix).map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <button
                        onClick={() => togglePermission(role, 'hr')}
                        className={`w-4 h-4 rounded-full mx-auto cursor-pointer hover:scale-110 transition-transform ${getPermissionColor(permissionMatrix[role]?.hr || 'none')}`}
                        title={`${role}: ${permissionMatrix[role]?.hr || 'none'} access to HR`}
                      />
                    </td>
                  ))}
                </tr>
                
                {/* Affiliate Management */}
                <tr className="hover:bg-green-25">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-900">
                    🤝 Affiliate Management
                  </td>
                  {Object.keys(permissionMatrix).map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <button
                        onClick={() => togglePermission(role, 'affiliate')}
                        className={`w-4 h-4 rounded-full mx-auto cursor-pointer hover:scale-110 transition-transform ${getPermissionColor(permissionMatrix[role]?.affiliate || 'none')}`}
                        title={`${role}: ${permissionMatrix[role]?.affiliate || 'none'} access to Affiliate`}
                      />
                    </td>
                  ))}
                </tr>
                
                {/* Analytics & Reports */}
                <tr className="hover:bg-gray-25">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                    📈 Analytics & Reports
                  </td>
                  {Object.keys(permissionMatrix).map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <button
                        onClick={() => togglePermission(role, 'analytics')}
                        className={`w-4 h-4 rounded-full mx-auto cursor-pointer hover:scale-110 transition-transform ${getPermissionColor(permissionMatrix[role]?.analytics || 'none')}`}
                        title={`${role}: ${permissionMatrix[role]?.analytics || 'none'} access to Analytics`}
                      />
                    </td>
                  ))}
                </tr>
                
                {/* Billing & Payments */}
                <tr className="hover:bg-red-25">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-red-900">
                    💳 Billing & Payments
                  </td>
                  {Object.keys(permissionMatrix).map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <button
                        onClick={() => togglePermission(role, 'billing')}
                        className={`w-4 h-4 rounded-full mx-auto cursor-pointer hover:scale-110 transition-transform ${getPermissionColor(permissionMatrix[role]?.billing || 'none')}`}
                        title={`${role}: ${permissionMatrix[role]?.billing || 'none'} access to Billing`}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Full Access</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Limited Access</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">No Access</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 