import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/index.js', () => ({
  db: {},
}));

vi.mock('../routes/roles.js', () => ({
  publishRoleEventToApplications: vi.fn(),
}));

import CustomRoleService from './custom-role-service.js';

describe('custom-role-service tier module access helper', () => {
  it('returns all modules for enterprise access', async () => {
    const allModules = [{ moduleCode: 'leads' }, { moduleCode: 'contacts' }, { moduleCode: 'dashboard' }];
    const result = await CustomRoleService.getAccessibleModulesForApp('crm', 'enterprise', allModules);
    expect(result).toHaveLength(3);
  });

  it('filters modules by tier and fallback enabled modules', async () => {
    const allModules = [{ moduleCode: 'leads' }, { moduleCode: 'contacts' }, { moduleCode: 'inventory' }];

    const starter = await CustomRoleService.getAccessibleModulesForApp('crm', 'starter', allModules);
    expect(starter.some((m) => m.moduleCode === 'leads')).toBe(true);
    expect(starter.some((m) => m.moduleCode === 'inventory')).toBe(false);

    const customWithFallback = await CustomRoleService.getAccessibleModulesForApp(
      'crm',
      'custom',
      allModules,
      ['inventory'],
    );
    expect(customWithFallback).toHaveLength(1);
    expect(customWithFallback[0]?.moduleCode).toBe('inventory');
  });
});
