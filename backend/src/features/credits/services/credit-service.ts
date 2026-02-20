/**
 * Credit Service — Facade
 *
 * Re-exports all credit functionality through the original CreditService class
 * for full backward compatibility. Actual logic lives in the split modules:
 *   - credit-core.ts           (shared helpers, operation codes, entity resolution)
 *   - credit-balance.ts        (balance reading, transaction history, reporting)
 *   - credit-operations.ts     (allocation, consumption, transfer, purchase)
 *   - credit-config-tenant.ts  (tenant-scoped credit configuration)
 *   - credit-config-global.ts  (global/admin credit configuration)
 */

import {
  ensureCreditRecord,
  findRootOrganization,
  getModulePermissions,
} from './credit-core.js';

import {
  getCurrentBalance,
  getEntityBalance,
  getTransactionHistory,
  getUsageSummary,
  getCreditStats,
} from './credit-balance.js';

import {
  initializeTenantCredits,
  purchaseCredits,
  addCreditsToEntity,
  allocateCreditsToApplication,
  recordCreditConsumption,
  consumeCredits,
  transferCredits,
  getAvailablePackages,
} from './credit-operations.js';

import {
  getTenantConfigurations,
  getTenantOperationConfigs,
  setTenantOperationConfig,
  setTenantModuleConfig,
  setTenantAppConfig,
  resetTenantConfiguration,
  bulkUpdateTenantConfigurations,
  getConfigurationTemplates,
  applyConfigurationTemplate,
  logConfigurationChange,
} from './credit-config-tenant.js';

import {
  getGlobalOperationConfigs,
  getGlobalModuleConfigs,
  getGlobalAppConfigs,
  getOperationConfig,
  getModuleConfig,
  getAppConfig,
  getAllConfigurations,
  setOperationConfig,
  getApplicationModules,
  getApplicationCreditConfigurations,
  getGlobalCreditConfigurationsByApp,
  createTenantOperationCost,
  setModuleConfig,
  setAppConfig,
} from './credit-config-global.js';

export class CreditService {
  // Core helpers
  static ensureCreditRecord = ensureCreditRecord;
  static findRootOrganization = findRootOrganization;
  static getModulePermissions = getModulePermissions;

  // Balance & reporting
  static getCurrentBalance = getCurrentBalance;
  static getEntityBalance = getEntityBalance;
  static getTransactionHistory = getTransactionHistory;
  static getUsageSummary = getUsageSummary;
  static getCreditStats = getCreditStats;

  // Operations
  static initializeTenantCredits = initializeTenantCredits;
  static purchaseCredits = purchaseCredits;
  static addCreditsToEntity = addCreditsToEntity;
  static allocateCreditsToApplication = allocateCreditsToApplication;
  static recordCreditConsumption = recordCreditConsumption;
  static consumeCredits = consumeCredits;
  static transferCredits = transferCredits;
  static getAvailablePackages = getAvailablePackages;

  // Tenant config
  static getTenantConfigurations = getTenantConfigurations;
  static getTenantOperationConfigs = getTenantOperationConfigs;
  static setTenantOperationConfig = setTenantOperationConfig;
  static setTenantModuleConfig = setTenantModuleConfig;
  static setTenantAppConfig = setTenantAppConfig;
  static resetTenantConfiguration = resetTenantConfiguration;
  static bulkUpdateTenantConfigurations = bulkUpdateTenantConfigurations;
  static getConfigurationTemplates = getConfigurationTemplates;
  static applyConfigurationTemplate = applyConfigurationTemplate;
  static logConfigurationChange = logConfigurationChange;

  // Global config
  static getGlobalOperationConfigs = getGlobalOperationConfigs;
  static getGlobalModuleConfigs = getGlobalModuleConfigs;
  static getGlobalAppConfigs = getGlobalAppConfigs;
  static getOperationConfig = getOperationConfig;
  static getModuleConfig = getModuleConfig;
  static getAppConfig = getAppConfig;
  static getAllConfigurations = getAllConfigurations;
  static setOperationConfig = setOperationConfig;
  static getApplicationModules = getApplicationModules;
  static getApplicationCreditConfigurations = getApplicationCreditConfigurations;
  static getGlobalCreditConfigurationsByApp = getGlobalCreditConfigurationsByApp;
  static createTenantOperationCost = createTenantOperationCost;
  static setModuleConfig = setModuleConfig;
  static setAppConfig = setAppConfig;
}
