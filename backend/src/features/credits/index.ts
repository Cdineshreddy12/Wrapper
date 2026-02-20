/**
 * 💰 **CREDITS FEATURE**
 * Centralized credits feature module
 * Exports all credit routes and services
 */

// Routes
export { default as creditsRoutes } from './routes/credits.js';
export { default as creditExpiryRoutes } from './routes/credit-expiry.js';
export { default as seasonalCreditsPublicRoutes } from './routes/seasonal-credits-public.js';

// Services
export { CreditService } from './services/credit-service.js';
// REMOVED: CreditAllocationService - Application-specific allocations removed completely
// Applications now manage their own credit consumption
export { SeasonalCreditService } from './services/seasonal-credit-service.js';
export { CreditExpiryService } from './services/credit-expiry-service.js';