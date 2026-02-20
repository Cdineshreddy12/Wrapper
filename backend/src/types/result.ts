/**
 * Discriminated union for typed service results.
 * Use instead of throwing/catching for expected failures.
 *
 * Usage:
 *   function createTenant(data: NewTenant): ServiceResult<Tenant> {
 *     if (!data.companyName) return { ok: false, error: { code: 'VALIDATION', message: 'Name required' } };
 *     const tenant = await db.insert(tenants).values(data).returning();
 *     return { ok: true, data: tenant[0] };
 *   }
 *
 *   const result = await createTenant(data);
 *   if (!result.ok) { reply.code(400).send(result.error); return; }
 *   reply.send(result.data); // fully typed as Tenant
 */

export type ServiceResult<T, E = ServiceError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type PaginatedResult<T> = ServiceResult<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>;

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: string, message: string, details?: Record<string, unknown>): ServiceResult<T> {
  return { ok: false, error: { code, message, details } };
}
