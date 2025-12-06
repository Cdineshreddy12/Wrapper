import React, { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PearlButton } from '@/components/ui/pearl-button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OrganizationHierarchyFlow } from '@/features/organizations/components/OrganizationHierarchyFlow'
import { EditResponsiblePersonModal } from './modals/EditResponsiblePersonModal'
import { Application } from '@/hooks/useDashboardData'
import { useTenantApplications, useApplicationAllocations } from '@/hooks/useSharedQueries'

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
  freeCredits?: number;
  paidCredits?: number;
  address?: any;
  children: Entity[];
  createdAt?: string;
  updatedAt?: string;
  // Application credit allocations for organizations
  applicationAllocations?: Array<{
    application: string;
    allocatedCredits: number;
    usedCredits: number;
    availableCredits: number;
    hasAllocation: boolean;
    autoReplenish: boolean;
  }>;
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
  UserCog,
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
  freeCredits?: number;
  paidCredits?: number;
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
  freeCredits?: number;
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



// Enhanced Organization Tree Management Component
export function OrganizationTreeManagement({
  tenantId,
  isAdmin,
  makeRequest,
  applications,
  showEditResponsiblePerson,
  setShowEditResponsiblePerson,
  editingEntity,
  setEditingEntity,
  getResponsiblePersonName,
  loadResponsiblePersonNames
}: {
  tenantId: string;
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  applications: Application[];
  showEditResponsiblePerson: boolean;
  setShowEditResponsiblePerson: (show: boolean) => void;
  editingEntity: Entity | null;
  setEditingEntity: (entity: Entity | null) => void;
  getResponsiblePersonName: (userId: string) => string;
  loadResponsiblePersonNames: (entities: (Entity | Organization)[]) => Promise<void>;
}) {


  // Use shared hook with caching for tenant applications
  const { data: cachedApplications = [], isLoading: applicationsLoading } = useTenantApplications(tenantId);

  // Use fallback applications if prop applications are not available
  // Prefer prop applications, then cached applications from hook
  const effectiveApplications = useMemo(() => {
    if (applications && Array.isArray(applications) && applications.length > 0) {
      return applications;
    }
    return cachedApplications;
  }, [applications, cachedApplications]);


  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(null);
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);
  const [tenantHierarchy, setTenantHierarchy] = useState<Entity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');
  const [responsiblePersonNames, setResponsiblePersonNames] = useState<Map<string, string>>(new Map());

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
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [showHierarchyChart, setShowHierarchyChart] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [allocating, setAllocating] = useState(false);

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

  const [allocationForm, setAllocationForm] = useState({
    targetApplication: '',
    creditAmount: 0,
    allocationPurpose: '',
    autoReplenish: false
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      // Load hierarchy first

      let hierarchyResponse = null;

      // Try primary hierarchy loading
      hierarchyResponse = await makeRequest(`/admin/entities/hierarchy/${tenantId}`, {
        headers: { 'X-Application': 'crm' }
      });

      // Try fallback approach if primary fails
      if (!hierarchyResponse || !hierarchyResponse.success) {
        const fallbackResponse = await makeRequest(`/admin/entities/all?tenantId=${tenantId}&entityType=organization`, {
          headers: { 'X-Application': 'crm' }
        });

        if (fallbackResponse && fallbackResponse.success) {
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
          return;
        }

        // If all else fails, show empty state
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

        // Find parent organization from hierarchy
        const parentOrganization = transformedHierarchy.hierarchy?.find(
          (org: any) => org.entityType === 'organization' && org.entityLevel === 1
        );

        if (parentOrganization) {
          setParentOrg(parentOrganization);
        } else {
          setParentOrg(null);
        }
      } else {
        toast.error('Failed to load entity hierarchy');
      }

      // Load locations for the tenant
      try {
        const locationsResponse = await makeRequest(`/entities/tenant/${tenantId}?entityType=location`, {
          headers: { 'X-Application': 'crm' }
        });

        if (locationsResponse && locationsResponse.success) {
          setLocations(locationsResponse.entities || []);
        } else {
          setLocations([]);
        }
      } catch (locationsError) {
        setLocations([]);
      }

      // Load users for responsible person dropdowns
      try {
        const usersResponse = await makeRequest('/tenants/current/users', {
          headers: { 'X-Application': 'crm' }
        });

        if (usersResponse && usersResponse.success) {
          setUsers(usersResponse.data || []);
        } else {
          setUsers([]);
        }
      } catch (usersError) {
        setUsers([]);
      }
    } catch (error: any) {
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
        setSubForm({ name: '', description: '', responsiblePersonId: '', organizationType: 'department' });
        setShowCreateSub(false);
        setSelectedOrg(null);
        loadData();
      }
    } catch (error: any) {
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
      availableCredits: org.availableCredits ? Number(org.availableCredits) : undefined,
      freeCredits: org.freeCredits ? Number(org.freeCredits) : undefined,
      paidCredits: org.paidCredits ? Number(org.paidCredits) : undefined,
      address: org.address,
      children: org.children ? org.children.map(transformToEntity) : [],
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    };
  };

  // Build proper tenant hierarchy: Tenant -> Parent Org -> Sub Orgs/Locations
  const buildTenantHierarchy = async (orgHierarchy: Organization[], parentOrg: Organization | null, tenantId?: string): Promise<Entity[]> => {
    
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

    // Batch load all application allocations upfront to avoid N+1 queries
    const allocationsMap = new Map<string, any[]>();
    const collectEntityIds = (orgs: Organization[]): string[] => {
      const ids: string[] = [];
      orgs.forEach(org => {
        if (org.entityType === 'organization' && org.entityId) {
          ids.push(org.entityId);
        }
        if (org.children && Array.isArray(org.children)) {
          ids.push(...collectEntityIds(org.children));
        }
      });
      return ids;
    };

    const allEntityIds = collectEntityIds(orgHierarchy);
    
    // Batch load allocations for all organizations (with caching via React Query)
    if (allEntityIds.length > 0) {
      try {
        // Use Promise.allSettled to handle partial failures gracefully
        const allocationPromises = allEntityIds.map(async (entityId) => {
          try {
            const allocationsResponse = await makeRequest(`admin/credits/entity/${entityId}/application-allocations`);
            if (allocationsResponse.success && allocationsResponse.data?.allocations?.length > 0) {
              return { entityId, allocations: allocationsResponse.data.allocations };
            }
          } catch (error) {
            // Silently handle errors - not critical for org management
          }
          return { entityId, allocations: [] };
        });

        const allocationResults = await Promise.allSettled(allocationPromises);
        allocationResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            allocationsMap.set(result.value.entityId, result.value.allocations);
          }
        });
      } catch (error) {
        // Silently handle batch loading errors
      }
    }

    // Recursively transform organization hierarchy to entity hierarchy
    const transformOrgToEntity = (org: Organization, level: number = 1): Entity => {
      const entity = transformToEntity(org);
      entity.entityLevel = level;

      // Use pre-loaded allocations from map instead of making API calls
      if (org.entityType === 'organization' && org.entityId) {
        const allocations = allocationsMap.get(org.entityId);
        if (allocations && allocations.length > 0) {
          entity.applicationAllocations = allocations.map((alloc: any) => ({
            application: alloc.targetApplication,
            allocatedCredits: parseFloat(alloc.allocatedCredits || 0),
            usedCredits: parseFloat(alloc.usedCredits || 0),
            availableCredits: parseFloat(alloc.availableCredits || 0),
            hasAllocation: true,
            autoReplenish: alloc.autoReplenish || false
          }));
        }
      }

      // Transform children recursively and preserve hierarchy
      if (org.children && Array.isArray(org.children) && org.children.length > 0) {
        entity.children = org.children.map((child) => {
          return transformOrgToEntity(child as Organization, level + 1);
        });
      } else {
        entity.children = [];
      }

      return entity;
    };

    // Use the processed hierarchy directly, which already includes proper nesting
    tenantEntity.children = orgHierarchy.map((org) => {
      return transformOrgToEntity(org, 1);
    });

    return [tenantEntity];
  };

  // Process hierarchy to include locations as children
  const processedHierarchy = React.useMemo(() => {
    try {
      if (!hierarchy?.hierarchy || !Array.isArray(hierarchy.hierarchy)) {
        return [];
      }


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
        freeCredits: entity.freeCredits
      }));

      // First, let's see what we have before filtering
      const validOrgs = convertedOrgs.filter(org => org && org.entityId && org.entityName);

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


      // If filtering removes everything but we have valid orgs, show them anyway with a warning  
      if (processedOrgs.length === 0 && validOrgs.length > 0) {
        // Show all valid organizations if filtering removed everything
        const unfiltered = validOrgs;
        
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
      return finalHierarchy;

    } catch (error) {
      return [];
    }
  }, [hierarchy?.hierarchy, locations, searchTerm, filterType]);

  // Build tenant hierarchy when processedHierarchy changes
  useEffect(() => {
    const buildHierarchy = async () => {
      if (processedHierarchy && processedHierarchy.length > 0) {
        try {
          const hierarchy = await buildTenantHierarchy(processedHierarchy, parentOrg, tenantId);
          setTenantHierarchy(hierarchy);

          // Load responsible person names for the hierarchy
          if (loadResponsiblePersonNames) {
            await loadResponsiblePersonNames(processedHierarchy);
          }
        } catch (error) {
          setTenantHierarchy([]);
        }
      } else {
        setTenantHierarchy([]);
      }
    };

    buildHierarchy();
  }, [processedHierarchy, parentOrg, tenantId]);

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
            {org.responsiblePersonId && (
              <div className="text-xs text-purple-600 truncate mt-1">
                👤 Admin: {getResponsiblePersonName(org.responsiblePersonId)}
              </div>
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

            {/* Change Responsible Person Button */}
            {!isLocation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingEntity(org as Entity);
                  setShowEditResponsiblePerson(true);
                }}
                title="Change responsible person"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <UserCog className="w-4 h-4" />
              </Button>
            )}

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
                return null;
              }
              return <TreeNode key={child.entityId} org={child} level={level + 1} />;
            }).filter(Boolean)}
          </div>
        )}
      </div>
    );
  };

  // Query client for invalidating cached data
  const queryClient = useQueryClient();

  const handleAllocateCredits = async () => {
    if (!selectedEntity || !allocationForm.creditAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if applications are loaded
    if (!Array.isArray(effectiveApplications) || effectiveApplications.length === 0) {
      toast.error('No applications available. Please configure applications first.');
      return;
    }

    if (!allocationForm.targetApplication) {
      toast.error('Please select an application');
      return;
    }

    // Check if entity has enough credits
    const entityCredits = Number(selectedEntity.availableCredits || 0);
    if (allocationForm.creditAmount > entityCredits) {
      toast.error(`Entity only has ${entityCredits.toFixed(2)} credits available`);
      return;
    }

    setAllocating(true);
    try {
      const response = await makeRequest('/credits/allocate/application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Application': 'crm'
        },
        body: JSON.stringify({
          sourceEntityId: selectedEntity.entityId,
          targetApplication: allocationForm.targetApplication,
          creditAmount: allocationForm.creditAmount,
          allocationPurpose: allocationForm.allocationPurpose,
          autoReplenish: allocationForm.autoReplenish
        })
      });

      if (response.success) {
        toast.success(`Successfully allocated ${allocationForm.creditAmount} credits to ${allocationForm.targetApplication}`);

        // Reset form
        setAllocationForm({
          targetApplication: '',
          creditAmount: 0,
          allocationPurpose: '',
          autoReplenish: false
        });
        setShowAllocationDialog(false);

        // Invalidate credit queries to update the UI immediately
        // This will automatically refresh the BillingStatusNavbar and other credit displays
        try {
          queryClient.invalidateQueries({ queryKey: ['credit'] });
          queryClient.invalidateQueries({ queryKey: ['creditStatus'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['entities'] });
          queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'entities'] });

          console.log('✅ Credit queries invalidated, UI should update automatically');
        } catch (invalidateError) {
          console.warn('Failed to invalidate queries:', invalidateError);
          // Don't show error to user as this is not critical
        }

        // Refresh data to show updated allocations and credit balances
        // Add a small delay to ensure database transaction has committed
        setTimeout(() => {
          loadData();
        }, 500);
      } else {
        toast.error(response.message || 'Failed to allocate credits');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to allocate credits');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* View Hierarchy Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full sm:w-auto gap-3">
                  <div>
                      {tenantId && (
                            <PearlButton 
                              variant="primary" 
                              size="md"
                              onClick={() => setShowHierarchyChart(true)}
                            >
                              <Eye className="w-4 h-4" />
                              View Hierarchy
                            </PearlButton>
                          )}
              
                  </div>
                  <div>
                      <Button variant="outline" className='dark:text-white dark:bg-slate-800' onClick={loadData} disabled={loading}>
                          <RefreshCw className={`w-4 h-4 mr-2 dark:text-white  ${loading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                  </div>
            </div>
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
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong className="dark:text-green-100">Parent Organization:</strong> {parentOrg.entityName}
            {parentOrg.description && ` - ${parentOrg.description}`}
          </AlertDescription>
        </Alert>
      )}

      {!parentOrg && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-slate-800 dark:border-slate-600">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-slate-200">
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
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 border-2"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-32 dark:border-gray-700 dark:bg-slate-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem key="all" value="all" className="dark:text-white dark:focus:bg-slate-700">All</SelectItem>
                <SelectItem key="active" value="active" className="dark:text-white dark:focus:bg-slate-700">Active</SelectItem>
                <SelectItem key="inactive" value="inactive" className="dark:text-white dark:focus:bg-slate-700">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Organization Tree with Multiple Views */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="dark:bg-slate-800 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Network className="w-5 h-5 dark:text-slate-300" />
            Organization Tree
            {hierarchy && (
              <Badge variant="secondary" className="ml-2 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                {hierarchy.totalOrganizations} organizations
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="dark:bg-slate-800">
      
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading organization hierarchy...</span>
            </div>
          ) : processedHierarchy.length > 0 ? (
            <>
              {/* Tree view only */}
              <div className="space-y-2">
                {processedHierarchy.map(org => {
                  if (!org || !org.entityId) {
                    return null;
                  }
                  try {
                    return <TreeNode key={org.entityId} org={org} />;
                  } catch (error) {
                    return null;
                  }
                }).filter(Boolean)}

                {/* Unassigned Locations */}
                {unassignedLocations.length > 0 && (
                  <div className={`mt-6 p-4 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20 ${
                    viewMode === 'grid' ? 'col-span-full' : ''
                  }`}>
                    <div className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 dark:text-orange-400" />
                      🚨 Unassigned Locations ({unassignedLocations.length})
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                      These locations are not assigned to any organization and should be assigned for proper management.
                    </div>
                    <div className="space-y-2">
                      {unassignedLocations.map(location => (
                        <div
                          key={location.entityId}
                          className="flex items-center border rounded-lg bg-white dark:bg-slate-700 border-orange-200 dark:border-orange-600 shadow-sm p-3"
                        >
                          <div className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-semibold mr-3 w-8 h-8">
                            ⚠️
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                                🏢 {location.entityName}
                              </span>
                              <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600 text-xs">
                                🚨 Unassigned
                              </Badge>
                            </div>
                            <div className="text-red-600 dark:text-red-400 font-medium text-xs">
                              🚫 Not assigned to any organization
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
        <DialogContent className="max-w-md sm:max-w-lg dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {selectedOrg ? 'Create Sub-Organization' : 'Create Organization'}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {selectedOrg
                ? `Create a sub-organization under ${selectedOrg.entityName}.`
                : 'Create a new top-level organization for this tenant.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <Label htmlFor="sub-name" className="dark:text-white">Organization Name *</Label>
              <Input
                id="sub-name"
                value={subForm.name}
                onChange={(e) => setSubForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                className="dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="sub-description" className="dark:text-white">Description</Label>
              <Textarea
                id="sub-description"
                value={subForm.description}
                onChange={(e) => setSubForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter organization description"
                className="dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="sub-type" className="dark:text-white">Organization Type</Label>
              <Select
                value={subForm.organizationType}
                onValueChange={(value) => setSubForm(prev => ({ ...prev, organizationType: value }))}
              >
                <SelectTrigger className="dark:bg-slate-900 dark:border-gray-700 dark:text-white">
                  <SelectValue placeholder="Select organization type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem key="department" value="department" className="dark:text-white dark:focus:bg-slate-700">Department</SelectItem>
                  <SelectItem key="team" value="team" className="dark:text-white dark:focus:bg-slate-700">Team</SelectItem>
                  <SelectItem key="division" value="division" className="dark:text-white dark:focus:bg-slate-700">Division</SelectItem>
                  <SelectItem key="branch" value="branch" className="dark:text-white dark:focus:bg-slate-700">Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sub-responsible" className="dark:text-white">Responsible Person</Label>
              <Select
                value={subForm.responsiblePersonId}
                onValueChange={(value) => setSubForm(prev => ({ ...prev, responsiblePersonId: value }))}
              >
                <SelectTrigger className="dark:bg-slate-900 dark:border-gray-700 dark:text-white">
                  <SelectValue placeholder="Select responsible person (optional)" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem key="none" value="none" className="dark:text-white dark:focus:bg-slate-700">No responsible person</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.userId} value={user.userId} className="dark:text-white dark:focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium dark:text-white">{user.name || 'Unnamed User'}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSub(false)} className="dark:border-gray-700 dark:text-white dark:hover:bg-slate-700">
              Cancel
            </Button>
            <Button onClick={createSubOrganization} disabled={!subForm.name.trim()} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              {selectedOrg ? 'Create Sub-Organization' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md sm:max-w-lg dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Edit Organization</DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              Update the details for {selectedOrg?.entityName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <Label htmlFor="edit-name" className="dark:text-white">Organization Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                className="dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="edit-description" className="dark:text-white">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter organization description"
                className="dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 dark:bg-slate-900"
              />
              <Label htmlFor="edit-active" className="dark:text-white">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="dark:border-gray-700 dark:text-white dark:hover:bg-slate-700">
              Cancel
            </Button>
            <Button onClick={updateOrganization} disabled={!editForm.name.trim()} className="dark:bg-blue-600 dark:hover:bg-blue-700">
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
                  <SelectItem key="office" value="office">Office</SelectItem>
                  <SelectItem key="warehouse" value="warehouse">Warehouse</SelectItem>
                  <SelectItem key="retail" value="retail">Retail Store</SelectItem>
                  <SelectItem key="remote" value="remote">Remote Work</SelectItem>
                  <SelectItem key="branch" value="branch">Branch Office</SelectItem>
                  <SelectItem key="headquarters" value="headquarters">Headquarters</SelectItem>
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
                  <SelectItem key="none" value="none">No responsible person</SelectItem>
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
                  <SelectItem key="organization" value="organization">Child Organization</SelectItem>
                  <SelectItem key="location" value="location">Location</SelectItem>
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
                        <SelectItem key="no-orgs" value="no-orgs" disabled>
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
                        <SelectItem key="no-locations" value="no-locations" disabled>
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
                    fromEntityId: selectedOrg?.entityId, // Add source entity
                    toEntityType: creditTransferForm.destinationEntityType,
                    toEntityId: creditTransferForm.destinationEntityId,
                    creditAmount: parseFloat(creditTransferForm.amount),
                    reason: creditTransferForm.description || `Transfer from ${selectedOrg?.entityName}`
                  };


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


      {/* Credit Allocation Dialog */}
      <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Credits to Application</DialogTitle>
            <DialogDescription>
              Allocate credits from <strong>{selectedEntity?.entityName}</strong> to an application
            </DialogDescription>
          </DialogHeader>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-2 rounded text-xs text-gray-600 mb-4">
              <div>Selected Entity: {selectedEntity?.entityName} ({selectedEntity?.entityId})</div>
              <div>Applications Available: {Array.isArray(effectiveApplications) ? effectiveApplications.length : 'Not loaded'}</div>
              <div>Available Credits: {Number(selectedEntity?.availableCredits || 0).toFixed(2)}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* Available Credits Info */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Available Credits:</strong> {Number(selectedEntity?.availableCredits || 0).toFixed(2)}
              </div>
            </div>

            {/* Application Selection */}
            <div>
              <label className="text-sm font-medium">Target Application</label>
              <Select
                value={allocationForm.targetApplication}
                onValueChange={(value) => setAllocationForm({...allocationForm, targetApplication: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveApplications && effectiveApplications.length > 0 ? (
                    effectiveApplications.map((app) => (
                      <SelectItem key={app.appCode} value={app.appCode}>
                        {app.appName} - {app.description || app.appCode}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">
                      {Array.isArray(effectiveApplications) && effectiveApplications.length === 0
                        ? 'No applications configured for this tenant'
                        : 'Loading applications from database...'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Credit Amount */}
            <div>
              <label className="text-sm font-medium">Credit Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={allocationForm.creditAmount}
                onChange={(e) => setAllocationForm({...allocationForm, creditAmount: parseFloat(e.target.value) || 0})}
                placeholder="Enter credit amount"
              />
            </div>

            {/* Allocation Purpose */}
            <div>
              <label className="text-sm font-medium">Purpose (Optional)</label>
              <Input
                value={allocationForm.allocationPurpose}
                onChange={(e) => setAllocationForm({...allocationForm, allocationPurpose: e.target.value})}
                placeholder="e.g., Monthly quota, Project allocation"
              />
            </div>

            {/* Auto Replenish */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoReplenish"
                checked={allocationForm.autoReplenish}
                onChange={(e) => setAllocationForm({...allocationForm, autoReplenish: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="autoReplenish" className="text-sm">
                Auto-replenish when credits are low
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAllocationDialog(false)}
              disabled={allocating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAllocateCredits}
              disabled={allocating || !allocationForm.creditAmount || !allocationForm.targetApplication || !Array.isArray(effectiveApplications) || effectiveApplications.length === 0}
            >
              {allocating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Allocating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Allocate Credits
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Hierarchy Chart Modal */}
      {showHierarchyChart && (
        <div className="fixed inset-0 z-50 bg-white" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="absolute top-4 right-4 z-50">
            <Button
              variant="outline"
              onClick={() => setShowHierarchyChart(false)}
              className="bg-white"
            >
              Close
            </Button>
          </div>
          <div className="w-full h-full">
            <OrganizationHierarchyFlow
              hierarchy={hierarchy ? {
                ...hierarchy,
                hierarchy: processedHierarchy.length > 0 ? processedHierarchy : (hierarchy.hierarchy || [])
              } : null}
              loading={loading}
              onRefresh={loadData}
              isAdmin={isAdmin}
              tenantId={tenantId}
              tenantName={tenantId ? `Tenant ${tenantId}` : undefined}
              onNodeClick={(nodeId) => {
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
                const org = findOrgById(processedHierarchy || [], nodeId);
                if (org && (org.entityType === 'organization' || org.entityType === 'location')) {
                  const entity = transformToEntity(org);
                  setSelectedEntity(entity);
                  setShowAllocationDialog(true);
                  setShowHierarchyChart(false);
                }
              }}
              onEditOrganization={(orgId) => {
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
                const orgToEdit = findOrgById(processedHierarchy || [], orgId);
                if (orgToEdit) {
                  setSelectedOrg(orgToEdit);
                  setSubForm({
                    name: orgToEdit.entityName,
                    description: orgToEdit.description || '',
                    responsiblePersonId: orgToEdit.responsiblePersonId || '',
                    organizationType: orgToEdit.organizationType || 'department'
                  });
                  setShowEdit(true);
                  setShowHierarchyChart(false);
                }
              }}
              onDeleteOrganization={async (orgId) => {
                if (confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
                  try {
                    await makeRequest(`/entities/${orgId}`, {
                      method: 'DELETE',
                      headers: { 'X-Application': 'crm' }
                    });
                    toast.success('Entity deleted successfully');
                    loadData();
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to delete entity');
                  }
                }
              }}
              onAddSubOrganization={(parentId) => {
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
                const parentOrg = findOrgById(processedHierarchy || [], parentId);
                if (parentOrg) {
                  setSelectedOrg(parentOrg);
                  setSubForm({ name: '', description: '', responsiblePersonId: '', organizationType: 'department' });
                  setShowCreateSub(true);
                  setShowHierarchyChart(false);
                }
              }}
              onAddLocation={(parentId) => {
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
                const parentOrg = findOrgById(processedHierarchy || [], parentId);
                if (parentOrg) {
                  setSelectedOrg(parentOrg);
                  setLocationForm({ name: '', description: '', locationType: 'office', address: {} });
                  setShowCreateLocation(true);
                  setShowHierarchyChart(false);
                }
              }}
            />
          </div>
        </div>
      )}
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
  // Debug tenant ID
  console.log('🏢 OrganizationManagement tenantId:', tenantId);

  if (!tenantId) {
    console.error('❌ CRITICAL: OrganizationManagement received no tenantId!');
    return (
      <div className="p-6">
        <div className="text-red-600 font-semibold">Error: No tenant ID available</div>
        <div className="text-gray-600 mt-2">Please refresh the page or contact support.</div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('hierarchy');

  // State for Edit Responsible Person modal
  const [showEditResponsiblePerson, setShowEditResponsiblePerson] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Map to store responsible person names
  const [responsiblePersonNames, setResponsiblePersonNames] = useState<Map<string, string>>(new Map());

  // Function to get responsible person name
  const getResponsiblePersonName = (userId: string) => {
    return responsiblePersonNames.get(userId) || 'Loading...';
  };

  // Function to load responsible person names
  const loadResponsiblePersonNames = async (entities: (Entity | Organization)[]) => {
    const userIds = new Set<string>();

    // Collect all unique responsible person IDs
    entities.forEach(entity => {
      if (entity.responsiblePersonId) {
        userIds.add(entity.responsiblePersonId);
      }
    });

    if (userIds.size === 0) return;

    try {

      // Load user details for all responsible persons at once
      const userPromises = Array.from(userIds).map(async (userId) => {
        try {
          const response = await makeRequest(`/admin/users/${userId}`, { method: 'GET' });
          if (response.data?.success && response.data.data) {
            return { userId, name: response.data.data.name || response.data.data.email || 'Unknown' };
          }
        } catch (error) {
        }
        return { userId, name: 'Unknown' };
      });

      const results = await Promise.all(userPromises);
      const namesMap = new Map<string, string>();

      results.forEach(({ userId, name }) => {
        namesMap.set(userId, name);
      });

      setResponsiblePersonNames(namesMap);
    } catch (error) {
    }
  };



  // Function to refresh organization data - will be passed to modal
  const refreshOrganizationData = () => {
    // This will trigger a refresh in the OrganizationTreeManagement component
    // We can implement this by using a key or callback pattern
    // For now, we'll use window.location.reload() as a simple solution
    // In a more sophisticated implementation, we'd use a state update
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organization Management</h2>
          <p className="text-muted-foreground">Manage your organization's structure, locations, and hierarchy</p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        

        <TabsContent value="hierarchy">
          {tenantId ? (
            <>
              

              <OrganizationTreeManagement
                tenantId={tenantId}
                isAdmin={isAdmin}
                makeRequest={makeRequest}
                applications={applications}
                showEditResponsiblePerson={showEditResponsiblePerson}
                setShowEditResponsiblePerson={setShowEditResponsiblePerson}
                editingEntity={editingEntity}
                setEditingEntity={setEditingEntity}
                getResponsiblePersonName={getResponsiblePersonName}
                loadResponsiblePersonNames={loadResponsiblePersonNames}
              />
            </>
          ) : (
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-8 text-center">
                <Building className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Unable to Load Organization Hierarchy
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tenant information is not available. Please refresh the page or contact support.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Responsible Person Modal */}
      <EditResponsiblePersonModal
        isOpen={showEditResponsiblePerson}
        onClose={() => setShowEditResponsiblePerson(false)}
        entity={editingEntity}
        onSuccess={() => {
          // Refresh the hierarchy data
          refreshOrganizationData();
        }}
        makeRequest={makeRequest}
      />
    </div>
  );
}

export default OrganizationManagement;
