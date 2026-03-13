import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestDb,
  seedOrganization,
  seedTenant,
  seedUser,
  type TestDb,
} from '../../../db/test-helpers/seed.js';
import OrganizationService from './organization-service.js';
import LocationService from './location-service.js';

let db: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  db = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('organization and location services integration', () => {
  it('creates and reads a top-level organization', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const created = await OrganizationService.createSubOrganization(
      {
        name: 'Primary Org',
        tenantId: tenant.tenantId,
      },
      user.userId,
    );

    expect(created.success).toBe(true);
    expect(created.organization.tenantId).toBe(tenant.tenantId);
    expect(created.organization.entityType).toBe('organization');

    const details = await OrganizationService.getOrganizationDetails(created.organization.entityId);
    expect(details.success).toBe(true);
    expect(details.organization.entityName).toBe('Primary Org');
  });

  it('creates and retrieves locations under an organization', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const parentOrg = await seedOrganization(db, tenant.tenantId, { entityName: 'Ops Org' });

    const created = await LocationService.createLocation(
      {
        name: 'Hyderabad HQ',
        organizationId: parentOrg.entityId,
        address: 'Road 1',
        city: 'Hyderabad',
        state: 'TS',
        zipCode: '500001',
        country: 'IN',
      },
      user.userId,
    );

    expect(created.success).toBe(true);
    expect(created.location.entityType).toBe('location');
    expect(created.location.entityName).toBe('Hyderabad HQ');

    const locations = await LocationService.getLocationsByOrganization(parentOrg.entityId);
    expect(locations.success).toBe(true);
    expect(locations.locations.length).toBe(1);
    expect(locations.locations[0]?.entityName).toBe('Hyderabad HQ');
  });
});
