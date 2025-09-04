import subdomainManagementRoutes from './onboarding/subdomain-management.js';
import coreOnboardingRoutes from './onboarding/core-onboarding.js';
import statusManagementRoutes from './onboarding/status-management.js';
import dataManagementRoutes from './onboarding/data-management.js';
import adminManagementRoutes from './onboarding/admin-management.js';

/**
 * Main Onboarding Routes
 * Modularized onboarding system with separate concerns
 *
 * This replaces the monolithic onboarding.js file with smaller, focused modules:
 * - subdomain-management.js: Subdomain validation endpoints
 * - core-onboarding.js: Main onboarding flow (/onboard endpoint)
 * - status-management.js: Status checking, completion, and team invitations
 * - data-management.js: Data retrieval, organization info, and step tracking
 * - admin-management.js: Debug and admin endpoints
 */

export default async function onboardingRoutes(fastify, options) {
  console.log('🔧 Registering modularized onboarding routes...');

  // Register subdomain management routes
  await subdomainManagementRoutes(fastify, options);

  // Register core onboarding routes
  await coreOnboardingRoutes(fastify, options);

  // Register status management routes
  await statusManagementRoutes(fastify, options);

  // Register data management routes
  await dataManagementRoutes(fastify, options);

  // Register admin management routes
  await adminManagementRoutes(fastify, options);

  console.log('✅ All onboarding modules registered successfully');
}
