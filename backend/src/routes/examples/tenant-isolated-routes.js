// Example API routes demonstrating tenant isolation with Drizzle ORM
import { eq, and, sql } from 'drizzle-orm';
import { tenantIsolationMiddleware, multiLevelIsolationMiddleware } from '../../middleware/tenant-isolation.js';
import {
  tenantUsers,
  organizations,
  customRoles,
  userRoleAssignments,
  credits,
  creditTransactions
} from '../../db/schema/index.js';

export function createTenantIsolatedRoutes(app, db) {
  // Apply tenant isolation middleware to all routes
  app.use('/api/tenant/*', tenantIsolationMiddleware(db));
  app.use('/api/multi/*', multiLevelIsolationMiddleware(db));

  // ============================================================================
  // BASIC TENANT ISOLATION EXAMPLES
  // ============================================================================

  // Get all users for the current tenant
  app.get('/api/tenant/users', async (req, res) => {
    try {
      // Using the tenant-aware query builder
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      const users = await tenantUsersQuery.findAll();

      res.json({
        success: true,
        tenant: req.tenant.subdomain,
        users: users.map(user => ({
          id: user.userId,
          email: user.email,
          isActive: user.isActive,
          isTenantAdmin: user.isTenantAdmin
        }))
      });
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get specific user (with ownership validation)
  app.get('/api/tenant/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // Validate that the user belongs to the current tenant
      const ownership = await req.tenantService.validateResourceOwnership(
        tenantUsers,
        userId,
        { tenantId: req.tenantId },
        'tenant'
      );

      if (!ownership.valid) {
        return res.status(403).json({ error: ownership.reason });
      }

      res.json({
        success: true,
        user: {
          id: ownership.resource.userId,
          email: ownership.resource.email,
          isActive: ownership.resource.isActive
        }
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Create a new user for the tenant
  app.post('/api/tenant/users', async (req, res) => {
    try {
      const { email, name, role } = req.body;

      // Check if user already exists globally
      const existingUser = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.email, email))
        .limit(1);

      if (existingUser[0]) {
        // If user exists, check if they're already in this tenant
        if (existingUser[0].tenantId === req.tenantId) {
          return res.status(400).json({ error: 'User already exists in this tenant' });
        } else {
          return res.status(400).json({ error: 'User exists in another tenant' });
        }
      }

      // Create new user for this tenant
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      const newUser = await tenantUsersQuery.create({
        email,
        name,
        isActive: true,
        isTenantAdmin: role === 'admin'
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: newUser[0]
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Get tenant's organizations
  app.get('/api/tenant/organizations', async (req, res) => {
    try {
      const tenantOrgsQuery = req.tenantQuery(organizations);
      const orgs = await tenantOrgsQuery.findAll();

      res.json({
        success: true,
        organizations: orgs.map(org => ({
          id: org.organizationId,
          name: org.organizationName,
          type: org.organizationType,
          isActive: org.isActive
        }))
      });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // ============================================================================
  // MULTI-LEVEL ISOLATION EXAMPLES
  // ============================================================================

  // Get users for a specific organization (within tenant)
  app.get('/api/multi/organizations/:orgId/users', async (req, res) => {
    try {
      const { orgId } = req.params;

      // Validate organization ownership
      const orgOwnership = await req.tenantService.validateResourceOwnership(
        organizations,
        orgId,
        req.isolationContext,
        'organization'
      );

      if (!orgOwnership.valid) {
        return res.status(403).json({ error: orgOwnership.reason });
      }

      // Get users for this organization
      const orgUsersQuery = req.isolatedQuery(tenantUsers, 'organization');
      const users = await orgUsersQuery.findAll({
        organizationId: orgId
      });

      res.json({
        success: true,
        organization: orgOwnership.resource.organizationName,
        users: users
      });
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get tenant credits with transaction history
  app.get('/api/tenant/credits', async (req, res) => {
    try {
      // Get current credit balance
      const tenantCreditsQuery = req.tenantQuery(credits);
      const creditBalance = await tenantCreditsQuery.findOne();

      // Get recent transactions
      const transactionsQuery = req.tenantQuery(creditTransactions);
      const recentTransactions = await transactionsQuery.findAll(
        sql`${creditTransactions.createdAt} > NOW() - INTERVAL '30 days'`,
        sql`${creditTransactions.createdAt} DESC`,
        10
      );

      res.json({
        success: true,
        credits: {
          balance: creditBalance[0]?.availableCredits || 0,
          total: creditBalance[0]?.totalCredits || 0,
          transactions: recentTransactions
        }
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
      res.status(500).json({ error: 'Failed to fetch credit information' });
    }
  });

  // Get tenant roles and assignments
  app.get('/api/tenant/roles', async (req, res) => {
    try {
      // Get custom roles for this tenant
      const rolesQuery = req.tenantQuery(customRoles);
      const roles = await rolesQuery.findAll();

      // Get role assignments with user details
      const assignments = await db
        .select({
          assignmentId: userRoleAssignments.id,
          userId: tenantUsers.userId,
          userEmail: tenantUsers.email,
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          assignedAt: userRoleAssignments.assignedAt
        })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(tenantUsers.tenantId, req.tenantId));

      res.json({
        success: true,
        roles: roles,
        assignments: assignments
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // ============================================================================
  // CROSS-TENANT PROTECTION EXAMPLES
  // ============================================================================

  // Attempt to access another tenant's data (should fail)
  app.get('/api/tenant/validate-isolation', async (req, res) => {
    try {
      // This should demonstrate that we can only access our tenant's data
      const allUsers = await db.select().from(tenantUsers).limit(5);
      const ourTenantUsers = await req.tenantQuery(tenantUsers).findAll();

      res.json({
        success: true,
        message: 'Isolation test completed',
        totalUsersInDb: allUsers.length,
        accessibleUsers: ourTenantUsers.length,
        tenant: req.tenant.subdomain,
        isolationWorking: ourTenantUsers.length <= allUsers.length
      });
    } catch (error) {
      console.error('Error in isolation test:', error);
      res.status(500).json({ error: 'Isolation test failed' });
    }
  });

  // ============================================================================
  // DASHBOARD DATA AGGREGATION
  // ============================================================================

  // Get tenant dashboard overview
  app.get('/api/tenant/dashboard', async (req, res) => {
    try {
      // Aggregate data from multiple tenant-scoped tables
      const [
        userCount,
        orgCount,
        creditBalance,
        activeRoles
      ] = await Promise.all([
        req.tenantQuery(tenantUsers).count({ isActive: true }),
        req.tenantQuery(organizations).count({ isActive: true }),
        req.tenantQuery(credits).findOne(),
        req.tenantQuery(customRoles).count({ isSystemRole: true })
      ]);

      res.json({
        success: true,
        dashboard: {
          tenant: {
            id: req.tenantId,
            subdomain: req.tenant.subdomain,
            name: req.tenant.companyName
          },
          stats: {
            totalUsers: userCount,
            totalOrganizations: orgCount,
            creditBalance: creditBalance[0]?.availableCredits || 0,
            activeRoles: activeRoles
          },
          recentActivity: [] // You can add recent activity here
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });
}
