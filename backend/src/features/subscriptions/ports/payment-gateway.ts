/**
 * Feature-local payment gateway port.
 *
 * This keeps the subscriptions feature aligned to a ports/adapters layout
 * while remaining backward compatible with the existing adapter interface.
 */
export type { PaymentGatewayPort } from '../adapters/payment-gateway.port.js';
