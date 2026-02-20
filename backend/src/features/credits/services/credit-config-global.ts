import { db, systemDbConnection } from '../../../db/index.js';
import { creditConfigurations, applications as applicationsTable, applicationModules } from '../../../db/schema/index.js';
import { eq, and, sql, inArray, or } from 'drizzle-orm';
import { getModulePermissions } from './credit-core.js';

/**
 * Get global operation configurations
 */
export async function getGlobalOperationConfigs() {
  try {
    // Use system database connection for admin operations (bypasses RLS)
    const configs = await systemDbConnection
      .select()
      .from(creditConfigurations)
      .where(eq(creditConfigurations.isGlobal, true))
      .orderBy(creditConfigurations.operationCode);

    return configs.map(config => ({
      configId: config.configId,
      operationCode: config.operationCode,
      creditCost: parseFloat(String(config.creditCost)),
      unit: config.unit ?? null,
      unitMultiplier: parseFloat(String(config.unitMultiplier ?? 1)),
      freeAllowance: config.freeAllowance,
      freeAllowancePeriod: config.freeAllowancePeriod,
      volumeTiers: config.volumeTiers || [],
      allowOverage: config.allowOverage,
      overageLimit: config.overageLimit,
      overagePeriod: config.overagePeriod,
      overageCost: config.overageCost ? parseFloat(config.overageCost) : null,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }));
  } catch (err: unknown) {
    const error = err as Error;
    if ((error as Error & { code?: string }).code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    console.error('Error getting global operation configs:', error);
    throw error;
  }
}

/**
 * Get global module configurations
 */
export async function getGlobalModuleConfigs(): Promise<Record<string, unknown>[]> {
  try {
    const configs = await systemDbConnection
      .select()
      .from(creditConfigurations)
      .where(eq(creditConfigurations.isGlobal, true))
      .orderBy(creditConfigurations.operationCode);

    const moduleConfigs: Record<string, Record<string, unknown>> = {};
    configs.forEach(config => {
      const moduleCode = config.operationCode.split('.')[1];
      if (!moduleConfigs[moduleCode]) {
        moduleConfigs[moduleCode] = {
          moduleConfigId: config.configId,
          moduleCode,
          appCode: config.operationCode.split('.')[0],
          defaultCreditCost: parseFloat(String(config.creditCost)),
          defaultUnit: config.unit,
          maxOperationsPerPeriod: Number(config.freeAllowance) || 1000,
          periodType: config.freeAllowancePeriod || 'monthly',
          creditBudget: null,
          operationOverrides: {},
          isActive: config.isActive,
          isCustomized: false,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          operationCount: 1
        };
      } else {
        const existing = moduleConfigs[moduleCode];
        const prevCost = Number(existing.defaultCreditCost) || 0;
        existing.defaultCreditCost = (prevCost + parseFloat(String(config.creditCost))) / 2;
        existing.operationCount = (Number(existing.operationCount) || 0) + 1;
      }
    });

    return Object.values(moduleConfigs);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error getting global module configs:', error);
    return [];
  }
}

/**
 * Get global app configurations
 */
export async function getGlobalAppConfigs(): Promise<Record<string, unknown>[]> {
  try {
    const configs = await systemDbConnection
      .select()
      .from(creditConfigurations)
      .where(eq(creditConfigurations.isGlobal, true))
      .orderBy(creditConfigurations.operationCode);

    const appConfigs: Record<string, Record<string, unknown>> = {};
    configs.forEach(config => {
      const appCode = config.operationCode.split('.')[0];
      if (!appConfigs[appCode]) {
        appConfigs[appCode] = {
          appConfigId: config.configId,
          appCode,
          billingModel: 'subscription',
          defaultCreditCost: parseFloat(String(config.creditCost)),
          defaultUnit: config.unit,
          maxDailyOperations: null,
          maxMonthlyOperations: Number(config.freeAllowance) || 5000,
          creditBudget: null,
          premiumFeatures: {},
          moduleDefaults: {},
          isActive: config.isActive,
          isCustomized: false,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          operationCount: 1
        };
      } else {
        const existing = appConfigs[appCode];
        const prevCost = Number(existing.defaultCreditCost) || 0;
        existing.defaultCreditCost = (prevCost + parseFloat(String(config.creditCost))) / 2;
        existing.operationCount = (Number(existing.operationCount) || 0) + 1;
      }
    });

    return Object.values(appConfigs);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error getting global app configs:', error);
    return [];
  }
}

/**
 * Get credit configuration for an operation with inheritance (tenant-specific → global → default)
 */
export async function getOperationConfig(operationCode: string, tenantId: string | null = null): Promise<Record<string, unknown>> {
  try {
    let config = null;

    // Step 1: Try tenant-specific configuration first
    if (tenantId) {
      [config] = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.operationCode, operationCode),
          eq(creditConfigurations.tenantId, tenantId as string),
          eq(creditConfigurations.isGlobal, false)
        ))
        .limit(1);
    }

    // Step 2: If no tenant-specific config, try global configuration
    if (!config) {
      [config] = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.operationCode, operationCode),
          eq(creditConfigurations.isGlobal, true)
        ))
        .limit(1);
    }

    // Step 3: If no configuration found, return defaults
    if (!config) {
      return {
        operationCode,
        creditCost: 1.0,
        unit: 'operation',
        unitMultiplier: 1,
        freeAllowance: 0,
        allowOverage: true,
        isDefault: true,
        configSource: 'default',
        tenantId: tenantId,
        isGlobal: false
      };
    }

    const parts = config.operationCode.split('.');
    return {
      operationCode: config.operationCode,
      moduleCode: parts[1] ?? null,
      appCode: parts[0] ?? null,
      creditCost: parseFloat(String(config.creditCost)),
      unit: config.unit,
      unitMultiplier: parseFloat(String(config.unitMultiplier ?? 1)),
      freeAllowance: config.freeAllowance,
      freeAllowancePeriod: config.freeAllowancePeriod,
      volumeTiers: config.volumeTiers,
      allowOverage: config.allowOverage,
      overageLimit: config.overageLimit,
      overagePeriod: config.overagePeriod,
      overageCost: config.overageCost != null ? parseFloat(String(config.overageCost)) : null,
      isInherited: (config as Record<string, unknown>).isInherited ?? false,
      isActive: config.isActive,
      isCustomized: (config as Record<string, unknown>).isCustomized ?? false,
      priority: config.priority,
      isDefault: false,
      configSource: config.isGlobal ? 'global' : 'tenant',
      tenantId: config.tenantId,
      isGlobal: config.isGlobal
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching operation config:', error);
    throw error;
  }
}

