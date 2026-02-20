/**
 * Branded types for domain identifiers.
 * Prevent accidentally passing a TenantId where a UserId is expected.
 *
 * Usage:
 *   const tid = 'abc-123' as TenantId;
 *   const uid = 'def-456' as UserId;
 *   acceptTenantId(uid); // TS error
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type EntityId = Brand<string, 'EntityId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type InvitationId = Brand<string, 'InvitationId'>;
export type CreditId = Brand<string, 'CreditId'>;
export type SessionId = Brand<string, 'SessionId'>;
