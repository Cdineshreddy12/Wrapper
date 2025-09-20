import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OrganizationHierarchyChart } from './OrganizationHierarchyChart'

// Import Entity type from the hierarchy chart component
type Entity = {
  entityId: string;
  entityName: string;
  entityType: 'organization' | 'location' | 'department' | 'team';
  organizationType?: string;
  locationType?: string;
  entityLevel: number;
  hierarchyPath: string;
  fullHierarchyPath: string;
  parentEntityId?: string;
  responsiblePersonId?: string;
  isActive: boolean;
  description?: string;
  availableCredits?: number;
  reservedCredits?: number;
  address?: any;
  children: Entity[];
  createdAt?: string;
  updatedAt?: string;
};
import {
  Users,
  Crown,
  Plus,
  Edit,
  Trash2,
  Settings,
  Package,
  Building,
  Clock,
  Eye,
  ExternalLink,
  MapPin,
  Network,
  ChevronRight,
  ChevronDown,
  Globe,
  Home,
  Zap,
  Layers,
  TreePine,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Search,
  Filter,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Loader2,
  ArrowRightLeft,
  CreditCard,
  CheckSquare,
  Square,
  Download,
  Upload,
  Move,
  Target,
  UserPlus,
  UserMinus,
  Archive,
  ArchiveRestore,
  EyeOff,
  GitBranch,
  Zap as Lightning,
  Database,
  FileText,
  PieChart,
  LineChart,
  Calendar,
  Bell,
  Mail,
  Phone,
  MessageSquare
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

interface Organization {
  entityId: string;
  entityName: string;
  entityType: 'organization' | 'location' | 'department' | 'team';
  entityLevel: number;
  hierarchyPath: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentEntityId?: string;
  responsiblePersonId?: string;
  children?: Organization[];
  organizationType?: string;
  locationType?: string;
  address?: any;
  availableCredits?: number;
  reservedCredits?: number;
}

interface Location {
  entityId: string;
  entityName: string;
  entityType: 'location';
  entityLevel: number;
  hierarchyPath: string;
  fullHierarchyPath?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  city?: string;
  state?: string;
  country?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  parentEntityId?: string;
  responsiblePersonId?: string;
  locationType?: string;
  capacity?: {
    maxOccupancy?: number;
    currentOccupancy?: number;
    utilizationPercentage?: number;
    resources?: Record<string, any>;
  };
  children?: Location[];
  availableCredits?: number;
  reservedCredits?: number;
}

interface OrganizationHierarchy {
  success: boolean;
  hierarchy: Organization[];
  totalOrganizations: number;
  message: string;
}

interface LocationAnalytics {
  success: boolean;
  analytics: {
    locationId: string;
    locationName: string;
    capacity?: any;
    utilizationPercentage?: number;
    lastUpdated?: string;
  };
  message: string;
}

interface OrganizationManagementProps {
  employees: Employee[];
  applications: Application[];
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadDashboardData: () => void;
  inviteEmployee: () => void;
  tenantId?: string;
}

// Enhanced interfaces for better functionality
interface BulkActionResult {
  success: boolean;
  message: string;
  updatedCount?: number;
  failedCount?: number;
  errors?: string[];
}

interface DragDropState {
  draggedItem: Organization | null;
  dragOverItem: Organization | null;
  isDragging: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
}

interface ViewMode {
  id: 'tree' | 'grid' | 'list' | 'compact';
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface FilterOptions {
  type: 'all' | 'organization' | 'location' | 'department' | 'team';
  status: 'all' | 'active' | 'inactive';
  level: 'all' | number[];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  searchQuery: string;
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

// Enhanced Organization Tree Management Component
export function OrganizationTreeManagement({
  tenantId,
  isAdmin,
  makeRequest
}: {
  tenantId: string;
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}) {
  console.log('🌳 OrganizationTreeManagement received tenantId:', tenantId);

  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(null);
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');

  // Enhanced state for new features
  const [viewMode, setViewMode] = useState<ViewMode['id']>('tree');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dragDropState, setDragDropState] = useState<DragDropState>({
    draggedItem: null,
    dragOverItem: null,
    isDragging: false
  });
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    status: 'all',
    level: 'all',
    dateRange: 'all',
    searchQuery: ''
  });
  const [showBulkActions, setShowBulkActions] = useState(false);

  // View modes configuration - Only keep Tree View and Organization Chart
  const viewModes: ViewMode[] = [
    {
      id: 'tree',
      label: 'Tree View',
      icon: <TreePine className="w-4 h-4" />,
      description: 'Hierarchical tree structure'
    }
  ];

  // Dialog states
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showCreditTransfer, setShowCreditTransfer] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [subForm, setSubForm] = useState({
    name: '',
    description: '',
    responsiblePersonId: '',
    organizationType: 'department'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isActive: true
  });

  const [locationForm, setLocationForm] = useState({
    name: '',
    locationType: 'office',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    responsiblePersonId: ''
  });

  const [creditTransferForm, setCreditTransferForm] = useState({
    sourceEntityType: 'organization',
    sourceEntityId: '',
    destinationEntityType: 'organization', 
    destinationEntityId: '',
    amount: '',
    transferType: 'direct',
    isTemporary: false,
    recallDeadline: '',
    description: ''
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading entity data for tenant:', tenantId);

      // Load hierarchy first
      console.log('🔄 Loading entity hierarchy...');
      console.log('🏢 Using tenantId:', tenantId);
      console.log('🔐 Making authenticated request to hierarchy endpoint...');

      let hierarchyResponse = null;

      try {
        hierarchyResponse = await makeRequest(`/admin/entities/hierarchy/${tenantId}`, {
          headers: { 'X-Application': 'crm' }
        });

        console.log('📊 Hierarchy response received:', hierarchyResponse);
        console.log('📋 Hierarchy data:', hierarchyResponse?.hierarchy);
        console.log('✅ Hierarchy API call completed successfully');

        if (hierarchyResponse && hierarchyResponse.success) {
          console.log('🎉 Hierarchy loaded successfully with', hierarchyResponse.hierarchy?.length || 0, 'entities');
        } else {
          console.log('⚠️ Hierarchy API returned success=false:', hierarchyResponse?.message || 'Unknown error');
        }
        } catch (apiError: any) {
          console.error('❌ Hierarchy API call failed:', apiError);
          console.log('🔍 Error details:', {
            message: apiError?.message,
            status: apiError?.status,
            response: apiError?.response
          });

        // Try fallback approach
        console.log('🔄 Attempting fallback data retrieval...');
        try {
          const fallbackResponse = await makeRequest(`/admin/entities/all?tenantId=${tenantId}&entityType=organization`, {
            headers: { 'X-Application': 'crm' }
          });

          if (fallbackResponse && fallbackResponse.success) {
            console.log('✅ Fallback data retrieved:', fallbackResponse.data?.entities?.length || 0, 'entities');
            // Create a simple hierarchy structure from flat data
            const fallbackHierarchy = {
              success: true,
              hierarchy: (fallbackResponse.data?.entities || fallbackResponse.entities || []).map((entity: any) => ({
                ...entity,
                children: []
              })),
              totalOrganizations: fallbackResponse.data?.entities?.length || fallbackResponse.entities?.length || 0,
              message: 'Hierarchy loaded via fallback method'
            };
            setHierarchy(fallbackHierarchy);
            console.log('✅ Fallback hierarchy set successfully');
            return;
          }
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError?.message);
        }

        // If all else fails, show empty state
        console.log('🚫 All hierarchy loading methods failed, showing empty state');
        setHierarchy({
          success: true,
          hierarchy: [],
          totalOrganizations: 0,
          message: 'Unable to load hierarchy data'
        });
        return;
      }

      if (hierarchyResponse && hierarchyResponse.success) {
        // Transform the admin API response to match expected format
        const transformedHierarchy = {
          success: true,
          hierarchy: hierarchyResponse.data?.hierarchy || hierarchyResponse.hierarchy || [],
          totalOrganizations: hierarchyResponse.data?.totalEntities || hierarchyResponse.totalEntities || 0,
          message: hierarchyResponse.message || 'Hierarchy loaded successfully'
        };
        
        setHierarchy(transformedHierarchy);
        console.log('✅ Transformed hierarchy set:', transformedHierarchy);
        
        // Find parent organization from hierarchy
        const parentOrganization = transformedHierarchy.hierarchy?.find(
          (org: any) => org.entityType === 'organization' && org.entityLevel === 1
        );

        if (parentOrganization) {
          setParentOrg(parentOrganization);
          console.log('✅ Parent entity found in hierarchy:', parentOrganization);
          console.log('🆔 Parent entityId:', parentOrganization.entityId);
        } else {
          console.log('⚠️ No parent entity found in hierarchy');
          console.log('📋 Available hierarchy items:', transformedHierarchy.hierarchy?.map((org: any) => ({
            entityId: org.entityId,
            entityName: org.entityName,
            entityType: org.entityType,
            entityLevel: org.entityLevel
          })));

          // Try to load parent organization separately
          try {
            console.log('🔄 Loading parent entity separately...');
            const parentResponse = await makeRequest(`/entities/parent/${tenantId}`, {
              headers: { 'X-Application': 'crm' }
            });

            console.log('📊 Parent response:', parentResponse);

            if (parentResponse.success && parentResponse.organization) {
              setParentOrg(parentResponse.organization);
              console.log('✅ Parent entity loaded separately:', parentResponse.organization);
              console.log('🆔 Parent entityId:', parentResponse.organization.entityId);
            } else if (parentResponse.success && parentResponse.needsParentCreation) {
              console.log('ℹ️ No parent organization exists, will allow creating top-level organization');
              setParentOrg(null); // Allow creating without parent
            } else {
              console.log('❌ No valid parent organization in response');
              setParentOrg(null);
            }
          } catch (parentError) {
            console.log('ℹ️ No parent organization available:', parentError);
          }
        }
      } else {
        console.error('❌ Failed to load hierarchy:', hierarchyResponse);
        toast.error('Failed to load entity hierarchy');
      }

      // Load locations for the tenant
      console.log('🔄 Loading locations for tenant:', tenantId);
      try {
        const locationsResponse = await makeRequest(`/entities/tenant/${tenantId}?entityType=location`, {
          headers: { 'X-Application': 'crm' }
        });

        console.log('📍 Locations response:', locationsResponse);

        if (locationsResponse && locationsResponse.success) {
          setLocations(locationsResponse.entities || []);
          console.log('✅ Locations loaded:', locationsResponse.entities?.length || 0);
        } else {
          console.log('⚠️ No locations found or failed to load locations');
          setLocations([]);
        }
      } catch (locationsError) {
        console.log('ℹ️ Failed to load locations:', locationsError);
        setLocations([]);
      }

      // Load users for responsible person dropdowns
      console.log('🔄 Loading users for tenant:', tenantId);
      try {
        const usersResponse = await makeRequest('/tenants/current/users', {
          headers: { 'X-Application': 'crm' }
        });

        console.log('👥 Users response:', usersResponse);

        if (usersResponse && usersResponse.success) {
          setUsers(usersResponse.data || []);
          console.log('✅ Users loaded:', usersResponse.data?.length || 0);
        } else {
          console.log('⚠️ No users found or failed to load users');
          setUsers([]);
        }
      } catch (usersError) {
        console.log('ℹ️ Failed to load users:', usersError);
        setUsers([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load entity data:', error);
      toast.error(`Failed to load entity data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // CRUD Operations

  const createSubOrganization = async () => {
    // Allow creating without parent for top-level organizations
    // Only require parent selection if organizations already exist

    // Client-side validation
    if (!subForm.name || subForm.name.trim().length < 2) {
      toast.error('Organization name must be at least 2 characters long');
      return;
    }

    try {
      console.log('📝 Creating sub-organization:', {
        name: subForm.name,
        parentId: selectedOrg?.entityId || null,
        parentName: selectedOrg?.entityName || 'Top-level organization'
      });

      const response = await makeRequest('/entities/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          entityName: subForm.name.trim(),
          description: subForm.description,
          parentEntityId: selectedOrg?.entityId || null, // Allow null for top-level orgs
                  parentTenantId: tenantId || '', // Add tenant ID for validation
          responsiblePersonId: subForm.responsiblePersonId === 'none' ? null : subForm.responsiblePersonId || null,
          entityType: 'organization',
          organizationType: subForm.organizationType || 'department'
        })
      });

      if (response.success) {
        toast.success(selectedOrg ? 'Sub-organization created successfully!' : 'Organization created successfully!');
        console.log('✅ Sub-organization created:', response.organization);
        setSubForm({ name: '', description: '', responsiblePersonId: '', organizationType: 'department' });
        setShowCreateSub(false);
        setSelectedOrg(null);
        loadData();
      }
    } catch (error: any) {
      console.error('❌ Failed to create sub-organization:', error);
      toast.error(error.message || 'Failed to create sub-organization');
    }
  };

  const updateOrganization = async () => {
    if (!selectedOrg) return;

    // Client-side validation
    if (editForm.name && editForm.name.trim().length < 2) {
      toast.error('Organization name must be at least 2 characters long');
      return;
    }

    try {
      const response = await makeRequest(`/entities/${selectedOrg.entityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
              body: JSON.stringify({
                ...editForm,
                entityName: editForm.name,
                organizationName: undefined, // Remove old field
                parentTenantId: tenantId || '' // Add tenant ID for validation
              })
      });

      if (response.success) {
        toast.success('Organization updated successfully!');
        setShowEdit(false);
        setSelectedOrg(null);
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
    }
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await makeRequest(`/entities/${orgId}`, {
        method: 'DELETE',
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        toast.success('Organization deleted successfully!');
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete organization');
    }
  };

  const createLocation = async () => {
    if (!selectedOrg) return;

    try {
      const response = await makeRequest('/entities/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          entityName: locationForm.name,
          entityType: 'location',
          locationType: locationForm.locationType || 'office',
          address: {
            street: locationForm.address,
            city: locationForm.city,
            state: locationForm.state,
            zipCode: locationForm.zipCode,
            country: locationForm.country
          },
          parentEntityId: selectedOrg.entityId,
          responsiblePersonId: locationForm.responsiblePersonId === 'none' ? null : locationForm.responsiblePersonId || null
        })
      });

      if (response.success) {
        toast.success('Location created successfully!');
        setLocationForm({
          name: '',
          locationType: 'office',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          responsiblePersonId: ''
        });
        setShowCreateLocation(false);
        setSelectedOrg(null);
        loadData(); // Refresh the hierarchy to show the new location
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create location');
    }
  };

  // Enhanced functions for new features

  // Bulk operations
  const performBulkAction = async (action: string, items: string[]): Promise<BulkActionResult> => {
    try {
      const response = await makeRequest('/entities/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          action,
          entityIds: items,
          tenantId
        })
      });

      if (response.success) {
        toast.success(`Bulk ${action} completed successfully`);
        loadData();
        setSelectedItems([]);
        return {
          success: true,
          message: `Successfully ${action} ${items.length} items`,
          updatedCount: items.length
        };
      } else {
        throw new Error(response.message || `Failed to ${action} items`);
      }
    } catch (error: any) {
      console.error(`Bulk ${action} failed:`, error);
      toast.error(`Bulk ${action} failed: ${error.message}`);
      return {
        success: false,
        message: error.message || `Failed to ${action} items`,
        failedCount: items.length
      };
    }
  };

  // Quick actions for selected items
  const getQuickActions = (selectedItems: string[]): QuickAction[] => [
    {
      id: 'activate',
      label: 'Activate',
      icon: <CheckCircle className="w-4 h-4" />,
      action: () => performBulkAction('activate', selectedItems),
      variant: 'default'
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      icon: <XCircle className="w-4 h-4" />,
      action: () => performBulkAction('deactivate', selectedItems),
      variant: 'secondary'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      action: () => performBulkAction('delete', selectedItems),
      variant: 'destructive'
    },
    {
      id: 'export',
      label: 'Export',
      icon: <Download className="w-4 h-4" />,
      action: () => performBulkAction('export', selectedItems),
      variant: 'outline'
    }
  ];


  // Filter hierarchy tree recursively
  const filterHierarchy = (org: Organization): Organization | null => {
    // Handle case where organization might be incomplete or empty
    if (!org || !org.entityName) {
      console.log('⚠️ Skipping invalid organization:', org);
      return null;
    }

    // More lenient search matching
    const searchLower = (searchTerm || '').toLowerCase().trim();
    const matchesSearch = !searchLower || 
      org.entityName.toLowerCase().includes(searchLower) ||
      (org.description && org.description.toLowerCase().includes(searchLower)) ||
      (org.hierarchyPath && org.hierarchyPath.toLowerCase().includes(searchLower));

    // More lenient filter matching - default to true if isActive is undefined
    const isOrgActive = org.isActive !== false; // treat undefined as active
    const matchesFilter = filterType === 'all' ||
      (filterType === 'active' && isOrgActive) ||
      (filterType === 'inactive' && !isOrgActive);

    // Include organization if it matches OR if any of its children match
    let shouldInclude = matchesSearch && matchesFilter;
    let filteredChildren: Organization[] = [];

    if (org.children && org.children.length > 0) {
      filteredChildren = org.children
        .map(filterHierarchy)
        .filter((child): child is Organization => child !== null);
      
      // Include parent if any child matches
      if (filteredChildren.length > 0) {
        shouldInclude = true;
      }
    }

    if (!shouldInclude) {
      return null;
    }

    const filteredOrg = { ...org };
    filteredOrg.children = filteredChildren;

    return filteredOrg;
  };

  // Transform Organization data to Entity format for the hierarchy chart
  const transformToEntity = (org: Organization): Entity => {
    return {
      entityId: org.entityId,
      entityName: org.entityName,
      entityType: org.entityType,
      organizationType: org.organizationType,
      locationType: org.locationType,
      entityLevel: org.entityLevel,
      hierarchyPath: org.hierarchyPath,
      fullHierarchyPath: org.hierarchyPath, // Use hierarchyPath as fallback
      parentEntityId: org.parentEntityId,
      responsiblePersonId: org.responsiblePersonId,
      isActive: org.isActive,
      description: org.description,
      availableCredits: org.availableCredits,
      reservedCredits: org.reservedCredits,
      address: org.address,
      children: org.children ? org.children.map(transformToEntity) : [],
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    };
  };

  // Build proper tenant hierarchy: Tenant -> Parent Org -> Sub Orgs/Locations
  const buildTenantHierarchy = (orgHierarchy: Organization[], parentOrg: Organization | null, tenantId?: string): Entity[] => {
    console.log('🏗️ Building tenant hierarchy with:', { 
      orgHierarchy: orgHierarchy.length, 
      parentOrg: parentOrg?.entityName,
      sampleOrg: orgHierarchy[0]
    });
    
    // Get tenant name - use parent org name as base or default
    const tenantName = parentOrg?.entityName 
      ? `${parentOrg.entityName} (Tenant)` 
      : `Company Organization (Tenant)`;
    
    // Create tenant root entity
    const tenantEntity: Entity = {
      entityId: `tenant-${tenantId || 'root'}`,
      entityName: tenantName,
      entityType: 'organization',
      organizationType: 'tenant',
      entityLevel: 0,
      hierarchyPath: 'tenant',
      fullHierarchyPath: tenantName,
      isActive: true,
      description: 'Root tenant organization containing all company entities',
      children: []
    };

    // Recursively transform organization hierarchy to entity hierarchy
    const transformOrgToEntity = (org: Organization, level: number = 1): Entity => {
      const entity = transformToEntity(org);
      entity.entityLevel = level;
      
      // Transform children recursively and preserve hierarchy
      if (org.children && Array.isArray(org.children) && org.children.length > 0) {
        entity.children = org.children.map(child => {
          const childEntity = transformOrgToEntity(child as Organization, level + 1);
          console.log(`🔗 Child ${child.entityName} added to parent ${org.entityName}`);
          return childEntity;
        });
      } else {
        entity.children = [];
      }
      
      return entity;
    };

    // Use the processed hierarchy directly, which already includes proper nesting
    tenantEntity.children = orgHierarchy.map(org => {
      const transformedOrg = transformOrgToEntity(org, 1);
      console.log(`🏗️ Transformed org: ${org.entityName} with ${transformedOrg.children.length} children`);
      return transformedOrg;
    });

    console.log('✅ Built tenant hierarchy:', tenantEntity);
    console.log('🏗️ Tenant hierarchy children count:', tenantEntity.children.length);
    console.log('🏗️ First few children:', tenantEntity.children.slice(0, 3));
    return [tenantEntity];
  };

  // Process hierarchy to include locations as children
  const processedHierarchy = React.useMemo(() => {
    try {
      if (!hierarchy?.hierarchy || !Array.isArray(hierarchy.hierarchy)) {
        console.log('🚫 No hierarchy data available');
        return [];
      }

      console.log('🔄 Processing hierarchy data:', hierarchy.hierarchy.length, 'organizations');
      console.log('🔍 Raw hierarchy data:', hierarchy.hierarchy);

      // Convert entities to organizations format
      const convertedOrgs = hierarchy.hierarchy.map((entity: any) => ({
        ...entity,
        organizationId: entity.entityId,
        organizationName: entity.entityName,
        organizationType: entity.organizationType || entity.entityType,
        organizationLevel: entity.entityLevel,
        parentOrganizationId: entity.parentEntityId,
        hierarchyPath: entity.hierarchyPath || entity.entityName,
        // Keep credit info
        availableCredits: entity.availableCredits,
        reservedCredits: entity.reservedCredits
      }));

      // First, let's see what we have before filtering
      const validOrgs = convertedOrgs.filter(org => org && org.entityId && org.entityName);
      console.log('✅ Valid organizations after conversion:', validOrgs.length);
      console.log('🔍 Converted orgs sample:', validOrgs.slice(0, 2));

      // Apply filtering with more lenient search/filter logic
      const processedOrgs = validOrgs
        .map(org => {
          // If no search term and filter is 'all', include all organizations
          if (!searchTerm.trim() && filterType === 'all') {
            return org;
          }
          return filterHierarchy(org);
        })
        .filter((org): org is Organization => org !== null && !!org.entityId && !!org.entityName);

      console.log('✅ After filtering:', processedOrgs.length, 'valid organizations');
      console.log('🔍 Processed orgs sample:', processedOrgs.slice(0, 2));

      // If filtering removes everything but we have valid orgs, show them anyway with a warning  
      if (processedOrgs.length === 0 && validOrgs.length > 0) {
        console.log('⚠️ Filtering removed all organizations, showing unfiltered results');
        // Show all valid organizations if filtering removed everything
        const unfiltered = validOrgs;
        console.log('📄 Showing unfiltered organizations:', unfiltered.length);
        
        // Process unfiltered orgs using the same recursive logic
        const processOrganizationHierarchy = (org: Organization): Organization => {
          if (!org || !org.entityId) return org;

          const processedOrg = { ...org };

          // Ensure children is an array
          if (!Array.isArray(processedOrg.children)) {
            processedOrg.children = [];
          }

          // Recursively process children (which can be organizations or locations)
          if (processedOrg.children && processedOrg.children.length > 0) {
            processedOrg.children = processedOrg.children.map(child => {
              // If it's a location, keep it as is
              if (child.entityType === 'location') {
                return {
                  ...child,
                  isActive: child.isActive ?? true,
                  createdAt: child.createdAt || new Date().toISOString(),
                  updatedAt: child.updatedAt || new Date().toISOString(),
                  children: child.children || []
                };
              }
              // If it's an organization, process it recursively
              return processOrganizationHierarchy(child as Organization);
            });
          }

          return processedOrg;
        };

        return unfiltered.map(processOrganizationHierarchy);
      }

      if (processedOrgs.length === 0) {
        console.log('🚫 No organizations after processing');
        return [];
      }

      // Since the API already returns locations as nested children in the hierarchy,
      // we don't need to process locations separately. Just process the hierarchy recursively.
      const processOrganizationHierarchy = (org: Organization): Organization => {
        if (!org || !org.entityId) return org;

        const processedOrg = { ...org };

        // Ensure children is an array
        if (!Array.isArray(processedOrg.children)) {
          processedOrg.children = [];
        }

        // Recursively process children (which can be organizations or locations)
        if (processedOrg.children && processedOrg.children.length > 0) {
          processedOrg.children = processedOrg.children.map(child => {
            // If it's a location, keep it as is
            if (child.entityType === 'location') {
              return {
                ...child,
                isActive: child.isActive ?? true,
                createdAt: child.createdAt || new Date().toISOString(),
                updatedAt: child.updatedAt || new Date().toISOString(),
                children: child.children || []
              };
            }
            // If it's an organization, process it recursively
            return processOrganizationHierarchy(child as Organization);
          });
        }

        return processedOrg;
      };

      const finalHierarchy = processedOrgs.map(processOrganizationHierarchy);
      console.log('✅ Final processed hierarchy:', finalHierarchy.length, 'organizations');
      console.log('🌳 Final hierarchy structure:', finalHierarchy);
      return finalHierarchy;

    } catch (error) {
      console.error('❌ Error processing hierarchy:', error);
      return [];
    }
  }, [hierarchy?.hierarchy, locations, searchTerm, filterType]);

  // Get unassigned locations (locations without parentEntityId)
  const unassignedLocations = React.useMemo(() => {
    return locations.filter(location => !location.parentEntityId);
  }, [locations]);

  // Helper function to check if organization can transfer credits (has children or locations)
  const canTransferCredits = (org: Organization | Location): boolean => {
    const orgChildren = (org as Organization).children;
    const hasChildren = orgChildren && Array.isArray(orgChildren) && orgChildren.length > 0;
    return !!hasChildren;
  };

  // Enhanced Tree Node Component
  const TreeNode = ({ org, level = 0 }: { org: Organization | Location; level?: number }) => {
    const [expanded, setExpanded] = useState(level < 2);
    const orgChildren = (org as Organization).children;
    const hasChildren = orgChildren && Array.isArray(orgChildren) && orgChildren.length > 0;
    const canTransfer = canTransferCredits(org as Organization);
    const isLocation = org.entityType === 'location';
    const isSelected = selectedItems.includes(org.entityId);

    // Safety check for required properties
    if (!org || !org.entityId || !org.entityName) {
      console.warn('TreeNode received invalid organization data:', org);
      return null;
    }

    const handleSelect = (checked: boolean) => {
      if (checked) {
        setSelectedItems(prev => [...prev, org.entityId]);
      } else {
        setSelectedItems(prev => prev.filter(id => id !== org.entityId));
      }
    };

    const getNodeStyles = () => {
      const baseStyles = "flex items-center border rounded-lg mb-2 cursor-pointer transition-colors";

      // Tree view styling only
      const levelStyles = level === 0 && !isLocation ? 'bg-blue-50 border-blue-200' : '';
      const locationStyles = isLocation ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200' : 'bg-white border-gray-200';
      const selectionStyles = isSelected ? 'ring-2 ring-blue-400 bg-blue-50' : '';

      return `${baseStyles} p-3 hover:bg-gray-50 ${levelStyles} ${locationStyles} ${selectionStyles}`;
    };

    return (
      <div className="select-none">
        <div
          className={getNodeStyles()}
          style={viewMode === 'tree' ? { marginLeft: `${level * 20}px` } : {}}
          onClick={undefined}
        >
          {/* Selection Checkbox */}
          <div className="w-6 flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelect(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          {/* Expand/Collapse Icon */}
          <div className="w-6 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
              >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Entity Icon */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold mr-3 ${
            isLocation
              ? 'bg-gradient-to-r from-green-500 to-blue-500'
              : 'bg-gradient-to-r from-blue-500 to-purple-600'
          }`}>
            {isLocation ? '📍' : (org.entityName?.charAt(0)?.toUpperCase() || '?')}
          </div>

          {/* Organization Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 truncate">{org.entityName || 'Unknown'}</span>
              <Badge variant={org.isActive !== false ? "default" : "secondary"} className="text-xs">
                {org.entityType || 'unknown'}
              </Badge>
              <Badge variant={org.isActive !== false ? "default" : "destructive"} className="text-xs">
                {org.isActive !== false ? 'Active' : 'Inactive'}
              </Badge>
              {canTransfer && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                  💰 Can Transfer
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600 truncate">
              Level {org.entityLevel || 1} • {org.hierarchyPath || org.entityId}
            </div>
            {(org as Organization).description && (
              <div className="text-xs text-gray-500 truncate mt-1">{(org as Organization).description}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-4">
            {!isLocation && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrg(org as Organization);
                    setSubForm({ name: '', description: '', responsiblePersonId: '', organizationType: 'department' });
                    setShowCreateSub(true);
                  }}
                  title="Add sub-organization"
                >
                  <Plus className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrg(org as Organization);
                    setLocationForm({
                      name: '',
                      locationType: 'office',
                      address: '',
                      city: '',
                      state: '',
                      zipCode: '',
                      country: '',
                      responsiblePersonId: ''
                    });
                    setShowCreateLocation(true);
                  }}
                  title="Add location"
                >
                  <MapPin className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrg(org as Organization);
                    setCreditTransferForm(prev => ({
                      ...prev,
                      sourceEntityId: org.entityId,
                      sourceEntityType: 'organization'
                    }));
                    setShowCreditTransfer(true);
                  }}
                  title={canTransfer ? "Transfer credits to child entities" : "No child entities available for transfer"}
                  disabled={!canTransfer}
                  className={canTransfer ? "" : "opacity-50 cursor-not-allowed"}
                >
                  <ArrowRightLeft className={`w-4 h-4 ${canTransfer ? "" : "text-gray-400"}`} />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (isLocation) {
                  // Handle location edit
                  console.log('Edit location:', org.entityId);
                } else {
                  setSelectedOrg(org as Organization);
                  setEditForm({
                    name: org.entityName,
                    description: (org as Organization).description || '',
                    isActive: org.isActive || true
                  });
                  setShowEdit(true);
                }
              }}
              title={isLocation ? "Edit location" : "Edit organization"}
            >
              <Edit className="w-4 h-4" />
            </Button>

            {isAdmin && !isLocation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteOrganization(org.entityId, org.entityName);
                }}
                title="Delete organization"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Children */}
        {expanded && hasChildren && (
          <div className="ml-4">
            {orgChildren?.map((child: any) => {
              if (!child || !child.entityId) {
                console.warn('Invalid child in hierarchy:', child);
                return null;
              }
              return <TreeNode key={child.entityId} org={child} level={level + 1} />;
            }).filter(Boolean)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TreePine className="w-6 h-6 text-green-600" />
              Organization & Location Hierarchy
            </h2>
            <p className="text-gray-600">Manage your organization structure and locations in a unified hierarchical view</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Hierarchy Chart Button - Show even with empty hierarchy to display tenant */}
            {tenantId && (
              <OrganizationHierarchyChart 
                hierarchy={buildTenantHierarchy(processedHierarchy || [], parentOrg, tenantId)} 
                isLoading={loading}
                onSelectEntity={(entity) => {
                  console.log('Selected entity:', entity);
                  toast.success(`Selected: ${entity.entityName}`);
                }}
                onEditEntity={(entity) => {
                  console.log('Edit entity:', entity);
                  // Find the corresponding organization in processedHierarchy for proper typing
                  const findOrgById = (orgs: Organization[], id: string): Organization | null => {
                    for (const org of orgs) {
                      if (org.entityId === id) return org;
                      if (org.children) {
                        const found = findOrgById(org.children, id);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const orgToEdit = findOrgById(processedHierarchy || [], entity.entityId);
                  if (orgToEdit) {
                    setSelectedOrg(orgToEdit);
                    setSubForm({
                      name: entity.entityName,
                      description: entity.description || '',
                      responsiblePersonId: entity.responsiblePersonId || '',
                      organizationType: entity.organizationType || 'department'
                    });
                    setShowEdit(true);
                  }
                }}
                onDeleteEntity={async (entityId) => {
                  if (confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
                    try {
                      await makeRequest(`/entities/${entityId}`, {
                        method: 'DELETE',
                        headers: { 'X-Application': 'crm' }
                      });
                      toast.success('Entity deleted successfully');
                      loadData(); // Refresh the hierarchy
                    } catch (error: any) {
                      console.error('Delete failed:', error);
                      toast.error(error.message || 'Failed to delete entity');
                    }
                  }
                }}
              />
            )}
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {parentOrg && (
              <Button
                onClick={() => {
                  setSelectedOrg(parentOrg);
                  setSubForm({ name: '', description: '', responsiblePersonId: '', organizationType: 'department' });
                  setShowCreateSub(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sub-Entity
              </Button>
            )}
          </div>
        </div>


        {/* Bulk Actions Only (View Mode Selector Removed - Only Tree View Available) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View: Tree View</span>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedItems.length} selected
              </span>
              <div className="flex gap-1">
                {getQuickActions(selectedItems).map(action => (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="sm"
                    onClick={action.action}
                    disabled={action.disabled}
                    className="flex items-center gap-1"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Parent Organization Display */}
      {parentOrg && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Parent Organization:</strong> {parentOrg.entityName}
            {parentOrg.description && ` - ${parentOrg.description}`}
          </AlertDescription>
        </Alert>
      )}

      {!parentOrg && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <p><strong>Welcome to Organization Management!</strong></p>
              <p>Since you're authenticated and have access to this tenant, the parent organization should be automatically created during onboarding. If you're seeing this message, it means:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>This tenant hasn't completed the onboarding process yet</li>
                <li>Or the parent organization needs to be set up</li>
              </ul>
              <p className="text-sm">Once the parent organization is created, you'll be able to create sub-organizations and manage locations here.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Organization Tree with Multiple Views */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Organization Tree
            {hierarchy && (
              <Badge variant="secondary" className="ml-2">
                {hierarchy.totalOrganizations} organizations
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
      
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading organization hierarchy...</span>
            </div>
          ) : processedHierarchy.length > 0 ? (
            <>
              {/* Tree view only */}
              <div className="space-y-2">
                {processedHierarchy.map(org => {
                  if (!org || !org.entityId) {
                    console.warn('Skipping invalid organization in hierarchy:', org);
                    return null;
                  }
                  try {
                    return <TreeNode key={org.entityId} org={org} />;
                  } catch (error) {
                    console.error('Error rendering TreeNode for organization:', org.entityId, error);
                    return null;
                  }
                }).filter(Boolean)}

                {/* Unassigned Locations */}
                {unassignedLocations.length > 0 && (
                  <div className={`mt-6 p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50 ${
                    viewMode === 'grid' ? 'col-span-full' : ''
                  }`}>
                    <div className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      🚨 Unassigned Locations ({unassignedLocations.length})
                    </div>
                    <div className="text-xs text-orange-600 mb-3">
                      These locations are not assigned to any organization and should be assigned for proper management.
                    </div>
                    <div className="space-y-2">
                      {unassignedLocations.map(location => (
                        <div
                          key={location.entityId}
                          className="flex items-center border rounded-lg bg-white border-orange-200 shadow-sm p-3"
                        >
                          <div className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-semibold mr-3 w-8 h-8">
                            ⚠️
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 truncate text-sm">
                                🏢 {location.entityName}
                              </span>
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                                🚨 Unassigned
                              </Badge>
                            </div>
                            <div className="text-red-600 font-medium text-xs">
                              🚫 Not assigned to any organization
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              📍 Address: {' '}
                              {location.address?.street && `${location.address.street}, `}
                              {location.address?.city && `${location.address.city}, `}
                              {location.address?.country && location.address.country}
                              {(!location.address?.street && !location.address?.city && !location.address?.country) && '🚫 No address information'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <TreePine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterType !== 'all' ? 'No organizations match your criteria' : 'No organizations found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'all' ? 'Try adjusting your search or filter settings.' : 'Create your first organization to get started.'}
              </p>
              {!parentOrg && (
                <div className="text-center">
                  <p className="text-gray-600 mb-2">Contact your administrator to set up the parent organization for your tenant.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Create Organization Dialog */}
      <Dialog open={showCreateSub} onOpenChange={setShowCreateSub}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrg ? 'Create Sub-Organization' : 'Create Organization'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrg
                ? `Create a sub-organization under ${selectedOrg.entityName}.`
                : 'Create a new top-level organization for this tenant.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sub-name">Organization Name *</Label>
              <Input
                id="sub-name"
                value={subForm.name}
                onChange={(e) => setSubForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <Label htmlFor="sub-description">Description</Label>
              <Textarea
                id="sub-description"
                value={subForm.description}
                onChange={(e) => setSubForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter organization description"
              />
            </div>
            <div>
              <Label htmlFor="sub-type">Organization Type</Label>
              <Select
                value={subForm.organizationType}
                onValueChange={(value) => setSubForm(prev => ({ ...prev, organizationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="division">Division</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sub-responsible">Responsible Person</Label>
              <Select
                value={subForm.responsiblePersonId}
                onValueChange={(value) => setSubForm(prev => ({ ...prev, responsiblePersonId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select responsible person (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No responsible person</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.userId} value={user.userId}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name || 'Unnamed User'}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSub(false)}>
              Cancel
            </Button>
            <Button onClick={createSubOrganization} disabled={!subForm.name.trim()}>
              {selectedOrg ? 'Create Sub-Organization' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the details for {selectedOrg?.entityName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Organization Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter organization description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={updateOrganization} disabled={!editForm.name.trim()}>
              Update Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Location Dialog */}
      <Dialog open={showCreateLocation} onOpenChange={setShowCreateLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
            <DialogDescription>
              Create a new location for {selectedOrg?.entityName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                value={locationForm.name}
                onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter location name"
              />
            </div>
            <div>
              <Label htmlFor="location-type">Location Type</Label>
              <Select
                value={locationForm.locationType || 'office'}
                onValueChange={(value) => setLocationForm(prev => ({ ...prev, locationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="retail">Retail Store</SelectItem>
                  <SelectItem value="remote">Remote Work</SelectItem>
                  <SelectItem value="branch">Branch Office</SelectItem>
                  <SelectItem value="headquarters">Headquarters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location-address">Street Address *</Label>
              <Input
                id="location-address"
                value={locationForm.address}
                onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-city">City *</Label>
                <Input
                  id="location-city"
                  value={locationForm.city}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="location-state">State</Label>
                <Input
                  id="location-state"
                  value={locationForm.state}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-zip">ZIP Code</Label>
                <Input
                  id="location-zip"
                  value={locationForm.zipCode}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="Enter ZIP code"
                />
              </div>
              <div>
                <Label htmlFor="location-country">Country *</Label>
                <Input
                  id="location-country"
                  value={locationForm.country}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location-responsible">Responsible Person</Label>
              <Select 
                value={locationForm.responsiblePersonId} 
                onValueChange={(value) => setLocationForm(prev => ({ ...prev, responsiblePersonId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select responsible person (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No responsible person</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.userId} value={user.userId}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name || 'Unnamed User'}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLocation(false)}>
              Cancel
            </Button>
            <Button
              onClick={createLocation}
              disabled={!locationForm.name.trim() || !locationForm.address.trim() || !locationForm.city.trim() || !locationForm.country.trim()}
            >
              Create Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Transfer Dialog */}
      <Dialog open={showCreditTransfer} onOpenChange={setShowCreditTransfer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Transfer Credits
            </DialogTitle>
            <DialogDescription>
              Transfer credits from {selectedOrg?.entityName} to its child organizations or locations.
              Credits flow down the hierarchy from parent to child entities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="source-entity">From (Source)</Label>
              <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {selectedOrg?.entityName?.charAt(0)?.toUpperCase() || 'O'}
    </div>
                  <div>
                    <div className="font-medium">{selectedOrg?.entityName}</div>
                    <div className="text-xs text-gray-600">Organization</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="destination-type">Transfer To</Label>
              <Select 
                value={creditTransferForm.destinationEntityType} 
                onValueChange={(value) => setCreditTransferForm(prev => ({ ...prev, destinationEntityType: value, destinationEntityId: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Child Organization</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="destination-entity">Select Destination</Label>
              <Select 
                value={creditTransferForm.destinationEntityId} 
                onValueChange={(value) => setCreditTransferForm(prev => ({ ...prev, destinationEntityId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {creditTransferForm.destinationEntityType === 'organization' ? (
                    // Show only child organizations (direct children and nested children)
                    (() => {
                      const getChildOrganizations = (org: Organization): Organization[] => {
                        let children: Organization[] = [];
                        if (org.children) {
                          children = [...org.children];
                          // Recursively get nested children
                          org.children.forEach(child => {
                            children = [...children, ...getChildOrganizations(child)];
                          });
                        }
                        return children;
                      };

                      const childOrgs = selectedOrg ? getChildOrganizations(selectedOrg) : [];
                      
                      return childOrgs.length > 0 ? childOrgs.map(org => (
                        <SelectItem key={org.entityId} value={org.entityId}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                              {org.entityName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{org.entityName}</div>
                              <div className="text-xs text-gray-500">
                                Level {org.entityLevel} • {org.entityType}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-orgs" disabled>
                          <div className="text-gray-400 text-sm">No child organizations available</div>
                        </SelectItem>
                      );
                    })()
                  ) : (
                    // Show only locations belonging to this organization or its children
                    (() => {
                      const getOrgAndChildIds = (org: Organization): string[] => {
                        let ids = [org.entityId];
                        if (org.children) {
                          org.children.forEach(child => {
                            ids = [...ids, ...getOrgAndChildIds(child)];
                          });
                        }
                        return ids;
                      };

                      const allowedOrgIds = selectedOrg ? getOrgAndChildIds(selectedOrg) : [];
                      const allowedLocations = locations.filter(location =>
                        location.parentEntityId && allowedOrgIds.includes(location.parentEntityId)
                      );

                      return allowedLocations.length > 0 ? allowedLocations.map(location => (
                        <SelectItem key={location.entityId} value={location.entityId}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold">
                              📍
                            </div>
                            <div>
                              <div className="font-medium">{location.entityName}</div>
                              <div className="text-xs text-gray-500">
                                {hierarchy?.hierarchy?.find(org => org.entityId === location.parentEntityId)?.entityName || 'Unknown Org'}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-locations" disabled>
                          <div className="text-gray-400 text-sm">No locations available for transfer</div>
                        </SelectItem>
                      );
                    })()
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transfer-amount">Amount to Transfer</Label>
              <Input
                id="transfer-amount"
                type="number"
                value={creditTransferForm.amount}
                onChange={(e) => setCreditTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter credit amount"
                min="1"
                step="1"
              />
            </div>

            <div>
              <Label htmlFor="transfer-description">Description (Optional)</Label>
              <Textarea
                id="transfer-description"
                value={creditTransferForm.description}
                onChange={(e) => setCreditTransferForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Reason for transfer..."
                className="resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="temporary-transfer"
                checked={creditTransferForm.isTemporary}
                onChange={(e) => setCreditTransferForm(prev => ({ ...prev, isTemporary: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="temporary-transfer" className="text-sm">
                Temporary transfer (can be recalled)
              </Label>
            </div>

            {creditTransferForm.isTemporary && (
              <div>
                <Label htmlFor="recall-deadline">Recall Deadline</Label>
                <Input
                  id="recall-deadline"
                  type="datetime-local"
                  value={creditTransferForm.recallDeadline}
                  onChange={(e) => setCreditTransferForm(prev => ({ ...prev, recallDeadline: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditTransfer(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const transferData = {
                    toEntityType: creditTransferForm.destinationEntityType,
                    toEntityId: creditTransferForm.destinationEntityId,
                    creditAmount: parseFloat(creditTransferForm.amount),
                    reason: creditTransferForm.description || `Transfer from ${selectedOrg?.entityName}`
                  };

                  console.log('🔄 Initiating credit transfer:', transferData);

                  const response = await makeRequest('/credits/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
                    body: JSON.stringify(transferData)
                  });

                  if (response.success) {
                    toast.success(`Successfully transferred ${creditTransferForm.amount} credits!`);
                    setShowCreditTransfer(false);
                    setCreditTransferForm({
                      sourceEntityType: 'organization',
                      sourceEntityId: '',
                      destinationEntityType: 'organization', 
                      destinationEntityId: '',
                      amount: '',
                      transferType: 'direct',
                      isTemporary: false,
                      recallDeadline: '',
                      description: ''
                    });
                    // Optionally reload data to show updated credit balances
                    loadData();
                  } else {
                    toast.error(response.message || 'Credit transfer failed');
                  }
                } catch (error: any) {
                  console.error('❌ Credit transfer error:', error);
                  toast.error(error.message || 'Failed to transfer credits');
                }
              }}
              disabled={!creditTransferForm.destinationEntityId || !creditTransferForm.amount}
              className="bg-green-600 hover:bg-green-700"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main OrganizationManagement component that combines all sub-components
export function OrganizationManagement({
  employees,
  applications,
  isAdmin,
  makeRequest,
  loadDashboardData,
  inviteEmployee,
  tenantId
}: OrganizationManagementProps) {
  const [activeTab, setActiveTab] = useState('hierarchy');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization Management</h2>
          <p className="text-gray-600">Manage your organization's structure and users</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Hierarchy
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy">
          {tenantId ? (
            <OrganizationTreeManagement
              tenantId={tenantId}
              isAdmin={isAdmin}
              makeRequest={makeRequest}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Unable to Load Organization Hierarchy
                </h3>
                <p className="text-gray-600">
                  Tenant information is not available. Please refresh the page or contact support.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users">
          <OrganizationUserManagement
            employees={employees}
            isAdmin={isAdmin}
            makeRequest={makeRequest}
            loadDashboardData={loadDashboardData}
            inviteEmployee={inviteEmployee}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OrganizationManagement;