/**
 * Get module credit configuration with inheritance (tenant-specific → global → default)
 */
export async function getModuleConfig(moduleCode: string, tenantId: string | null = null): Promise<Record<string, unknown>> {
  try {
    type ConfigRow = { configId: string; operationCode: string; creditCost: string; unit: string | null; unitMultiplier: string | null; freeAllowance: number | null; freeAllowancePeriod: string | null; volumeTiers: string | null; isActive: boolean | null; isGlobal: boolean | null; tenantId: string | null };
    let configs: ConfigRow[] = [];

    // Step 1: Try tenant-specific configurations first
    if (tenantId) {
      configs = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          sql`${creditConfigurations.operationCode} LIKE ${moduleCode + '.%'}`,
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isGlobal, false)
        ));
    }

    // Step 2: If no tenant-specific configs, try global configurations
    if (configs.length === 0) {
      configs = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          sql`${creditConfigurations.operationCode} LIKE ${moduleCode + '.%'}`,
          eq(creditConfigurations.isGlobal, true)
        ));
    }

    // Step 3: If no configurations found, return defaults
    if (configs.length === 0) {
      return {
        moduleCode,
        appCode: null as string | null,
        defaultCreditCost: 1.0,
        defaultUnit: 'operation',
        maxOperationsPerPeriod: null,
        periodType: 'month',
        creditBudget: null,
        operationOverrides: {},
        isActive: true,
        isCustomized: false,
        isDefault: true,
        configSource: 'default',
        tenantId: tenantId,
        isGlobal: false,
        operationCount: 0
      };
    }

    // Aggregate the operation configs into module-level config
    const avgCost = configs.reduce((sum, config) => sum + parseFloat(String(config.creditCost)), 0) / configs.length;
    const totalAllowance = configs.reduce((sum, config) => sum + Number(config.freeAllowance ?? 0), 0);

    return {
      moduleConfigId: configs[0].configId,
      moduleCode,
      appCode: configs[0].operationCode.split('.')[0],
      defaultCreditCost: avgCost,
      defaultUnit: configs[0].unit,
      maxOperationsPerPeriod: totalAllowance || 1000,
      periodType: configs[0].freeAllowancePeriod || 'monthly',
      creditBudget: null,
      operationOverrides: {},
      isActive: configs[0].isActive,
      isCustomized: !configs[0].isGlobal,
      isDefault: false,
      configSource: configs[0].isGlobal ? 'global' : 'tenant',
      tenantId: tenantId,
      isGlobal: configs[0].isGlobal,
      operationCount: configs.length
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching module config:', error);
    throw error;
  }
}

/**
 * Get application credit configuration with inheritance (tenant-specific → global → default)
 */
