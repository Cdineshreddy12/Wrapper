import { db } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { tenants, tenantUsers } from '../db/schema/index.js';

/**
 * 🎯 **ONBOARDING VALIDATION SERVICE**
 * Centralizes all onboarding validation logic
 * Prevents duplication across multiple onboarding endpoints
 */
export class OnboardingValidationService {

  /**
   * 🔍 **VALIDATE COMPLETE ONBOARDING DATA**
   * Validates all data for frontend onboarding endpoint
   */
  static async validateFrontendOnboardingData(data) {
    const errors = [];

    // Required field validation
    const requiredFields = ['legalCompanyName', 'companySize', 'businessType', 'firstName', 'lastName', 'email'];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    }

    // Email validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Please provide a valid email address');
      }
    }

    // GSTIN validation if provided
    if (data.hasGstin && data.gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(data.gstin.toUpperCase())) {
        errors.push('Please provide a valid GSTIN number');
      }
    }

    // Company size validation
    const validCompanySizes = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
    if (data.companySize && !validCompanySizes.includes(data.companySize)) {
      errors.push('Please select a valid company size');
    }

    // Name length validation
    if (data.firstName && data.firstName.length < 2) {
      errors.push('First name must be at least 2 characters long');
    }
    if (data.lastName && data.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }
    if (data.legalCompanyName && data.legalCompanyName.length < 1) {
      errors.push('Company name is required');
    }

    // Terms acceptance
    if (!data.termsAccepted) {
      errors.push('You must accept the terms and conditions to proceed');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    return { success: true, data };
  }

  /**
   * 🔍 **VALIDATE ENHANCED ONBOARDING DATA**
   * Validates data for enhanced onboarding endpoint
   */
  static async validateEnhancedOnboardingData(data) {
    const errors = [];

    // Required field validation
    const requiredFields = ['companyName', 'adminEmail', 'subdomain'];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    }

    // Email validation
    if (data.adminEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.adminEmail)) {
        errors.push('Please provide a valid admin email address');
      }
    }

    // Subdomain validation
    if (data.subdomain) {
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
      if (!subdomainRegex.test(data.subdomain) || data.subdomain.length < 3 || data.subdomain.length > 50) {
        errors.push('Subdomain must be 3-50 characters long and contain only lowercase letters, numbers, and hyphens');
      }
    }

    // Company name validation
    if (data.companyName && data.companyName.length < 1) {
      errors.push('Company name is required');
    }

    // Credit amount validation
    if (data.initialCredits !== undefined) {
      if (data.initialCredits < 100 || data.initialCredits > 10000) {
        errors.push('Initial credits must be between 100 and 10,000');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    return { success: true, data };
  }

  /**
   * 🔍 **CHECK FOR DUPLICATE REGISTRATIONS**
   * Comprehensive duplicate checking for onboarding
   */
  static async checkForDuplicates(checkData) {
    const { adminEmail, companyName, gstin, subdomain } = checkData;
    const errors = [];

    console.log('🔍 Checking for duplicate registrations...');

    // Check 1: Email already registered
    if (adminEmail) {
      const existingEmail = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          createdAt: tenants.createdAt
        })
        .from(tenants)
        .where(eq(tenants.adminEmail, adminEmail))
        .limit(1);

      if (existingEmail.length > 0) {
        errors.push({
          type: 'email_taken',
          field: 'adminEmail',
          message: 'This email is already associated with an organization. Please contact support if you need to create a new organization.',
          existingOrganization: {
            id: existingEmail[0].tenantId,
            name: existingEmail[0].companyName,
            subdomain: existingEmail[0].subdomain,
            createdAt: existingEmail[0].createdAt
          }
        });
      }
    }

    // Check 2: Company name already taken (case-insensitive)
    if (companyName) {
      const existingCompany = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain
        })
        .from(tenants)
        .where(sql`LOWER(${tenants.companyName}) = LOWER(${companyName})`)
        .limit(1);

      if (existingCompany.length > 0) {
        errors.push({
          type: 'company_taken',
          field: 'companyName',
          message: 'An organization with this name already exists. Please choose a different company name.',
          existingOrganization: {
            name: existingCompany[0].companyName,
            subdomain: existingCompany[0].subdomain
          }
        });
      }
    }

    // Check 3: GSTIN already registered (if provided)
    if (gstin) {
      const existingGSTIN = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName
        })
        .from(tenants)
        .where(eq(tenants.gstin, gstin.toUpperCase()))
        .limit(1);

      if (existingGSTIN.length > 0) {
        errors.push({
          type: 'gstin_taken',
          field: 'gstin',
          message: 'This GSTIN is already registered with another organization.',
          existingOrganization: {
            name: existingGSTIN[0].companyName
          }
        });
      }
    }

    // Check 4: Subdomain already taken
    if (subdomain) {
      const existingSubdomain = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName
        })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);

      if (existingSubdomain.length > 0) {
        errors.push({
          type: 'subdomain_taken',
          field: 'subdomain',
          message: 'This subdomain is already taken. Please choose a different subdomain.',
          existingOrganization: {
            name: existingSubdomain[0].companyName
          }
        });
      }
    }

    if (errors.length > 0) {
      console.log('❌ Duplicate registration checks failed:', errors);
      throw {
        name: 'DuplicateRegistrationError',
        message: 'Duplicate registration detected',
        errors: errors
      };
    }

    console.log('✅ No duplicate registrations found');
    return { success: true, checked: ['email', 'company', 'gstin', 'subdomain'].filter(field => checkData[field]) };
  }

  /**
   * 🔍 **VALIDATE SUBDOMAIN AVAILABILITY**
   * Checks if subdomain is available and generates unique one if needed
   */
  static async checkSubdomainAvailability(subdomain) {
    try {
      const existing = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);

      return existing.length === 0;
    } catch (error) {
      console.error('❌ Error checking subdomain availability:', error);
      return false;
    }
  }

  /**
   * 🔍 **GENERATE UNIQUE SUBDOMAIN**
   * Generates a unique subdomain from company name
   */
  static async generateUniqueSubdomain(companyName, maxAttempts = 10) {
    // Generate base subdomain from company name
    let baseSubdomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);

    // Ensure minimum length
    if (baseSubdomain.length < 3) {
      baseSubdomain = `company${baseSubdomain}`;
    }

    let finalSubdomain = baseSubdomain;
    let counter = 1;

    // Keep checking until we find an available subdomain
    while (!(await this.checkSubdomainAvailability(finalSubdomain))) {
      finalSubdomain = `${baseSubdomain}${counter}`;
      counter++;

      if (counter > maxAttempts) {
        throw new Error(`Unable to generate unique subdomain after ${maxAttempts} attempts`);
      }
    }

    return finalSubdomain;
  }

  /**
   * 🔍 **VALIDATE GSTIN FORMAT**
   * Validates GSTIN format and checksum
   */
  static validateGSTIN(gstin) {
    if (!gstin) return { valid: false, error: 'GSTIN is required' };

    const gstinStr = gstin.toString().toUpperCase();

    // Basic format check
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstinStr)) {
      return { valid: false, error: 'Invalid GSTIN format' };
    }

    // Length check
    if (gstinStr.length !== 15) {
      return { valid: false, error: 'GSTIN must be exactly 15 characters' };
    }

    // State code validation (first 2 digits)
    const stateCode = parseInt(gstinStr.substring(0, 2));
    if (stateCode < 1 || stateCode > 37) {
      return { valid: false, error: 'Invalid state code in GSTIN' };
    }

    return { valid: true };
  }

  /**
   * 🔍 **VALIDATE EMAIL FORMAT**
   * Comprehensive email validation
   */
  static validateEmail(email) {
    if (!email) return { valid: false, error: 'Email is required' };

    const emailStr = email.toString().trim();

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Length checks
    if (emailStr.length > 254) {
      return { valid: false, error: 'Email is too long' };
    }

    // Domain validation (basic)
    const domain = emailStr.split('@')[1];
    if (!domain || domain.length < 3) {
      return { valid: false, error: 'Invalid email domain' };
    }

    return { valid: true };
  }

  /**
   * 🔍 **VALIDATE COMPANY NAME**
   * Validates company name requirements
   */
  static validateCompanyName(companyName) {
    if (!companyName) return { valid: false, error: 'Company name is required' };

    const name = companyName.toString().trim();

    if (name.length < 1) {
      return { valid: false, error: 'Company name cannot be empty' };
    }

    if (name.length > 100) {
      return { valid: false, error: 'Company name is too long (max 100 characters)' };
    }

    // Check for potentially problematic characters
    const problematicChars = /[<>{}[\]\\|]/;
    if (problematicChars.test(name)) {
      return { valid: false, error: 'Company name contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * 🔍 **VALIDATE SUBDOMAIN**
   * Validates subdomain format and requirements
   */
  static validateSubdomain(subdomain) {
    if (!subdomain) return { valid: false, error: 'Subdomain is required' };

    const subdomainStr = subdomain.toString().trim().toLowerCase();

    // Length check
    if (subdomainStr.length < 3 || subdomainStr.length > 50) {
      return { valid: false, error: 'Subdomain must be 3-50 characters long' };
    }

    // Format check (only lowercase letters, numbers, hyphens)
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomainStr)) {
      return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
    }

    // Cannot start or end with hyphen
    if (subdomainStr.startsWith('-') || subdomainStr.endsWith('-')) {
      return { valid: false, error: 'Subdomain cannot start or end with a hyphen' };
    }

    // Reserved words check
    const reservedWords = ['www', 'api', 'admin', 'test', 'dev', 'staging', 'app', 'mail', 'ftp'];
    if (reservedWords.includes(subdomainStr)) {
      return { valid: false, error: 'This subdomain is reserved' };
    }

    return { valid: true };
  }

  /**
   * 🔍 **COMPREHENSIVE ONBOARDING VALIDATION**
   * Validates complete onboarding data for any endpoint
   */
  static async validateCompleteOnboarding(data, endpoint = 'unknown') {
    console.log(`🔍 Validating onboarding data for ${endpoint} endpoint`);

    try {
      // Basic data validation based on endpoint
      if (endpoint === 'frontend') {
        await this.validateFrontendOnboardingData(data);
      } else if (endpoint === 'enhanced') {
        await this.validateEnhancedOnboardingData(data);
      } else {
        // Generic validation for unknown endpoints
        if (!data.companyName && !data.legalCompanyName) {
          throw new Error('Company name is required');
        }
        if (!data.adminEmail && !data.email) {
          throw new Error('Email is required');
        }
      }

      // Duplicate checking
      const duplicateCheckData = {
        adminEmail: data.adminEmail || data.email,
        companyName: data.companyName || data.legalCompanyName,
        gstin: data.gstin,
        subdomain: data.subdomain
      };

      await this.checkForDuplicates(duplicateCheckData);

      // Subdomain generation/validation
      if (!data.subdomain && (data.companyName || data.legalCompanyName)) {
        const companyName = data.companyName || data.legalCompanyName;
        data.generatedSubdomain = await this.generateUniqueSubdomain(companyName);
      }

      console.log(`✅ Onboarding validation passed for ${endpoint} endpoint`);
      return {
        success: true,
        data: data,
        validationsPassed: [
          'basic_validation',
          'duplicate_check',
          'subdomain_generation'
        ]
      };

    } catch (error) {
      console.error(`❌ Onboarding validation failed for ${endpoint} endpoint:`, error.message);
      throw error;
    }
  }
}

export default OnboardingValidationService;
