export interface BasicTenantRecord {
  tenantId: string;
  companyName: string;
  isActive: boolean;
}

export interface AppSyncRepository {
  resolveTenantId(tenantIdParam: string | undefined): Promise<string | null>;
  getBasicTenantById(tenantId: string): Promise<BasicTenantRecord | null>;
}