export async function getAppConfig(appCode: string, tenantId: string | null = null): Promise<Record<string, unknown>> {
  try {
    type ConfigRow = { configId: string; operationCode: string; creditCost: string; unit: string | null; unitMultiplier: string | null; freeAllowance: number | null; freeAllowancePeriod: string | null; isActive: boolean | null; isGlobal: boolean | null };
    let configs: ConfigRow[] = [];

    // Step 1: Try tenant-specific configurations first
    if (tenantId) {
      configs = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          sql`${creditConfigurations.operationCode} LIKE ${appCode + '.%'}`,
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isGlobal, false)
        ));
    }

    // Step 2: If no tenant-specific configs, try global configurations
    if (configs.length === 0) {
      configs = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          sql`${creditConfigurations.operationCode} LIKE ${appCode + '.%'}`,
          eq(creditConfigurations.isGlobal, true)
        ));
    }

    // Step 3: If no configurations found, return defaults
    if (configs.length === 0) {
      return {
        appCode,
        billingModel: 'bulk_then_per_usage',
        defaultCreditCost: 1.0,
        defaultUnit: 'operation',
        maxDailyOperations: null,
        maxMonthlyOperations: null,
        creditBudget: null,
        premiumFeatures: {},
        moduleDefaults: {},
        isActive: true,
        isCustomized: false,
        isDefault: true,
        configSource: 'default',
        tenantId: tenantId,
        isGlobal: false,
        operationCount: 0
      };
    }

    // Aggregate the operation configs into app-level config
    const avgCost = configs.reduce((sum, config) => sum + parseFloat(String(config.creditCost)), 0) / configs.length;
    const totalAllowance = configs.reduce((sum, config) => sum + Number(config.freeAllowance ?? 0), 0);

    return {
      appConfigId: configs[0].configId,
      appCode,
      billingModel: 'bulk_then_per_usage',
      defaultCreditCost: avgCost,
      defaultUnit: configs[0].unit,
      maxDailyOperations: null,
      maxMonthlyOperations: totalAllowance || 5000,
      creditBudget: null,
      premiumFeatures: {},
      moduleDefaults: {},
      isActive: configs[0].isActive,
      isCustomized: !configs[0].isGlobal,
      isDefault: false,
      configSource: configs[0].isGlobal ? 'global' : 'tenant',
      tenantId: tenantId,
      isGlobal: configs[0].isGlobal,
      operationCount: configs.length
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching app config:', error);
    throw error;
  }
}

/**
 * Get all global credit configurations (company-maintained)
 */
