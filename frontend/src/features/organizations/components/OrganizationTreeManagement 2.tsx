import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Section } from '@/components/common/Page/Section';
import { Typography } from '@/components/common/Typography';
import { TreeNode } from './TreeNode';
import { OrganizationDialogs } from './OrganizationDialogs';
import { OrganizationHierarchyFlow } from './OrganizationHierarchyFlow';
import {
  Plus,
  RefreshCw,
  Loader2,
  TreePine,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { OrganizationHierarchy, Organization, Location, BulkActionResult, QuickAction } from '@/types/organization';

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

interface OrganizationTreeManagementProps {
  tenantId: string;
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export function OrganizationTreeManagement({
  tenantId,
  isAdmin,
  makeRequest
}: OrganizationTreeManagementProps) {

  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(null);
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');

  // Enhanced state for new features
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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

  // Loading states for CRUD operations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);

      // Load hierarchy first

      let hierarchyResponse = null;

      try {
        hierarchyResponse = await makeRequest(`/admin/entities/hierarchy/${tenantId}`, {
          headers: { 'X-Application': 'crm' }
        });

        if (hierarchyResponse && hierarchyResponse.success) {
        } else {
        }
        } catch (apiError: any) {
          console.error('❌ Hierarchy API call failed:', apiError);

        // Try fallback approach
        try {
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
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError?.message);
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

          // Try to load parent organization separately
          try {
            const parentResponse = await makeRequest(`/entities/parent/${tenantId}`, {
              headers: { 'X-Application': 'crm' }
            });

            if (parentResponse.success && parentResponse.organization) {
              setParentOrg(parentResponse.organization);
            } else if (parentResponse.success && parentResponse.needsParentCreation) {
              setParentOrg(null); // Allow creating without parent
            } else {
              setParentOrg(null);
            }
          } catch (parentError) {
          }
        }
      } else {
        console.error('❌ Failed to load hierarchy:', hierarchyResponse);
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
      console.error('❌ Failed to load entity data:', error);
      toast.error(`Failed to load entity data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Helper function to find organization by ID in hierarchy
  const findOrganizationById = (id: string, orgs: any[]): any => {
    for (const org of orgs) {
      if (org.entityId === id) {
        return org;
      }
      if (org.children && org.children.length > 0) {
        const found = findOrganizationById(id, org.children);
        if (found) return found;
      }
    }
    return null;
  };

  // CRUD Operations
  const createSubOrganization = async () => {
    if (isCreating) return; // Prevent double submission
    
    // Client-side validation
    if (!subForm.name || subForm.name.trim().length < 2) {
      toast.error('Organization name must be at least 2 characters long');
      return;
    }

    setIsCreating(true);
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
      console.error('❌ Failed to create sub-organization:', error);
      toast.error(error.message || 'Failed to create sub-organization');
    } finally {
      setIsCreating(false);
    }
  };

  const updateOrganization = async () => {
    if (isUpdating) return; // Prevent double submission
    if (!selectedOrg) return;

    // Client-side validation
    if (editForm.name && editForm.name.trim().length < 2) {
      toast.error('Organization name must be at least 2 characters long');
      return;
    }

    setIsUpdating(true);
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
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (isDeleting) return; // Prevent double submission
    
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const createLocation = async () => {
    if (isCreatingLocation) return; // Prevent double submission
    if (!selectedOrg) return;

    setIsCreatingLocation(true);
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
    } finally {
      setIsCreatingLocation(false);
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
      icon: <AlertTriangle className="w-4 h-4" />,
      action: () => performBulkAction('deactivate', selectedItems),
      variant: 'secondary'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <AlertTriangle className="w-4 h-4" />,
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
      availableCredits: org.availableCredits,
      reservedCredits: org.reservedCredits,
      address: org.address,
      children: org.children ? org.children.map(transformToEntity) : [],
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    };
  };

  // Build organization hierarchy: Primary Org -> Sub Orgs/Locations (NO TENANT)
  const buildTenantHierarchy = (orgHierarchy: Organization[], parentOrg: Organization | null, tenantId?: string): Entity[] => {
    
    // Recursively transform organization hierarchy to entity hierarchy
    const transformOrgToEntity = (org: Organization, level: number = 0): Entity => {
      const entity = transformToEntity(org);
      entity.entityLevel = level;
      
      // Transform children recursively and preserve hierarchy
      if (org.children && Array.isArray(org.children) && org.children.length > 0) {
        entity.children = org.children.map(child => {
          const childEntity = transformOrgToEntity(child as Organization, level + 1);
          return childEntity;
        });
      } else {
        entity.children = [];
      }
      
      return entity;
    };

    // Find primary organization (entityLevel 1 or the one without parentEntityId)
    let primaryOrgs = orgHierarchy.filter(org => 
      org.entityLevel === 1 || 
      (!org.parentEntityId && org.entityType === 'organization')
    );

    // If no primary org found, use the first organization as primary
    if (primaryOrgs.length === 0 && orgHierarchy.length > 0) {
      primaryOrgs = [orgHierarchy[0]];
    }

    // If we have a parentOrg parameter, prioritize it
    if (parentOrg) {
      const parentInHierarchy = orgHierarchy.find(org => org.entityId === parentOrg.entityId);
      if (parentInHierarchy) {
        primaryOrgs = [parentInHierarchy];
      }
    }

    // Transform primary organizations (starting at level 0, not 1)
    const transformedHierarchy = primaryOrgs.map(org => {
      const transformedOrg = transformOrgToEntity(org, 0);
      return transformedOrg;
    });

    // If we have other orgs that aren't children of primary orgs, add them
    const primaryOrgIds = new Set(primaryOrgs.map(org => org.entityId));
    const remainingOrgs = orgHierarchy.filter(org => 
      !primaryOrgIds.has(org.entityId) && 
      !primaryOrgs.some(primary => 
        primary.children?.some((child: any) => child.entityId === org.entityId)
      )
    );

    if (remainingOrgs.length > 0) {
      remainingOrgs.forEach(org => {
        const transformedOrg = transformOrgToEntity(org, 0);
        transformedHierarchy.push(transformedOrg);
      });
    }

    return transformedHierarchy;
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
        reservedCredits: entity.reservedCredits
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
      console.error('❌ Error processing hierarchy:', error);
      return [];
    }
  }, [hierarchy?.hierarchy, locations, searchTerm, filterType]);

  // Get unassigned locations (locations without parentEntityId)
  const unassignedLocations = React.useMemo(() => {
    return locations.filter(location => !(location as any).parentEntityId);
  }, [locations]);

  // Helper function to check if organization can transfer credits (has children or locations)
  const canTransferCredits = (org: Organization | Location): boolean => {
    const orgChildren = (org as Organization).children;
    const hasChildren = orgChildren && Array.isArray(orgChildren) && orgChildren.length > 0;
    return !!hasChildren;
  };

  // Event handlers for TreeNode
  const handleSelect = (checked: boolean, entityId: string) => {
    if (checked) {
      setSelectedItems(prev => [...prev, entityId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== entityId));
    }
  };

  const handleAddSubOrganization = (org: Organization) => {
    setSelectedOrg(org);
    setSubForm({ name: '', description: '', responsiblePersonId: '', organizationType: 'department' });
    setShowCreateSub(true);
  };

  const handleAddLocation = (org: Organization) => {
    setSelectedOrg(org);
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
  };

  const handleEditOrganization = (org: Organization) => {
    setSelectedOrg(org);
    setEditForm({
      name: org.entityName,
      description: org.description || '',
      isActive: org.isActive || true
    });
    setShowEdit(true);
  };

  const handleTransferCredits = (org: Organization) => {
    setSelectedOrg(org);
    setCreditTransferForm(prev => ({
      ...prev,
      sourceEntityId: org.entityId,
      sourceEntityType: 'organization'
    }));
    setShowCreditTransfer(true);
  };

  const handleTransferCreditsSubmit = async () => {
    try {
      const transferData = {
        fromEntityId: selectedOrg?.entityId || creditTransferForm.sourceEntityId || undefined,
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
      console.error('❌ Credit transfer error:', error);
      toast.error(error.message || 'Failed to transfer credits');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Enhanced Header */}
      <Section
        title="Organization & Location Hierarchy"
        description="Manage your organization structure and locations in a unified hierarchical view"
        headerActions={[
          {
            label: "Refresh",
            onClick: loadData,
            icon: RefreshCw,
            variant: "outline",
            loading: loading
          }
        ]}
        variant="default"
        size="md"
        className="mb-6"
      >
        <div className="py-4">
          <div className="flex items-center gap-3">
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
      </Section>

      {/* Bulk Actions Only (View Mode Selector Removed - Only Tree View Available) */}
      <Section
        title=""
        description=""
        variant="minimal"
        size="sm"
        className="mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Typography variant="small" className="font-medium text-muted-foreground">View: Tree View</Typography>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <Typography variant="small" className="text-muted-foreground">
                {selectedItems.length} selected
              </Typography>
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
      </Section>

      {/* Parent Organization Display */}
      {parentOrg && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <Typography variant="body" className="font-semibold">Parent Organization:</Typography> {parentOrg.entityName}
            {parentOrg.description && ` - ${parentOrg.description}`}
          </AlertDescription>
        </Alert>
      )}

      {!parentOrg && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <Typography variant="body" className="font-semibold">Welcome to Organization Management!</Typography>
              <Typography variant="body">Since you're authenticated and have access to this tenant, the parent organization should be automatically created during onboarding. If you're seeing this message, it means:</Typography>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>This tenant hasn't completed the onboarding process yet</li>
                <li>Or the parent organization needs to be set up</li>
              </ul>
              <Typography variant="small">Once the parent organization is created, you'll be able to create sub-organizations and manage locations here.</Typography>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filter */}
      <Section
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" />
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
      </Section>

      {/* React Flow Organization Hierarchy - Full Page Viewport */}
      <div className="flex-1 w-full min-h-[600px] relative bg-blue-50 border-2 border-blue-500" style={{ height: 'calc(100vh - 300px)' }}>
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow z-50 text-xs">
          <p><strong>React Flow Debug Panel</strong></p>
          <p>Container Height: calc(100vh - 300px)</p>
          <p>Has Hierarchy: {hierarchy ? 'Yes' : 'No'}</p>
          <p>Hierarchy Length: {hierarchy?.hierarchy?.length || 0}</p>
          <p>Processed Length: {processedHierarchy.length}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Tenant ID: {tenantId || 'None'}</p>
        </div>
        <OrganizationHierarchyFlow
          hierarchy={hierarchy ? {
            ...hierarchy,
            hierarchy: processedHierarchy.length > 0 ? processedHierarchy : (hierarchy.hierarchy || [])
          } : null}
          loading={loading}
          onRefresh={loadData}
          isAdmin={isAdmin}
          tenantId={tenantId}
          tenantName={parentOrg?.entityName ? `${parentOrg.entityName} (Tenant)` : `Tenant ${tenantId}`}
          onNodeClick={(nodeId) => {
            // Find and select the organization
            const org = findOrganizationById(nodeId, processedHierarchy);
            if (org) {
              handleSelect(org.entityId);
            }
          }}
          onEditOrganization={(orgId) => {
            const org = findOrganizationById(orgId, processedHierarchy);
            if (org) {
              handleEditOrganization(org);
            }
          }}
          onDeleteOrganization={(orgId) => {
            const org = findOrganizationById(orgId, processedHierarchy);
            if (!org) return;
            if (!org.parentEntityId && !(org as any).parentOrganizationId) {
              toast.error('Cannot delete the primary organization created during onboarding.');
              return;
            }
            deleteOrganization(org.entityId, org.entityName);
          }}
          onAddSubOrganization={(parentId) => {
            const org = findOrganizationById(parentId, processedHierarchy);
            if (org) {
              handleAddSubOrganization(org);
            }
          }}
          onAddLocation={(parentId) => {
            const org = findOrganizationById(parentId, processedHierarchy);
            if (org) {
              handleAddLocation(org);
            }
          }}
          onTransferCredits={(orgId) => {
            const org = findOrganizationById(orgId, processedHierarchy);
            if (org) {
              handleTransferCredits(org);
            }
          }}
        />
      </div>

      {/* Organization Dialogs */}
      <OrganizationDialogs
        showCreateSub={showCreateSub}
        setShowCreateSub={setShowCreateSub}
        selectedOrg={selectedOrg}
        subForm={subForm}
        setSubForm={setSubForm}
        onCreateSubOrganization={createSubOrganization}
        isCreating={isCreating}
        showEdit={showEdit}
        setShowEdit={setShowEdit}
        editForm={editForm}
        setEditForm={setEditForm}
        onUpdateOrganization={updateOrganization}
        isUpdating={isUpdating}
        showCreateLocation={showCreateLocation}
        setShowCreateLocation={setShowCreateLocation}
        locationForm={locationForm}
        setLocationForm={setLocationForm}
        onCreateLocation={createLocation}
        isCreatingLocation={isCreatingLocation}
        showCreditTransfer={showCreditTransfer}
        setShowCreditTransfer={setShowCreditTransfer}
        creditTransferForm={creditTransferForm}
        setCreditTransferForm={setCreditTransferForm}
        onTransferCredits={handleTransferCreditsSubmit}
        users={users}
        locations={locations}
        hierarchy={hierarchy}
      />
    </div>
  );
}
