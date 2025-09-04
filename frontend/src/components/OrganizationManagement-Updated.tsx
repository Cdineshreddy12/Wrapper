import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Activity,
  Plus,
  Edit,
  MapPin,
  Network,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Zap,
  Layers,
  TreePine,
  Building,
  Trash2,
  Move,
  Save,
  AlertCircle,
  Settings
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
  organizationId: string;
  organizationName: string;
  organizationType: 'parent' | 'sub';
  organizationLevel: number;
  hierarchyPath: string;
  description?: string;
  gstin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentOrganizationId?: string;
  responsiblePersonId?: string;
  children?: Organization[];
}

interface Location {
  locationId: string;
  locationName: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  city?: string;
  state?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  capacity?: {
    maxOccupancy?: number;
    currentOccupancy?: number;
    utilizationPercentage?: number;
    resources?: Record<string, any>;
  };
  organizationCount?: number;
  organizations?: Array<{
    organizationId: string;
    organizationName: string;
    organizationType: string;
    assignedAt: string;
  }>;
}

interface OrganizationHierarchy {
  success: boolean;
  hierarchy: Organization[];
  totalOrganizations: number;
  message: string;
}



interface OrganizationManagementProps {
  employees: Employee[];
  applications: Application[];
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadDashboardData: () => void;
  inviteEmployee: () => void;
}