export async function getAllConfigurations(filters: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  try {
    const { isActive = true } = filters as { isActive?: boolean };

    type OpItem = Record<string, unknown>;
    const results: { operations: OpItem[]; modules: OpItem[]; applications: OpItem[] } = {
      operations: [],
      modules: [],
      applications: []
    };

    const opConditions = isActive !== undefined ? [eq(creditConfigurations.isActive, isActive)] : [];
    const operations = await db
      .select()
      .from(creditConfigurations)
      .where(opConditions.length > 0 ? and(...opConditions) : sql`1=1`)
      .orderBy(creditConfigurations.operationCode);
    results.operations = operations.map(config => {
      const parts = config.operationCode.split('.');
      return {
        configId: config.configId,
        operationCode: config.operationCode,
        moduleCode: parts[1] ?? null,
        appCode: parts[0] ?? null,
        creditCost: parseFloat(String(config.creditCost)),
        unit: config.unit,
        unitMultiplier: parseFloat(String(config.unitMultiplier ?? 1)),
        freeAllowance: config.freeAllowance,
        freeAllowancePeriod: config.freeAllowancePeriod,
        volumeTiers: config.volumeTiers,
        allowOverage: config.allowOverage,
        overageLimit: config.overageLimit,
        overagePeriod: config.overagePeriod,
        overageCost: config.overageCost ? parseFloat(String(config.overageCost)) : null,
        isInherited: (config as Record<string, unknown>).isInherited ?? false,
        isActive: config.isActive,
        isCustomized: (config as Record<string, unknown>).isCustomized ?? false,
        priority: config.priority
      };
    });

    // Get all module configurations (aggregated from operation-level configs)
    type ConfigRow = typeof creditConfigurations.$inferSelect;
    const moduleConfigs = await db
      .select()
      .from(creditConfigurations)
      .where(and(
        eq(creditConfigurations.isGlobal, true),
        ...(isActive !== undefined ? [eq(creditConfigurations.isActive, isActive)] : [])
      ));

    const moduleGroups: Record<string, ConfigRow[]> = {};
    moduleConfigs.forEach(config => {
      const moduleCode = config.operationCode.split('.')[1];
      if (!moduleGroups[moduleCode]) {
        moduleGroups[moduleCode] = [];
      }
      moduleGroups[moduleCode].push(config);
    });

    results.modules = Object.entries(moduleGroups).map(([, configs]) => {
      const avgCost = configs.reduce((sum, config) => sum + parseFloat(String(config.creditCost)), 0) / configs.length;
      const totalAllowance = configs.reduce((sum, config) => sum + Number(config.freeAllowance ?? 0), 0);
      return {
        moduleConfigId: configs[0].configId,
        moduleCode: configs[0].operationCode.split('.')[1],
        appCode: configs[0].operationCode.split('.')[0],
        defaultCreditCost: avgCost,
        defaultUnit: configs[0].unit,
        maxOperationsPerPeriod: totalAllowance || 1000,
        periodType: configs[0].freeAllowancePeriod || 'monthly',
        creditBudget: null,
        operationOverrides: {},
        isActive: configs[0].isActive,
        isCustomized: false,
        operationCount: configs.length
      };
    });

    const appConfigs = await db
      .select()
      .from(creditConfigurations)
      .where(and(
        eq(creditConfigurations.isGlobal, true),
        ...(isActive !== undefined ? [eq(creditConfigurations.isActive, isActive)] : [])
      ));

    const appGroups: Record<string, ConfigRow[]> = {};
    appConfigs.forEach(config => {
      const appCode = config.operationCode.split('.')[0];
      if (!appGroups[appCode]) {
        appGroups[appCode] = [];
      }
      appGroups[appCode].push(config);
    });

    results.applications = Object.entries(appGroups).map(([appCode, configs]) => {
      const avgCost = configs.reduce((sum, config) => sum + parseFloat(String(config.creditCost)), 0) / configs.length;
      const totalAllowance = configs.reduce((sum, config) => sum + Number(config.freeAllowance ?? 0), 0);
      return {
        appConfigId: configs[0].configId,
        appCode,
        billingModel: 'bulk_then_per_usage',
        defaultCreditCost: avgCost,
        defaultUnit: configs[0].unit,
        maxDailyOperations: null,
        maxMonthlyOperations: totalAllowance || 5000,
        creditBudget: null,
        premiumFeatures: {},
        moduleDefaults: {},
        isActive: configs[0].isActive,
        isCustomized: false,
        operationCount: configs.length
      };
    });

    return results;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching all configurations:', error);
    throw error;
  }
}

/**
 * Create or update operation configuration (global or tenant-specific, company admin only)
 */
export async function setOperationConfig(operationCode: string, configData: Record<string, unknown>, adminUserId: string, tenantId: string | null = null): Promise<Record<string, unknown>> {
  try {
    // Determine if this is a global or tenant-specific configuration
    const isGlobal = tenantId === null;

    const existing = await db
      .select()
      .from(creditConfigurations)
      .where(and(
        eq(creditConfigurations.operationCode, operationCode),
        tenantId ? eq(creditConfigurations.tenantId, tenantId) : sql`${creditConfigurations.tenantId} IS NULL`
      ))
      .limit(1);

    const configPayload: Record<string, unknown> = {
      operationCode,
      tenantId: tenantId,
      moduleCode: configData.moduleCode ?? null,
      appCode: configData.appCode ?? null,
      creditCost: String(configData.creditCost ?? 1),
      unit: (configData.unit as string) ?? 'operation',
      unitMultiplier: String(configData.unitMultiplier ?? 1),
      freeAllowance: Number(configData.freeAllowance ?? 0),
      freeAllowancePeriod: (configData.freeAllowancePeriod as string) ?? 'month',
      volumeTiers: Array.isArray(configData.volumeTiers) ? configData.volumeTiers : [],
      allowOverage: configData.allowOverage !== undefined ? Boolean(configData.allowOverage) : true,
      overageLimit: configData.overageLimit ?? null,
      overagePeriod: (configData.overagePeriod as string) ?? 'day',
      overageCost: configData.overageCost != null ? String(configData.overageCost) : null,
      isInherited: Boolean(configData.isInherited),
      isGlobal: isGlobal,
      isActive: configData.isActive !== undefined ? Boolean(configData.isActive) : true,
      isCustomized: true,
      priority: Number(configData.priority ?? 0),
      updatedBy: adminUserId,
      updatedAt: new Date()
    };

    let result: Record<string, unknown>;
    if (existing.length > 0) {
      [result] = await db
        .update(creditConfigurations)
        .set(configPayload as any)
        .where(eq(creditConfigurations.configId, existing[0].configId))
        .returning();
    } else {
      [result] = await db
        .insert(creditConfigurations)
        .values({ ...configPayload, createdBy: adminUserId, createdAt: new Date() } as any)
        .returning();
    }

    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error setting operation config:', error);
    throw error;
  }
}

/**
 * Get application modules and their permissions from database
 */
