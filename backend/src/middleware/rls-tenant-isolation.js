// Row Level Security (RLS) based Tenant Isolation
// Uses PostgreSQL RLS policies and session variables for automatic data filtering

import postgres from 'postgres';
import { eq, and, sql } from 'drizzle-orm';

export class RLSTenantIsolationService {
  constructor(db, connectionString) {
    this.db = db;
    this.sql = postgres(connectionString);
  }

  // Set tenant context in database session
  async setTenantContext(tenantId, client = null) {
    const dbClient = client || this.sql;

    try {
      await dbClient`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
      console.log(`✅ Tenant context set: ${tenantId}`);
    } catch (error) {
      console.error('❌ Failed to set tenant context:', error);
      throw error;
    }
  }

  // Get current tenant context
  async getTenantContext(client = null) {
    const dbClient = client || this.sql;

    try {
      const result = await dbClient`SELECT current_setting('app.tenant_id', true) as tenant_id`;
      return result[0]?.tenant_id || null;
    } catch (error) {
      return null;
    }
  }

  // Clear tenant context
  async clearTenantContext(client = null) {
    const dbClient = client || this.sql;

    try {
      await dbClient`SELECT set_config('app.tenant_id', '', false)`;
      console.log('✅ Tenant context cleared');
    } catch (error) {
      console.error('❌ Failed to clear tenant context:', error);
    }
  }

  // Enable RLS on a table
  async enableRLS(tableName, client = null) {
    const dbClient = client || this.sql;

    try {
      await dbClient`ALTER TABLE ${dbClient(tableName)} ENABLE ROW LEVEL SECURITY`;
      console.log(`✅ RLS enabled on table: ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to enable RLS on ${tableName}:`, error);
    }
  }

  // Create tenant isolation policy
  async createTenantPolicy(tableName, client = null) {
    const dbClient = client || this.sql;

    const policyName = `${tableName}_tenant_isolation`;
    const policySQL = `
      CREATE POLICY ${policyName} ON ${tableName}
      FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true))
    `;

    try {
      // Drop existing policy if it exists
      await dbClient`DROP POLICY IF EXISTS ${dbClient(policyName)} ON ${dbClient(tableName)}`;

      // Create new policy
      await dbClient.unsafe(policySQL);
      console.log(`✅ Tenant policy created: ${policyName}`);
    } catch (error) {
      console.error(`❌ Failed to create policy ${policyName}:`, error);
    }
  }

  // Setup RLS for all tenant-sensitive tables
  async setupTenantRLS(client = null) {
    const dbClient = client || this.sql;

    const tenantTables = [
      'tenant_users',
      'organizations',
      'custom_roles',
      'user_role_assignments',
      'credits',
      'credit_transactions',
      'audit_logs',
      'user_sessions',
      'trial_events',
      'usage_logs',
      'usage_metrics_daily',
      'applications',
      'user_application_permissions',
      'locations',
      'organization_locations',
      'membership_invitations',
      'payments',
      'subscriptions'
    ];

    console.log('🚀 Setting up RLS for tenant tables...');

    for (const table of tenantTables) {
      try {
        await this.enableRLS(table, dbClient);
        await this.createTenantPolicy(table, dbClient);
      } catch (error) {
        console.error(`❌ Failed to setup RLS for ${table}:`, error);
      }
    }

    console.log('✅ RLS setup completed for all tenant tables');
  }

  // Execute query within tenant context
  async executeInTenantContext(tenantId, queryFn) {
    const client = await this.sql.begin();

    try {
      // Set tenant context
      await this.setTenantContext(tenantId, client);

      // Execute the query function
      const result = await queryFn(client);

      await client.commit();
      return result;

    } catch (error) {
      await client.rollback();
      throw error;
    } finally {
      // Clear tenant context
      await this.clearTenantContext(client);
      client.release();
    }
  }

  // Middleware for Express applications
  middleware() {
    return async (req, res, next) => {
      // Extract tenant from headers
      const subdomain = req.headers['x-subdomain'] || req.headers['x-tenant'];
      const tenantDomain = req.headers['x-tenant-domain'];

      if (!subdomain && !tenantDomain) {
        return res.status(400).json({
          error: 'Tenant identification missing',
          message: 'Request must include subdomain or tenant domain'
        });
      }

      try {
        // Resolve tenant
        let tenant;
        if (subdomain) {
          tenant = await this.resolveTenant(subdomain);
        } else if (tenantDomain) {
          tenant = await this.resolveTenantByDomain(tenantDomain);
        }

        if (!tenant) {
          return res.status(404).json({
            error: 'Tenant not found',
            message: `No tenant found for ${subdomain || tenantDomain}`
          });
        }

        // Set tenant context in database session
        await this.setTenantContext(tenant.id || tenant.tenantId);

        // Add tenant info to request
        req.tenant = tenant;
        req.tenantId = tenant.id || tenant.tenantId;

        // Add cleanup function to response
        const originalSend = res.send;
        res.send = function(data) {
          // Clear tenant context after response
          this.clearTenantContext().catch(console.error);
          return originalSend.call(this, data);
        }.bind(this);

        next();

      } catch (error) {
        console.error('RLS middleware error:', error);
        res.status(500).json({
          error: 'Tenant isolation failed',
          message: 'Failed to establish tenant context'
        });
      }
    };
  }

  // Resolve tenant from subdomain
  async resolveTenant(subdomain) {
    try {
      const tenant = await this.db
        .select()
        .from(this.tenantsTable)
        .where(eq(this.tenantsTable.subdomain, subdomain))
        .limit(1);

      return tenant[0] || null;
    } catch (error) {
      console.error('Error resolving tenant:', error);
      return null;
    }
  }

  // Resolve tenant from custom domain
  async resolveTenantByDomain(domain) {
    try {
      // First check custom domain field
      let tenant = await this.db
        .select()
        .from(this.tenantsTable)
        .where(eq(this.tenantsTable.customDomain, domain))
        .limit(1);

      if (tenant[0]) return tenant[0];

      // If not found, check if domain matches subdomain pattern
      const subdomainMatch = domain.match(/^(.+)\.zopkit\.com$/);
      if (subdomainMatch) {
        return this.resolveTenant(subdomainMatch[1]);
      }

      return null;
    } catch (error) {
      console.error('Error resolving tenant by domain:', error);
      return null;
    }
  }

  // Set tenants table reference (call this after db is initialized)
  setTenantsTable(tenantsTable) {
    this.tenantsTable = tenantsTable;
  }

  // Health check for RLS setup
  async healthCheck() {
    try {
      const context = await this.getTenantContext();
      return {
        rls_enabled: true,
        tenant_context: context,
        status: 'healthy'
      };
    } catch (error) {
      return {
        rls_enabled: false,
        error: error.message,
        status: 'unhealthy'
      };
    }
  }
}

// Helper function to create RLS policies for a table
export function createTenantRLSPolicy(tableName) {
  return `
    -- Enable RLS
    ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS ${tableName}_tenant_isolation ON ${tableName};

