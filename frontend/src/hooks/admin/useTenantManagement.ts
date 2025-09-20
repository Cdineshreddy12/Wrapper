import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';

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