export async function getApplicationModules() {
  try {
    const modules = await db
      .select({
        moduleId: applicationModules.moduleId,
        moduleCode: applicationModules.moduleCode,
        moduleName: applicationModules.moduleName,
        appCode: applicationsTable.appCode,
        appName: applicationsTable.appName,
        permissions: applicationModules.permissions,
        isCore: applicationModules.isCore
      })
      .from(applicationModules)
      .leftJoin(applicationsTable, eq(applicationModules.appId, applicationsTable.appId))
      .where(eq(applicationsTable.status, 'active'));

    return modules;
  } catch (error) {
    console.error('Error fetching application modules:', error);
    return [];
  }
}

/**
 * Get all application credit configurations (global)
 */
export async function getApplicationCreditConfigurations() {
  try {
    console.log('📊 Getting application credit configurations');

    // Get all applications
    const applications = await db
      .select({
        appId: applicationsTable.appId,
        appCode: applicationsTable.appCode,
        appName: applicationsTable.appName,
        description: applicationsTable.description
      })
      .from(applicationsTable)
      .where(eq(applicationsTable.status, 'active'));

    // Get modules for each application with credit configurations
    const applicationsWithConfigs = await Promise.all(
      applications.map(async (app) => {
        // Get modules for this application
        const modules = await db
          .select({
            moduleId: applicationModules.moduleId,
            moduleCode: applicationModules.moduleCode,
            moduleName: applicationModules.moduleName,
            isCore: applicationModules.isCore
          })
          .from(applicationModules)
          .where(eq(applicationModules.appId, app.appId));

        // Get credit configurations for this application's modules
        const moduleConfigs = await Promise.all(
          modules.map(async (module) => {
            // Get operation codes for this module
            const operationCodes = await getModulePermissions(module.moduleCode);

            // Get credit configurations for these operations
            const configs = await db
              .select({
                operationCode: creditConfigurations.operationCode,
                creditCost: creditConfigurations.creditCost,
                unit: creditConfigurations.unit,
                unitMultiplier: creditConfigurations.unitMultiplier,
                isGlobal: creditConfigurations.isGlobal,
                isActive: creditConfigurations.isActive
              })
              .from(creditConfigurations)
              .where(and(
                inArray(creditConfigurations.operationCode, operationCodes),
                eq(creditConfigurations.isGlobal, true), // Only global configs for this endpoint
                eq(creditConfigurations.isActive, true)
              ));

            // Calculate average cost for the module
            const avgCost = configs.length > 0
              ? configs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / configs.length
              : 0;

            return {
              moduleId: module.moduleId,
              moduleCode: module.moduleCode,
              moduleName: module.moduleName,
              isCore: module.isCore,
              operationCount: operationCodes.length,
              configuredOperations: configs.length,
              averageCreditCost: avgCost,
              creditConfigurations: configs
            };
          })
        );

        // Calculate app-level statistics
        const totalOperations = moduleConfigs.reduce((sum, mod) => sum + mod.operationCount, 0);
        const configuredOperations = moduleConfigs.reduce((sum, mod) => sum + mod.configuredOperations, 0);
        const avgCreditCost = moduleConfigs.length > 0
          ? moduleConfigs.reduce((sum, mod) => sum + mod.averageCreditCost, 0) / moduleConfigs.length
          : 0;

        return {
          appId: app.appId,
          appCode: app.appCode,
          appName: app.appName,
          description: app.description,
          defaultCreditCost: avgCreditCost,
          defaultUnit: 'operation',
          totalModules: modules.length,
          totalOperations: totalOperations,
          configuredOperations: configuredOperations,
          modules: moduleConfigs
        };
      })
    );

    return applicationsWithConfigs;
  } catch (error) {
    console.error('Error getting application credit configurations:', error);
    throw error;
  }
}

/**
 * Get global credit configurations filtered by application code or name
 * @param appIdentifier - Application code (e.g., 'crm') or name (e.g., 'B2B CRM'). If null, returns all apps.
 * @returns Global credit configurations for the specified application(s)
 */