    -- Create tenant isolation policy
    CREATE POLICY ${tableName}_tenant_isolation ON ${tableName}
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

    -- Grant necessary permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON ${tableName} TO authenticated_user;
  `;
}

// Helper function to setup all tenant RLS policies
export function createAllTenantRLSPolicies() {
  const tenantTables = [
    'tenant_users',
    'organizations',
    'custom_roles',
    'user_role_assignments',
    'credits',
    'credit_transactions',
    'audit_logs',
    'user_sessions',
    'trial_events',
    'usage_logs',
    'usage_metrics_daily',
    'applications',
    'user_application_permissions',
    'locations',
    'organization_locations',
    'membership_invitations',
    'payments',
    'subscriptions'
  ];

  const policies = tenantTables.map(table => createTenantRLSPolicy(table));

  return `
    -- Setup tenant RLS policies
    ${policies.join('\n\n')}

    -- Create helper function to get current tenant
    CREATE OR REPLACE FUNCTION current_tenant_id()
    RETURNS uuid AS $$
    BEGIN
      RETURN current_setting('app.tenant_id', true)::uuid;
    EXCEPTION
      WHEN OTHERS THEN RETURN NULL;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create helper function to check tenant access
    CREATE OR REPLACE FUNCTION check_tenant_access(resource_tenant_id uuid)
    RETURNS boolean AS $$
    BEGIN
      RETURN resource_tenant_id::text = current_setting('app.tenant_id', true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
}
