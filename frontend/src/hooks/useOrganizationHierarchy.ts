import { useState, useEffect } from 'react';
import api from '@/lib/api';

// Types based on the hierarchy chart component
interface Entity {
  entityId: string;
  entityName: string;
  entityType: 'organization' | 'location' | 'department' | 'team';
  organizationType?: string;
  locationType?: string;
  departmentType?: string;
  teamType?: string;
  entityLevel: number;
  hierarchyPath: string;
  fullHierarchyPath: string;
  parentEntityId?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  isActive: boolean;
  description?: string;
  children: Entity[];
  availableCredits?: number;
  reservedCredits?: number;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt?: string;
  updatedAt?: string;
}


export function useOrganizationHierarchy(tenantId?: string) {
  const [hierarchy, setHierarchy] = useState<Entity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHierarchy = async (forceTenantId?: string) => {
    const targetTenantId = forceTenantId || tenantId;
    if (!targetTenantId) {
      setError('No tenant ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {

      // REAL API CALL - Now working with the correct response format
      const response = await api(`/admin/entities/hierarchy/${targetTenantId}`, {
        method: 'GET',
        headers: { 'X-Application': 'crm' }
      });


      // Extract hierarchy data from the API response
      // The response structure is: axios_response.data = api_response
      // So we need: response.data.data.hierarchy
      let hierarchyData = null;

      if (response && response.data && response.data.data && response.data.data.hierarchy && Array.isArray(response.data.data.hierarchy)) {
        hierarchyData = response.data.data.hierarchy;
      } else if (response && response.data && response.data.hierarchy && Array.isArray(response.data.hierarchy)) {
        hierarchyData = response.data.hierarchy;
      } else {
        setError('Failed to load hierarchy - unexpected response format');
        setHierarchy([]);
        return;
      }

      setHierarchy(hierarchyData);

    } catch (err: any) {
      setError(`Failed to fetch organization hierarchy: ${err?.message || 'Unknown error'}`);
      setHierarchy([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchHierarchy();
    }
  }, [tenantId]);

  return {
    hierarchy,
    loading,
    error,
    refetch: fetchHierarchy
  };
}