export async function getGlobalCreditConfigurationsByApp(appIdentifier: string | null = null) {
  try {
    console.log('🔍 Getting global credit configurations for app:', appIdentifier || 'ALL');

    // Build query for applications
    const appCondition = appIdentifier
      ? and(
          eq(applicationsTable.status, 'active'),
          or(
            eq(applicationsTable.appCode, appIdentifier),
            eq(applicationsTable.appName, appIdentifier)
          )
        )
      : eq(applicationsTable.status, 'active');

    const applications = await db
      .select({
        appId: applicationsTable.appId,
        appCode: applicationsTable.appCode,
        appName: applicationsTable.appName,
        description: applicationsTable.description
      })
      .from(applicationsTable)
      .where(appCondition);

    if (applications.length === 0) {
      return {
        success: false,
        message: appIdentifier
          ? `No application found with code or name: ${appIdentifier}`
          : 'No active applications found',
        data: null
      };
    }

    // Get configurations for each application
    const configurationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        // Get all global credit configurations for this app
        const globalConfigs = await systemDbConnection
          .select({
            configId: creditConfigurations.configId,
            operationCode: creditConfigurations.operationCode,
            creditCost: creditConfigurations.creditCost,
            unit: creditConfigurations.unit,
            unitMultiplier: creditConfigurations.unitMultiplier,
            freeAllowance: creditConfigurations.freeAllowance,
            freeAllowancePeriod: creditConfigurations.freeAllowancePeriod,
            volumeTiers: creditConfigurations.volumeTiers,
            allowOverage: creditConfigurations.allowOverage,
            overageLimit: creditConfigurations.overageLimit,
            overagePeriod: creditConfigurations.overagePeriod,
            overageCost: creditConfigurations.overageCost,
            isActive: creditConfigurations.isActive,
            createdAt: creditConfigurations.createdAt,
            updatedAt: creditConfigurations.updatedAt
          })
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.isGlobal, true),
            eq(creditConfigurations.isActive, true),
            sql`${creditConfigurations.operationCode} LIKE ${app.appCode + '.%'}`
          ))
          .orderBy(creditConfigurations.operationCode);

        // Group configurations by module
        type ModuleGroup = { moduleCode: string; moduleName: string; operations: Record<string, unknown>[] };
        const moduleGroups: Record<string, ModuleGroup> = {};
        globalConfigs.forEach(config => {
          const parts = config.operationCode.split('.');
          const moduleCode = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : 'unknown';

          if (!moduleGroups[moduleCode]) {
            moduleGroups[moduleCode] = {
              moduleCode,
              moduleName: parts[1] || 'unknown',
              operations: []
            };
          }

          moduleGroups[moduleCode].operations.push({
            operationCode: config.operationCode,
            operationName: parts.slice(2).join('.') || 'unknown',
            creditCost: parseFloat(String(config.creditCost)),
            unit: config.unit,
            unitMultiplier: parseFloat(String(config.unitMultiplier ?? 1)),
            freeAllowance: config.freeAllowance,
            freeAllowancePeriod: config.freeAllowancePeriod,
            volumeTiers: config.volumeTiers ?? [],
            allowOverage: config.allowOverage,
            overageLimit: config.overageLimit,
            overagePeriod: config.overagePeriod,
            overageCost: config.overageCost != null ? parseFloat(String(config.overageCost)) : null,
            isActive: config.isActive
          });
        });

        // Calculate statistics
        const modules = Object.values(moduleGroups);
        const totalOperations = globalConfigs.length;
        const avgCreditCost = totalOperations > 0
          ? globalConfigs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / totalOperations
          : 0;

        return {
          appId: app.appId,
          appCode: app.appCode,
          appName: app.appName,
          description: app.description ?? null,
          statistics: {
            totalModules: modules.length,
            totalOperations,
            averageCreditCost: parseFloat(avgCreditCost.toFixed(2))
          },
          modules,
          allOperations: globalConfigs.map(config => ({
            operationCode: config.operationCode,
            creditCost: parseFloat(config.creditCost),
            unit: config.unit,
            isActive: config.isActive
          }))
        };
      })
    );

    return {
      success: true,
      message: appIdentifier
        ? `Global configurations for ${appIdentifier}`
        : `Global configurations for all applications`,
      data: {
        requestedApp: appIdentifier,
        applicationsCount: configurationsWithDetails.length,
        applications: configurationsWithDetails
      }
    };
  } catch (error) {
    console.error('Error getting global credit configurations by app:', error);
    throw error;
  }
}

/**
 * Create tenant-specific operation cost configuration
 */
