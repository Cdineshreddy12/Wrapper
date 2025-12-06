/**
 * 🚀 **ONBOARDING VALIDATION SERVICE**
 * Handles validation checks during onboarding process
 * Ensures no duplicate emails or other conflicts exist
 */

import { systemDbConnection } from '../db/index.js';
import { tenants, tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

class OnboardingValidationService {

  /**
   * Check for duplicate emails during onboarding
   * @param {Object} data - Validation data
   * @param {string} data.adminEmail - Admin email to check
   * @throws {Error} If duplicate email is found
   */
  static async checkForDuplicates(data) {
    const { adminEmail } = data;

    if (!adminEmail) {
      throw new Error('Email is required for duplicate checking');
    }

    console.log('🔍 Checking for duplicate email:', adminEmail);

    // Check if email already exists as adminEmail in tenants table
    const existingTenant = await systemDbConnection
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.adminEmail, adminEmail))
      .limit(1);

    if (existingTenant.length > 0) {
      console.log('❌ Duplicate email found in tenants table:', adminEmail);
      throw new Error('This email is already associated with an organization');
    }

    // Also check if email exists in tenantUsers table (as a user)
    // This prevents using an email that's already a user in another tenant
    const existingUser = await systemDbConnection
      .select({ userId: tenantUsers.userId, tenantId: tenantUsers.tenantId })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('❌ Duplicate email found in tenantUsers table:', adminEmail);
      throw new Error('This email is already registered as a user');
    }

    console.log('✅ No duplicates found for email:', adminEmail);
    return { available: true };
  }

  /**
   * Check if subdomain is available
   * @param {string} subdomain - Subdomain to check
   * @returns {boolean} True if available, false otherwise
   */
  static async checkSubdomainAvailability(subdomain) {
    if (!subdomain) {
      throw new Error('Subdomain is required');
    }

    console.log('🔍 Checking subdomain availability:', subdomain);

    const existingTenant = await systemDbConnection
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);

    const isAvailable = existingTenant.length === 0;
    console.log(isAvailable ? '✅ Subdomain available' : '❌ Subdomain taken:', subdomain);
    
    return isAvailable;
  }
}

export default OnboardingValidationService;



