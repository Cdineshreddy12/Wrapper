import { Container } from '@/components/common/Page';
import { OrganizationManagement } from '@/components/OrganizationManagement';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { useOrganizationHierarchy } from '@/hooks/useOrganizationHierarchy';
import { useState } from 'react';
import api from '@/lib/api';


export function OrganizationPage({
    isAdmin = false
}: {
    isAdmin?: boolean
}) {
    const { tenantId } = useOrganizationAuth()
    const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);

    const { users: employees, applications, refreshDashboard } = useDashboardData();
    const { hierarchy: rawHierarchy, loading: hierarchyLoading } = useOrganizationHierarchy(tenantId);

    // Debug applications data
    console.log('🔍 OrganizationPage - Applications data:', applications);
    console.log('🔍 OrganizationPage - Applications length:', applications?.length || 0);
    console.log('🔍 OrganizationPage - Applications type:', Array.isArray(applications) ? 'array' : typeof applications);

    // Transform raw hierarchy to Entity format expected by OrganizationHierarchyChart
    const hierarchy = rawHierarchy ? rawHierarchy.map((org: any) => ({
        entityId: org.entityId,
        entityName: org.entityName,
        entityType: org.entityType,
        organizationType: org.organizationType,
        locationType: org.locationType,
        entityLevel: org.entityLevel,
        hierarchyPath: org.hierarchyPath,
        fullHierarchyPath: org.hierarchyPath,
        parentEntityId: org.parentEntityId,
        responsiblePersonId: org.responsiblePersonId,
        responsiblePersonName: org.responsiblePersonName,
        isActive: org.isActive,
        description: org.description,
        availableCredits: org.availableCredits,
        reservedCredits: org.reservedCredits,
        address: org.address,
        children: org.children ? org.children.map((child: any) => ({
            entityId: child.entityId,
            entityName: child.entityName,
            entityType: child.entityType,
            organizationType: child.organizationType,
            locationType: child.locationType,
            entityLevel: child.entityLevel,
            hierarchyPath: child.hierarchyPath,
            fullHierarchyPath: child.hierarchyPath,
            parentEntityId: child.parentEntityId,
            responsiblePersonId: child.responsiblePersonId,
            responsiblePersonName: child.responsiblePersonName,
            isActive: child.isActive,
            description: child.description,
            availableCredits: child.availableCredits,
            reservedCredits: child.reservedCredits,
            address: child.address,
            children: child.children || [],
            createdAt: child.createdAt,
            updatedAt: child.updatedAt
        })) : [],
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
    })) : [];


    return (
        <Container>
         
            <OrganizationManagement
                employees={employees || []}
                isAdmin={isAdmin || false}
                tenantId={tenantId}
                applications={applications || []}
                makeRequest={async (endpoint: string, options?: RequestInit) => {
                    // Use enhanced api.ts for proper authentication and error handling
                    // TODO: use axios interceptors
                    try {
                        // Vite proxy handles /api routing, so just ensure proper endpoint format
                        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
                        // Axios baseURL already includes /api, so don't add it again
                        const apiPath = normalizedEndpoint;

                        // Configure request with proper headers and convert body to data for axios
                        // Build axios-compatible headers object
                        const headers: Record<string, string> = { 'X-Application': 'crm' };
                        if (options?.headers) {
                            const h: any = options.headers as any;
                            if (typeof Headers !== 'undefined' && h instanceof Headers) {
                                h.forEach((value: any, key: string) => { headers[key] = String(value); });
                            } else if (Array.isArray(h)) {
                                h.forEach(([key, value]: [string, any]) => { headers[key] = String(value); });
                            } else {
                                Object.assign(headers, h as Record<string, string>);
                            }
                        }

                        const axiosConfig: any = {
                            method: options?.method,
                            headers,
                            withCredentials: true,
                        };

                        // Convert fetch-style body to axios-style data
                        if (options?.body) {
                            try {
                                axiosConfig.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                            } catch {
                                axiosConfig.data = options.body;
                            }
                        }

                        const response = await api(apiPath, axiosConfig);
                        return response.data;
                    } catch (error: any) {
                        throw error;
                    }
                }}
                loadDashboardData={refreshDashboard}
                inviteEmployee={() => {
                    // Implement invite employee function
                }}
            />
        </Container>
    )
}