export async function createTenantOperationCost(tenantId: string, configData: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
  try {
    console.log('⚙️ Creating tenant-specific operation cost:', { tenantId, operationCode: configData.operationCode });

    const {
      operationCode,
      operationName,
      creditCost,
      unit = 'operation',
      unitMultiplier = 1,
      category,
      freeAllowance,
      freeAllowancePeriod,
      volumeTiers,
      allowOverage,
      overageLimit,
      overagePeriod,
      overageCost,
      scope = 'tenant',
      priority = 100,
      isActive = true
    } = configData as Record<string, unknown>;
    const unitMult = Number(unitMultiplier) ?? 1;

    // Validate operation code format
    if (!operationCode || typeof operationCode !== 'string') {
      throw new Error('Invalid operation code: must be a non-empty string');
    }

    if (!operationCode.includes('.') || (operationCode as string).split('.').length < 3) {
      throw new Error('Invalid operation code format: must be in format "app.module.operation" (e.g., "crm.leads.create")');
    }

    // Validate credit cost
    if (typeof creditCost !== 'number' || (creditCost as number) < 0) {
      throw new Error('Invalid credit cost: must be a positive number');
    }

    // Check if tenant-specific configuration already exists for this operation
    const existing = await db
      .select()
      .from(creditConfigurations)
      .where(and(
        eq(creditConfigurations.operationCode, operationCode as string),
        eq(creditConfigurations.tenantId, tenantId),
        eq(creditConfigurations.isGlobal, false)
      ))
      .limit(1);

    // If configuration exists, update it instead of throwing error
    if (existing.length > 0) {
      console.log('⚙️ Updating existing tenant-specific operation cost configuration');

      const updateData: Record<string, unknown> = {
        creditCost: (creditCost as number).toString(),
        unit,
        unitMultiplier: String(unitMult),
        isActive,
        updatedBy: userId,
        updatedAt: new Date()
      };

      if (configData.operationName !== undefined) updateData.operationName = configData.operationName;
      if (configData.category !== undefined) updateData.category = configData.category;
      if (configData.freeAllowance !== undefined) updateData.freeAllowance = configData.freeAllowance;
      if (configData.freeAllowancePeriod !== undefined) updateData.freeAllowancePeriod = configData.freeAllowancePeriod;
      if (configData.volumeTiers !== undefined) updateData.volumeTiers = JSON.stringify(configData.volumeTiers);
      if (configData.allowOverage !== undefined) updateData.allowOverage = configData.allowOverage;
      if (configData.overageLimit !== undefined) updateData.overageLimit = configData.overageLimit;
      if (configData.overagePeriod !== undefined) updateData.overagePeriod = configData.overagePeriod;
      if (configData.overageCost !== undefined) updateData.overageCost = String(configData.overageCost);
      if (configData.scope !== undefined) updateData.scope = configData.scope;
      if (configData.priority !== undefined) updateData.priority = configData.priority;

      await db
        .update(creditConfigurations)
        .set(updateData as any)
        .where(eq(creditConfigurations.configId, existing[0].configId));

      console.log('✅ Updated tenant-specific operation cost configuration');
      return { success: true, message: 'Tenant operation cost configuration updated successfully', configId: existing[0].configId };
    }

    // Validate user exists
    const { tenantUsers } = await import('../../../db/schema/index.js');
    const userExists = await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .limit(1);

    if (userExists.length === 0) {
      throw new Error('Invalid user ID');
    }

    // Create tenant-specific configuration
    const insertData: Record<string, unknown> = {
      operationCode,
      tenantId,
      isGlobal: false,
      creditCost: (creditCost as number).toString(),
      unit,
      unitMultiplier: String(unitMult),
      isActive,
      scope,
      priority,
      createdBy: userId,
      updatedBy: userId
    };

    if (operationName !== undefined) insertData.operationName = operationName;
    if (category !== undefined) insertData.category = category;
    if (freeAllowance !== undefined) insertData.freeAllowance = freeAllowance;
    if (freeAllowancePeriod !== undefined) insertData.freeAllowancePeriod = freeAllowancePeriod;
    if (volumeTiers !== undefined) insertData.volumeTiers = JSON.stringify(volumeTiers);
    if (allowOverage !== undefined) insertData.allowOverage = allowOverage;
    if (overageLimit !== undefined) insertData.overageLimit = overageLimit;
    if (overagePeriod !== undefined) insertData.overagePeriod = overagePeriod;
    if (overageCost !== undefined) insertData.overageCost = String(overageCost);

    console.log('📝 Inserting tenant configuration data:', insertData);

    const newConfig = await db
      .insert(creditConfigurations)
      .values(insertData as any)
      .returning();

    console.log('✅ Tenant-specific operation cost created:', newConfig[0]);

    return {
      success: true,
      config: newConfig[0] as Record<string, unknown>,
      action: 'created'
    };
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error('❌ Error creating tenant operation cost:', error);

    if (error.code === '23505') {
      console.warn('⚠️ Unexpected unique constraint violation in createTenantOperationCost:', error);
      throw new Error('Tenant operation cost configuration already exists. Please try updating instead.');
    } else if (error.code === '23503') {
      throw new Error('Invalid tenant ID or user ID');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to create tenant operation cost');
    }
  }
}

/**
 * Create or update module configuration (global or tenant-specific, company admin only)
 */