// New Component: Organization Hierarchy Management
export function OrganizationHierarchyManagement({
  tenantId,
  isAdmin,
  makeRequest
}: {
  tenantId: string;
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}) {
  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [showCreateSubOrg, setShowCreateSubOrg] = useState(false);
  const [showCreateParentOrg, setShowCreateParentOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [showMoveOrg, setShowMoveOrg] = useState(false);
  const [selectedParentOrg, setSelectedParentOrg] = useState<Organization | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [draggedOrg, setDraggedOrg] = useState<Organization | null>(null);
  const [dragOverOrg, setDragOverOrg] = useState<Organization | null>(null);
  const [hasParentOrg, setHasParentOrg] = useState<boolean>(false);
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);

  // Form states
  const [parentOrgForm, setParentOrgForm] = useState({
    name: '',
    description: '',
    gstin: ''
  });
  const [subOrgForm, setSubOrgForm] = useState({
    name: '',
    description: '',
    gstin: ''
  });
  const [editOrgForm, setEditOrgForm] = useState({
    name: '',
    description: '',
    gstin: '',
    isActive: true
  });

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const response = await makeRequest(`/organizations/hierarchy/${tenantId}`, {
        headers: { 'X-Application': 'crm' }
      });
      setHierarchy(response);

      // Check if there's a parent organization
      const parentResponse = await makeRequest(`/organizations/parent/${tenantId}`, {
        headers: { 'X-Application': 'crm' }
      });

      if (parentResponse.success && parentResponse.organization) {
        setHasParentOrg(true);
        setParentOrg(parentResponse.organization);
      } else {
        setHasParentOrg(false);
        setParentOrg(null);
      }
    } catch (error) {
      toast.error('Failed to load organization hierarchy');
      console.error('Hierarchy load error:', error);
      setHasParentOrg(false);
      setParentOrg(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, [tenantId]);

  // CRUD Functions
  const createParentOrganization = async () => {
    try {
      const response = await makeRequest('/organizations/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          name: parentOrgForm.name,
          description: parentOrgForm.description,
          gstin: parentOrgForm.gstin,
          parentTenantId: tenantId
        })
      });

      if (response.success) {
        toast.success('Parent organization created successfully!');
        setParentOrgForm({ name: '', description: '', gstin: '' });
        setShowCreateParentOrg(false);
        loadHierarchy();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create parent organization');
    }
  };

  const createSubOrganization = async () => {
    if (!selectedParentOrg) return;

    try {
      const response = await makeRequest('/organizations/sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          name: subOrgForm.name,
          description: subOrgForm.description,
          gstin: subOrgForm.gstin,
          parentOrganizationId: selectedParentOrg.organizationId
        })
      });

      if (response.success) {
        toast.success('Sub-organization created successfully!');
        setSubOrgForm({ name: '', description: '', gstin: '' });
        setShowCreateSubOrg(false);
        setSelectedParentOrg(null);
        loadHierarchy();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create sub-organization');
    }
  };

  const updateOrganization = async () => {
    if (!selectedOrg) return;

    try {
      const response = await makeRequest(`/organizations/${selectedOrg.organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify(editOrgForm)
      });

      if (response.success) {
        toast.success('Organization updated successfully!');
        setShowEditOrg(false);
        setSelectedOrg(null);
        loadHierarchy();
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
      const response = await makeRequest(`/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        toast.success('Organization deleted successfully!');
        loadHierarchy();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete organization');
    }
  };

  const moveOrganization = async (orgId: string, newParentId: string | null) => {
    try {
      const response = await makeRequest(`/organizations/${orgId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({ newParentId })
      });

      if (response.success) {
        toast.success('Organization moved successfully!');
        loadHierarchy();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to move organization');
    }
  };

  // Drag and Drop Functions
  const handleDragStart = (e: React.DragEvent, org: Organization) => {
    setDraggedOrg(org);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, org: Organization) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverOrg(org);
  };

  const handleDragLeave = () => {
    setDragOverOrg(null);
  };

  const handleDrop = async (e: React.DragEvent, targetOrg: Organization) => {
    e.preventDefault();

    if (!draggedOrg || draggedOrg.organizationId === targetOrg.organizationId) {
      setDraggedOrg(null);
      setDragOverOrg(null);
      return;
    }

    // Prevent moving to a child organization
    const isChild = (parent: Organization, child: Organization): boolean => {
      if (!parent.children) return false;
      return parent.children.some(c => c.organizationId === child.organizationId) ||
             parent.children.some(c => isChild(c, child));
    };

    if (isChild(draggedOrg, targetOrg)) {
      toast.error('Cannot move organization to its own descendant');
      setDraggedOrg(null);
      setDragOverOrg(null);
      return;
    }

    await moveOrganization(draggedOrg.organizationId, targetOrg.organizationId);
    setDraggedOrg(null);
    setDragOverOrg(null);
  };

  const toggleExpanded = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const getOrgIcon = (level: number) => {
    if (level === 1) return <Building className="h-5 w-5 text-blue-600" />;
    return <Network className="h-5 w-5 text-green-600" />;
  };

  const renderOrganizationNode = (org: Organization, depth = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedOrgs.has(org.organizationId);
    const isDraggedOver = dragOverOrg?.organizationId === org.organizationId;
    const isDragged = draggedOrg?.organizationId === org.organizationId;

    return (
      <div key={org.organizationId} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div
          draggable={isAdmin}
          onDragStart={(e) => handleDragStart(e, org)}
          onDragOver={(e) => handleDragOver(e, org)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, org)}
          className={`
            flex items-center justify-between p-3 border rounded-lg transition-all mb-2
            ${isDraggedOver ? 'border-blue-500 bg-blue-50 shadow-md' : 'hover:bg-gray-50'}
            ${isDragged ? 'opacity-50' : ''}
            ${isAdmin ? 'cursor-move' : ''}
          `}
        >
          <div className="flex items-center space-x-3">
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(org.organizationId)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {getOrgIcon(org.organizationLevel)}
            <div>
              <div className="font-medium text-gray-900">{org.organizationName}</div>
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {org.organizationType === 'parent' ? 'Parent Org' : 'Sub-Org'}
                </Badge>
                <span>• Level {org.organizationLevel}</span>
                {org.gstin && <span>• GSTIN: {org.gstin}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={org.isActive ? "default" : "secondary"}>
              {org.isActive ? 'Active' : 'Inactive'}
            </Badge>

            {isAdmin && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedParentOrg(org);
                    setShowCreateSubOrg(true);
                  }}
                  title="Create sub-organization"
                >
                  <Plus className="h-4 w-4 text-green-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrg(org);
                    setEditOrgForm({
                      name: org.organizationName,
                      description: org.description || '',
                      gstin: org.gstin || '',
                      isActive: org.isActive
                    });
                    setShowEditOrg(true);
                  }}
                  title="Edit organization"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrg(org);
                    setShowMoveOrg(true);
                  }}
                  title="Move organization"
                >
                  <Move className="h-4 w-4 text-blue-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteOrganization(org.organizationId, org.organizationName)}
                  title="Delete organization"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-gray-200 ml-4 pl-4">
            {org.children!.map(child => renderOrganizationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {hasParentOrg ? `${parentOrg?.organizationName} - Organization Hierarchy` : 'Setup Parent Organization'}
          </h2>
          <p className="text-gray-600">
            {hasParentOrg
              ? 'Manage your organizational structure with drag-and-drop functionality'
              : 'Start by creating your parent organization (e.g., TCS, Infosys, etc.)'
            }
          </p>
          <div className="flex items-center space-x-4 mt-2">
            {hasParentOrg ? (
              <>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Move className="h-4 w-4" />
                  <span>Drag organizations to move them</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Plus className="h-4 w-4" />
                  <span>Create sub-organizations and locations</span>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Building className="h-4 w-4" />
                <span>Create your main parent company first</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadHierarchy} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          {isAdmin && (
            <>
              {!hasParentOrg ? (
                <Button
                  onClick={() => setShowCreateParentOrg(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Create Parent Organization
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setSelectedParentOrg(parentOrg);
                      setShowCreateSubOrg(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sub-Organization
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedOrg(parentOrg);
                      setEditOrgForm({
                        name: parentOrg?.organizationName || '',
                        description: parentOrg?.description || '',
                        gstin: parentOrg?.gstin || '',
                        isActive: parentOrg?.isActive || true
                      });
                      setShowEditOrg(true);
                    }}
                    variant="outline"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Parent
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {hasParentOrg ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Parent Company</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {parentOrg?.organizationName || 'N/A'}
                    </p>
                  </div>
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sub-Organizations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {hierarchy?.hierarchy.reduce((total, org) => total + (org.children?.length || 0), 0) || 0}
                    </p>
                  </div>
                  <Network className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Locations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {/* This will be updated when we integrate location counts */}
                      0
                    </p>
                  </div>
                  <MapPin className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Organization Level</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.max(...(hierarchy?.hierarchy.map(org => org.organizationLevel) || [1]), 1)}
                    </p>
                  </div>
                  <Layers className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Building className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Organization Management</h3>
              <p className="text-gray-600 mb-4">
                Start by creating your parent organization (e.g., TCS, Infosys, etc.). This will be the root of your organizational hierarchy.
              </p>
              <Button
                onClick={() => setShowCreateParentOrg(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Building className="h-4 w-4 mr-2" />
                Create Parent Organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Organization Hierarchy Tree - Only show when parent org exists */}
      {hasParentOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TreePine className="mr-2 h-5 w-5" />
              Organization Structure Tree
            </CardTitle>
            <CardDescription>
              Visual representation of your organizational hierarchy. Click arrows to expand/collapse branches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading organization hierarchy...</p>
              </div>
            ) : hierarchy?.hierarchy && hierarchy.hierarchy.length > 0 ? (
              <div className="space-y-2">
                {hierarchy.hierarchy.map(org => renderOrganizationNode(org))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TreePine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sub-Organizations Yet</h3>
                <p className="text-gray-600 mb-4">Your parent organization is set up. You can now create sub-organizations.</p>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setSelectedParentOrg(parentOrg);
                      setShowCreateSubOrg(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Sub-Organization
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Parent Organization Dialog */}
      <Dialog open={showCreateParentOrg} onOpenChange={setShowCreateParentOrg}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Parent Organization</DialogTitle>
            <DialogDescription>
              Add a new parent organization to your tenant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="parentOrgName">Organization Name *</Label>
              <Input
                id="parentOrgName"
                placeholder="e.g., TechCorp Inc"
                value={parentOrgForm.name}
                onChange={(e) => setParentOrgForm({ ...parentOrgForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentOrgDescription">Description</Label>
              <Textarea
                id="parentOrgDescription"
                placeholder="Describe the purpose and scope of this organization"
                rows={3}
                value={parentOrgForm.description}
                onChange={(e) => setParentOrgForm({ ...parentOrgForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentOrgGstin">GSTIN (Optional)</Label>
              <Input
                id="parentOrgGstin"
                placeholder="22AAAAA0000A1Z6"
                value={parentOrgForm.gstin}
                onChange={(e) => setParentOrgForm({ ...parentOrgForm, gstin: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateParentOrg(false)}>
              Cancel
            </Button>
            <Button
              onClick={createParentOrganization}
              disabled={!parentOrgForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Building className="h-4 w-4 mr-2" />
              Create Parent Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sub-Organization Dialog */}
      <Dialog open={showCreateSubOrg} onOpenChange={setShowCreateSubOrg}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Sub-Organization</DialogTitle>
            <DialogDescription>
              Add a new sub-organization under {selectedParentOrg?.organizationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subOrgName">Organization Name *</Label>
              <Input
                id="subOrgName"
                placeholder="e.g., Engineering Division"
                value={subOrgForm.name}
                onChange={(e) => setSubOrgForm({ ...subOrgForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subOrgDescription">Description</Label>
              <Textarea
                id="subOrgDescription"
                placeholder="Describe the purpose and scope of this sub-organization"
                rows={3}
                value={subOrgForm.description}
                onChange={(e) => setSubOrgForm({ ...subOrgForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subOrgGstin">GSTIN (Optional)</Label>
              <Input
                id="subOrgGstin"
                placeholder="22AAAAA0000A1Z6"
                value={subOrgForm.gstin}
                onChange={(e) => setSubOrgForm({ ...subOrgForm, gstin: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSubOrg(false)}>
              Cancel
            </Button>
            <Button
              onClick={createSubOrganization}
              disabled={!subOrgForm.name.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Sub-Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditOrg} onOpenChange={setShowEditOrg}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details for {selectedOrg?.organizationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOrgName">Organization Name *</Label>
              <Input
                id="editOrgName"
                placeholder="e.g., TechCorp Inc"
                value={editOrgForm.name}
                onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editOrgDescription">Description</Label>
              <Textarea
                id="editOrgDescription"
                placeholder="Describe the purpose and scope of this organization"
                rows={3}
                value={editOrgForm.description}
                onChange={(e) => setEditOrgForm({ ...editOrgForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editOrgGstin">GSTIN (Optional)</Label>
              <Input
                id="editOrgGstin"
                placeholder="22AAAAA0000A1Z6"
                value={editOrgForm.gstin}
                onChange={(e) => setEditOrgForm({ ...editOrgForm, gstin: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editOrgActive"
                checked={editOrgForm.isActive}
                onChange={(e) => setEditOrgForm({ ...editOrgForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="editOrgActive">Organization is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOrg(false)}>
              Cancel
            </Button>
            <Button
              onClick={updateOrganization}
              disabled={!editOrgForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Update Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Organization Dialog */}
      <Dialog open={showMoveOrg} onOpenChange={setShowMoveOrg}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Move Organization</DialogTitle>
            <DialogDescription>
              Move {selectedOrg?.organizationName} to a new parent organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Moving Organization</p>
                  <p className="text-sm text-yellow-700">
                    This will move "{selectedOrg?.organizationName}" and all its sub-organizations to the selected parent.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select New Parent Organization</Label>
              <Select onValueChange={(value) => {
                const newParentId = value === 'root' ? null : value;
                if (selectedOrg) {
                  moveOrganization(selectedOrg.organizationId, newParentId);
                  setShowMoveOrg(false);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a parent organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Make Root Organization</SelectItem>
                  {hierarchy?.hierarchy
                    .filter(org => selectedOrg && org.organizationId !== selectedOrg.organizationId)
                    .map(org => (
                      <SelectItem key={org.organizationId} value={org.organizationId}>
                        {org.organizationName} (Level {org.organizationLevel})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveOrg(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// New Component: Location Management
export function LocationManagement({
  tenantId,
  isAdmin,
  makeRequest
}: {
  tenantId: string;
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [showAssignLocation, setShowAssignLocation] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form states
  const [locationForm, setLocationForm] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    organizationId: ''
  });
  const [editLocationForm, setEditLocationForm] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    isActive: true
  });
  const [capacityForm, setCapacityForm] = useState({
    maxOccupancy: '',
    currentOccupancy: ''
  });

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await makeRequest(`/locations/tenant/${tenantId}`, {
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        setLocations(response.locations || []);
      }
    } catch (error) {
      toast.error('Failed to load locations');
      console.error('Locations load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await makeRequest(`/organizations/hierarchy/${tenantId}`, {
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        // Flatten the hierarchy to get all organizations
        const allOrgs: Organization[] = [];
        const flattenOrgs = (orgs: Organization[]) => {
          orgs.forEach(org => {
            allOrgs.push(org);
            if (org.children) flattenOrgs(org.children);
          });
        };
        flattenOrgs(response.hierarchy || []);
        setOrganizations(allOrgs);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  useEffect(() => {
    loadLocations();
    loadOrganizations();
  }, [tenantId]);

  // CRUD Functions
  const createLocation = async () => {
    try {
      const response = await makeRequest('/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          name: locationForm.name,
          street: locationForm.street,
          city: locationForm.city,
          state: locationForm.state,
          zipCode: locationForm.zipCode,
          country: locationForm.country,
          organizationId: locationForm.organizationId
        })
      });

      if (response.success) {
        toast.success('Location created successfully!');
        setLocationForm({
          name: '',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          organizationId: ''
        });
        setShowCreateLocation(false);
        loadLocations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create location');
    }
  };

  const updateLocation = async () => {
    if (!selectedLocation) return;

    try {
      const response = await makeRequest(`/locations/${selectedLocation.locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify(editLocationForm)
      });

      if (response.success) {
        toast.success('Location updated successfully!');
        setShowEditLocation(false);
        setSelectedLocation(null);
        loadLocations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update location');
    }
  };

  const deleteLocation = async (locationId: string, locationName: string) => {
    if (!confirm(`Are you sure you want to delete "${locationName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await makeRequest(`/locations/${locationId}`, {
        method: 'DELETE',
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        toast.success('Location deleted successfully!');
        loadLocations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete location');
    }
  };

  const assignLocationToOrganization = async (locationId: string, organizationId: string) => {
    try {
      const response = await makeRequest(`/locations/${locationId}/assign/${organizationId}`, {
        method: 'POST',
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        toast.success('Location assigned successfully!');
        loadLocations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign location');
    }
  };

  const updateLocationCapacity = async (locationId: string) => {
    try {
      const response = await makeRequest(`/locations/${locationId}/capacity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          maxOccupancy: parseInt(capacityForm.maxOccupancy) || null,
          currentOccupancy: parseInt(capacityForm.currentOccupancy) || 0
        })
      });

      if (response.success) {
        toast.success('Capacity updated successfully!');
        setCapacityForm({ maxOccupancy: '', currentOccupancy: '' });
        loadLocations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update capacity');
    }
  };

  const getUtilizationColor = (percentage?: number) => {
    if (!percentage) return 'text-gray-500';
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationBadge = (percentage?: number) => {
    if (!percentage) return 'secondary';
    if (percentage < 50) return 'default';
    if (percentage < 80) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Location Management</h2>
          <p className="text-gray-600">Manage physical and virtual locations across your organization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadLocations} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setShowCreateLocation(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Locations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {locations.filter(loc => loc.isActive).length}
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
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-gray-900">
                  {locations.length > 0
                    ? Math.round(locations.reduce((sum, loc) => sum + (loc.capacity?.utilizationPercentage || 0), 0) / locations.length)
                    : 0}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Orgs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {locations.reduce((sum, loc) => sum + (loc.organizationCount || 0), 0)}
                </p>
              </div>
              <Building className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Locations ({locations.length})
          </CardTitle>
          <CardDescription>
            Manage your organization's physical and virtual locations with capacity tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location.locationId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-600 rounded-full flex items-center justify-center text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{location.locationName}</div>
                    <div className="text-sm text-gray-600">
                      {location.address?.city}, {location.address?.country}
                      {location.organizationCount && (
                        <span className="ml-2">• {location.organizationCount} organizations</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Capacity Info */}
                  {location.capacity && (
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getUtilizationColor(location.capacity.utilizationPercentage)}`}>
                        {location.capacity.currentOccupancy || 0}/{location.capacity.maxOccupancy || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {location.capacity.utilizationPercentage || 0}% utilized
                      </div>
                    </div>
                  )}

                  {/* Utilization Badge */}
                  <Badge
                    variant={getUtilizationBadge(location.capacity?.utilizationPercentage)}
                    className="text-xs"
                  >
                    {location.capacity?.utilizationPercentage ?
                      `${location.capacity.utilizationPercentage}% utilized` :
                      'No capacity data'
                    }
                  </Badge>

                  {/* Status Badge */}
                  <Badge variant={location.isActive ? "default" : "secondary"}>
                    {location.isActive ? 'Active' : 'Inactive'}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowAssignLocation(true);
                      }}
                      title="Assign to organization"
                    >
                      <Network className="h-4 w-4 text-blue-600" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success('Location analytics coming soon!')}
                      title="View analytics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>

                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLocation(location);
                            setEditLocationForm({
                              name: location.locationName,
                              street: location.address?.street || '',
                              city: location.address?.city || '',
                              state: location.address?.state || '',
                              zipCode: location.address?.zipCode || '',
                              country: location.address?.country || '',
                              isActive: location.isActive
                            });
                            setShowEditLocation(true);
                          }}
                          title="Edit location"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLocation(location);
                            setCapacityForm({
                              maxOccupancy: location.capacity?.maxOccupancy?.toString() || '',
                              currentOccupancy: location.capacity?.currentOccupancy?.toString() || ''
                            });
                            updateLocationCapacity(location.locationId);
                          }}
                          title="Update capacity"
                        >
                          <Zap className="h-4 w-4 text-purple-600" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLocation(location.locationId, location.locationName)}
                          title="Delete location"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {locations.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Locations Found</h3>
                <p className="text-gray-600 mb-4">Start by adding your first location</p>
                {isAdmin && (
                  <Button onClick={() => setShowCreateLocation(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Location
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Location Dialog */}
      <Dialog open={showCreateLocation} onOpenChange={setShowCreateLocation}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Location</DialogTitle>
            <DialogDescription>
              Add a new physical or virtual location to your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">Location Name *</Label>
                <Input
                  id="locationName"
                  placeholder="e.g., Downtown HQ"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Assign to Organization *</Label>
                <Select
                  value={locationForm.organizationId}
                  onValueChange={(value) => setLocationForm({ ...locationForm, organizationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* All available organizations - the backend will handle the hierarchy */}
                    {organizations.map((org) => (
                      <SelectItem key={org.organizationId} value={org.organizationId}>
                        {org.organizationName} ({org.organizationType === 'parent' ? 'Parent Company' : 'Sub-Organization'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                placeholder="123 Business Street"
                value={locationForm.street}
                onChange={(e) => setLocationForm({ ...locationForm, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Bangalore"
                  value={locationForm.city}
                  onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  placeholder="Karnataka"
                  value={locationForm.state}
                  onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input
                  id="zipCode"
                  placeholder="560001"
                  value={locationForm.zipCode}
                  onChange={(e) => setLocationForm({ ...locationForm, zipCode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="India"
                  value={locationForm.country}
                  onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLocation(false)}>
              Cancel
            </Button>
            <Button
              onClick={createLocation}
              disabled={!locationForm.name.trim() || !locationForm.organizationId}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditLocation} onOpenChange={setShowEditLocation}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location details for {selectedLocation?.locationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editLocationName">Location Name *</Label>
              <Input
                id="editLocationName"
                placeholder="e.g., Downtown HQ"
                value={editLocationForm.name}
                onChange={(e) => setEditLocationForm({ ...editLocationForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStreet">Street Address</Label>
              <Input
                id="editStreet"
                placeholder="123 Business Street"
                value={editLocationForm.street}
                onChange={(e) => setEditLocationForm({ ...editLocationForm, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCity">City *</Label>
                <Input
                  id="editCity"
                  placeholder="Bangalore"
                  value={editLocationForm.city}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editState">State/Province</Label>
                <Input
                  id="editState"
                  placeholder="Karnataka"
                  value={editLocationForm.state}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editZipCode">ZIP/Postal Code</Label>
                <Input
                  id="editZipCode"
                  placeholder="560001"
                  value={editLocationForm.zipCode}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, zipCode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCountry">Country *</Label>
                <Input
                  id="editCountry"
                  placeholder="India"
                  value={editLocationForm.country}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, country: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editLocationActive"
                checked={editLocationForm.isActive}
                onChange={(e) => setEditLocationForm({ ...editLocationForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="editLocationActive">Location is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLocation(false)}>
              Cancel
            </Button>
            <Button
              onClick={updateLocation}
              disabled={!editLocationForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Location Dialog */}
      <Dialog open={showAssignLocation} onOpenChange={setShowAssignLocation}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assign Location to Organization</DialogTitle>
            <DialogDescription>
              Assign {selectedLocation?.locationName} to an organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Location Assignment</p>
                  <p className="text-sm text-blue-700">
                    Choose an organization to assign this location to. Locations can be assigned to multiple organizations.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Organization</Label>
              <Select onValueChange={(value) => {
                if (selectedLocation) {
                  assignLocationToOrganization(selectedLocation.locationId, value);
                  setShowAssignLocation(false);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose organization to assign" />
                </SelectTrigger>
                <SelectContent>
                  {/* All available organizations - the backend will handle the hierarchy */}
                  {organizations.map((org) => (
                    <SelectItem key={org.organizationId} value={org.organizationId}>
                      {org.organizationName} ({org.organizationType === 'parent' ? 'Parent Company' : 'Sub-Organization'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Locations can be assigned to your parent company or any sub-organization
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignLocation(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Placeholder implementations for existing components
// In production, import these from the original OrganizationManagement.tsx file

export function OrganizationUserManagement(_props: {
  employees: Employee[];
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadDashboardData: () => void;
  inviteEmployee: () => void;
}) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600">User management component should be imported from original OrganizationManagement.tsx</p>
      <Button onClick={() => toast.success('Please import OrganizationUserManagement from the original file')}>
        Import Required
      </Button>
    </div>
  );
}

export function OrganizationPermissionManagement(_props: { applications: Application[] }) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600">Permission management component should be imported from original OrganizationManagement.tsx</p>
      <Button onClick={() => toast.success('Please import OrganizationPermissionManagement from the original file')}>
        Import Required
      </Button>
    </div>
  );
}

// Enhanced Main Component with all features
export function OrganizationManagement({
  employees,
  applications: _applications,
  isAdmin,
  makeRequest,
  loadDashboardData,
  inviteEmployee
}: OrganizationManagementProps) {
  const [tenantId] = useState('893d8c75-68e6-4d42-92f8-45df62ef08b6'); // This should come from user context
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <OrganizationUserManagement
            employees={employees}
            isAdmin={isAdmin}
            makeRequest={makeRequest}
            loadDashboardData={loadDashboardData}
            inviteEmployee={inviteEmployee}
          />
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          <OrganizationHierarchyManagement
            tenantId={tenantId}
            isAdmin={isAdmin}
            makeRequest={makeRequest}
          />
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <LocationManagement
            tenantId={tenantId}
            isAdmin={isAdmin}
            makeRequest={makeRequest}
          />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <OrganizationPermissionManagement applications={_applications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
