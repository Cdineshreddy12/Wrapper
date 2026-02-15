import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/common/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AnimatedLoader from '@/components/common/AnimatedLoader';
import { AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function TenantDetailsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  // Fetch tenant details (backend route is GET /admin/tenants/:tenantId/details)
  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['admin', 'tenant', tenantId],
    queryFn: async () => {
      const response = await api.get(`/admin/tenants/${tenantId}/details`);
      return response.data.data;
    },
    enabled: !!tenantId
  });

  const getStatusBadge = (tenant: any) => {
    const status = tenant?.status || 'unknown';
    const variants: Record<string, any> = {
      active: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      inactive: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' },
      suspended: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' }
    };
    const badgeProps = variants[status] || variants.inactive;
    return <Badge {...badgeProps}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <AnimatedLoader size="md" />
        </div>
      </Container>
    );
  }

  if (!tenantData) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-gray-400" />
          <h2 className="text-xl font-semibold">Tenant Not Found</h2>
          <p className="text-gray-600">The tenant you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/company-admin')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </Container>
    );
  }

  const selectedTenant = tenantData;

  return (
    <Container>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/company-admin')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{selectedTenant?.tenant?.companyName} Details</h1>
            <p className="text-gray-600">Comprehensive information about this tenant</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Company:</span>
                <span>{selectedTenant.tenant?.companyName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Subdomain:</span>
                <span>{selectedTenant.tenant?.subdomain || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                {selectedTenant.tenant ? getStatusBadge(selectedTenant.tenant) : <Badge variant="secondary">Unknown</Badge>}
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Created:</span>
                <span>{selectedTenant.tenant?.createdAt ? new Date(selectedTenant.tenant.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entity Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Entities:</span>
                <span>{selectedTenant.entitySummary?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Organizations:</span>
                <span>{selectedTenant.entitySummary?.organizations || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Locations:</span>
                <span>{selectedTenant.entitySummary?.locations || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Active:</span>
                <span>{selectedTenant.entitySummary?.active || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credit Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{(Number(selectedTenant.creditSummary?.totalCredits) || 0).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{(Number(selectedTenant.creditSummary?.reservedCredits) || 0).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Reserved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedTenant.creditSummary?.activeEntities || 0}</div>
                <div className="text-sm text-muted-foreground">Active Entities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{(Number(selectedTenant.creditSummary?.averageCredits) || 0).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Avg per Entity</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