export async function setModuleConfig(moduleCode: string, configData: Record<string, unknown>, adminUserId: string, tenantId: string | null = null): Promise<unknown[]> {
  try {
    console.log('⚙️ Setting module config:', { moduleCode, tenantId });

    // Get real permissions from the application modules table
    const moduleOperations = await getModulePermissions(moduleCode);

    const isGlobal = tenantId === null;
    const results = [];

    // Create or update configurations for each operation in the module
    for (const operationCode of moduleOperations) {
      try {
        const existing = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, operationCode),
            tenantId ? eq(creditConfigurations.tenantId, tenantId) : eq(creditConfigurations.isGlobal, true)
          ));

        const configPayload: Record<string, unknown> = {
          operationCode,
          tenantId: tenantId,
          isGlobal: isGlobal,
          creditCost: configData.defaultCreditCost != null ? String(configData.defaultCreditCost) : '1.0',
          unit: (configData.defaultUnit as string) ?? 'operation',
          unitMultiplier: '1',
          freeAllowance: configData.maxOperationsPerPeriod != null ? String(configData.maxOperationsPerPeriod) : '1000',
          freeAllowancePeriod: (configData.periodType as string) ?? 'monthly',
          volumeTiers: [],
          allowOverage: true,
          overageLimit: null,
          overagePeriod: null,
          overageCost: null,
          isActive: configData.isActive ?? true,
          updatedBy: adminUserId,
          updatedAt: new Date()
        };

        let result: { configId: string }[];
        if (existing.length > 0) {
          result = await db
            .update(creditConfigurations)
            .set(configPayload as any)
            .where(eq(creditConfigurations.configId, existing[0].configId))
            .returning();
        } else {
          (configPayload as Record<string, unknown>).createdBy = adminUserId;
          (configPayload as Record<string, unknown>).createdAt = new Date();
          result = await db
            .insert(creditConfigurations)
            .values(configPayload as any)
            .returning();
        }

        results.push(result[0]);
      } catch (opErr: unknown) {
        const opError = opErr as Error;
        console.warn(`Failed to set config for operation ${operationCode}:`, opError);
      }
    }

    console.log('✅ Module config set successfully for', results.length, 'operations');
    return results;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error setting module config:', error);
    throw error;
  }
}

/**
 * Create or update application configuration (global or tenant-specific, company admin only)
 */
export async function setAppConfig(appCode: string, configData: Record<string, unknown>, adminUserId: string, tenantId: string | null = null): Promise<unknown[]> {
  try {
    console.log('⚙️ Setting app config:', { appCode, tenantId });

    // Create system-level operations for the app
    const appOperations = [
      `${appCode}.system.access`,
      `${appCode}.system.admin`,
      `${appCode}.system.configure`,
      `${appCode}.system.integrate`,
      `${appCode}.system.report`,
      `${appCode}.system.export`
    ];

    const isGlobal = tenantId === null;
    const results = [];

    // Create or update configurations for each operation in the app
    for (const operationCode of appOperations) {
      try {
        const existing = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, operationCode),
            tenantId ? eq(creditConfigurations.tenantId, tenantId) : eq(creditConfigurations.isGlobal, true)
          ));

        const configPayload: Record<string, unknown> = {
          operationCode,
          tenantId: tenantId,
          isGlobal: isGlobal,
          creditCost: configData.defaultCreditCost != null ? String(configData.defaultCreditCost) : '2.0',
          unit: (configData.defaultUnit as string) ?? 'operation',
          unitMultiplier: '1',
          freeAllowance: configData.maxMonthlyOperations != null ? String(configData.maxMonthlyOperations) : '5000',
          freeAllowancePeriod: 'monthly',
          volumeTiers: [],
          allowOverage: true,
          overageLimit: configData.maxMonthlyOperations != null ? String(Number(configData.maxMonthlyOperations) * 2) : null,
          overagePeriod: 'monthly',
          overageCost: (parseFloat(String(configData.defaultCreditCost ?? '2.0')) * 1.5).toString(),
          isActive: configData.isActive ?? true,
          updatedBy: adminUserId,
          updatedAt: new Date()
        };

        let result: { configId: string }[];
        if (existing.length > 0) {
          result = await db
            .update(creditConfigurations)
            .set(configPayload as any)
            .where(eq(creditConfigurations.configId, existing[0].configId))
            .returning();
        } else {
          (configPayload as Record<string, unknown>).createdBy = adminUserId;
          (configPayload as Record<string, unknown>).createdAt = new Date();
          result = await db
            .insert(creditConfigurations)
            .values(configPayload as any)
            .returning();
        }

        results.push(result[0]);
      } catch (opErr: unknown) {
        const opError = opErr as Error;
        console.warn(`Failed to set config for operation ${operationCode}:`, opError);
      }
    }

    console.log('✅ App config set successfully for', results.length, 'operations');
    return results;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error setting app config:', error);
    throw error;
  }
}
