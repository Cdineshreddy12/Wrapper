import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useEntityScope } from '@/hooks/useSharedQueries';

// Types
interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain: string;
  adminEmail: string;
  isActive: boolean;
  isVerified: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
  entityCount: number;
  totalCredits: number;
  reservedCredits: number;
  lastActivity: string | null;
}

interface TenantListResponse {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TenantFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Tenant list hook
export const useTenantList = (filters: TenantFilters = {}) => {
  const { search, status, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: ['admin', 'tenants', 'list', { search, status, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/tenants/comprehensive?${params}`);
      if (response.data.success) {
        return response.data.data as TenantListResponse;
      }
      throw new Error('Failed to fetch tenant list');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

// Tenant details hook
export const useTenantDetails = (tenantId: string) => {
  return useQuery({
    queryKey: ['admin', 'tenants', 'details', tenantId],
    queryFn: async () => {
      const response = await api.get(`/admin/tenants/${tenantId}/details`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch tenant details');
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Update tenant status mutation
export const useUpdateTenantStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      isActive,
      reason
    }: {
      tenantId: string;
      isActive: boolean;
      reason?: string;
    }) => {
      const response = await api.patch(`/admin/tenants/${tenantId}/status`, {
        isActive,
        reason
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to update tenant status');
    },
    onSuccess: (data, variables) => {
      toast.success(`Tenant ${variables.isActive ? 'activated' : 'deactivated'} successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'tenants']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onError: (error) => {
      toast.error('Failed to update tenant status');
      console.error('Update tenant status error:', error);
    },
  });
};

// Bulk update tenant status mutation
export const useBulkUpdateTenantStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantIds,
      isActive,
      reason
    }: {
      tenantIds: string[];
      isActive: boolean;
      reason?: string;
    }) => {
      const response = await api.post('/admin/tenants/bulk/status', {
        tenantIds,
        isActive,
        reason
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to bulk update tenant status');
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.tenantIds.length} tenants ${variables.isActive ? 'activated' : 'deactivated'} successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'tenants']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onError: (error) => {
      toast.error('Failed to bulk update tenant status');
      console.error('Bulk update tenant status error:', error);
    },
  });
};

// Available organizations within current tenant for tenant admin switcher
// Uses shared useEntityScope hook to avoid duplicate API calls
export const useAvailableOrganizations = () => {
  const { data: entityScope, isLoading, error } = useEntityScope();

  // Derive organizations from entity scope data
  const organizations = useMemo(() => {
    if (!entityScope || !entityScope.entities) {
      return [];
    }

    const { entities, isUnrestricted } = entityScope;

    // Filter only organizations and format for frontend
    const orgs = entities
      .filter(entity => entity.entityType === 'organization')
      .map((entity, index) => ({
        id: entity.entityId,
        name: entity.entityName || (isUnrestricted ? `Organization ${index + 1}` : `Assigned Organization ${index + 1}`),
        subdomain: entity.entityCode || entity.entityName?.toLowerCase().replace(/\s+/g, '-') || `org-${index + 1}`,
        status: 'active' as const,
        plan: 'Organization' as const
      }));

    return orgs;
  }, [entityScope]);

  // Return useQuery-like interface for compatibility
  return {
    data: organizations,
    isLoading,
    error,
    refetch: () => {} // Entity scope refetch is handled by useEntityScope
  };
};

// Export tenant data mutation
export const useExportTenantData = () => {
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.get(`/admin/tenants/${tenantId}/export`, {
        responseType: 'blob'
      });
      return { data: response.data, tenantId };
    },
    onSuccess: ({ data, tenantId }) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tenant-${tenantId}-export.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Tenant data exported successfully');
    },
    onError: (error) => {
      toast.error('Failed to export tenant data');
      console.error('Export tenant data error:', error);
    },
  });
};
