# Test and Build Failure Root Cause README

This document explains the current `pnpm test` and `pnpm build` failures, with exact error signatures, root causes, and how to verify each fix.

## Scope

- Command: `pnpm test` (workspace root)
- Command: `pnpm build` (workspace root)
- Backend package: `backend`

## 1) `pnpm test` runs integration tests unintentionally

### Exact behavior

- Backend `test` script runs `vitest run`.
- Backend `vitest.config.ts` includes all `*.test.ts`.
- This pattern also matches `*.integration.test.ts`.

### Why it fails

Integration tests are DB- and infra-dependent and are meant to run with `vitest.integration.config.ts` (with global setup, higher timeouts, and controlled worker model). Running them through the default config causes cascading failures and timeouts.

### Evidence

- `backend/package.json`:
  - `"test": "vitest run"`
  - `"test:integration": "vitest run --config vitest.integration.config.ts"`
- `backend/vitest.config.ts`:
  - `include: ['src/**/*.test.{ts,js}']`

### Typical error signatures

- `Error: Test timed out in 5000ms.`
- Multiple integration files failing in a normal unit-test run.

---

## 2) DB/schema mismatch: `payments.amount_refunded` missing

### Exact errors

- `PostgresError: column "amount_refunded" of relation "payments" does not exist`
- `PostgresError: column "amount_refunded" does not exist`

### Why it fails

Payment repository/services now read and write refund columns (`amount_refunded`, `refund_reason`, `is_partial_refund`, `refunded_at`), but the active DB in the failing run does not have those columns.

This is classic schema drift: code moved ahead of the actual DB schema used by tests.

### Evidence

- Schema expects these columns in `backend/src/db/schema/billing/subscriptions.ts`.
- Migration exists: `backend/src/db/migrations/0006_restore_payment_refund_columns.sql`.
- Errors show INSERT/SELECT statements referencing `amount_refunded`.

---

## 3) DB constraint failure: `seasonal_credit_allocations.campaign_id` not null

### Exact error

- `PostgresError: null value in column "campaign_id" of relation "seasonal_credit_allocations" violates not-null constraint`

### Why it fails

The schema marks `campaign_id` as required, but some integration test seed inserts into `seasonal_credit_allocations` without providing `campaign_id`.

### Evidence

- `backend/src/db/schema/billing/seasonal-credits.ts`:
  - `campaignId ... .notNull()`
- `backend/src/features/credits/services/credit-expiry-service.integration.test.ts` seed helper inserts:
  - `(tenant_id, entity_id, allocated_credits, used_credits, expires_at, is_active, is_expired, target_application)`
  - `campaign_id` omitted.

---

## 4) UUID contract mismatch: `'system'` written to UUID user_id

### Exact error

- `PostgresError: invalid input syntax for type uuid: "system"`

### Why it fails

Audit log writes use `'system'` as a fallback actor identifier in some role flows, but `audit_logs.user_id` is UUID-typed in the DB path where tests run.

### Evidence

- `backend/src/features/roles/services/permission-service.ts` logs with `userId: 'system'`.
- `backend/src/features/roles/services/permission-matrix-service.ts` inserts audit log with `userId: 'system'`.
- DB rejects non-UUID string.

---

## 5) Timeout cluster (`5000ms`)

### Exact error

- `Error: Test timed out in 5000ms.`

### Why it fails

Integration tests include DB operations and message-publishing code paths. Default unit-test timeout (`5000ms`) is too low for these flows.

`vitest.integration.config.ts` is designed for this with:
- `testTimeout: 30000`
- `hookTimeout: 120000`
- single fork settings

When integration files run under default config, timeout failures are expected.

---

## 6) `error-handler` expectation mismatch (`undefined` vs `null`)

### Exact error

- `AssertionError: expected undefined to be null`
- failing assertion: `expect(body.details).toBeNull()`

### Why it fails

In production-mode DrizzleError path, handler sets local `details = null`, but only attaches `response.details` when truthy. So response omits the field, yielding `undefined` (not `null`).

---

## 7) Build failures (`pnpm build`) are mostly TypeScript test typing regressions

### Representative compile errors

- `TS2769: No overload matches this call` (e.g., `new Date(Date | null)`).
- `TS2322: Type 'string' is not assignable to type '"test" | "development" | "production" | undefined'`.
- `TS2345: Argument of type '{ userId: string; tenantId: string; }' is not assignable to parameter of type 'UserContext'`.
- `TS7022: implicitly has type 'any' ...`.
- `TS2352: Conversion of type 'RowList<Record<string, unknown>[]>' ... may be a mistake`.

### Why it fails

Test code is not fully aligned with stricter type expectations and updated interfaces/schemas.

---

## Consolidated Root Cause Summary

1. Test routing issue: integration tests are being picked up by default unit config.
2. Schema drift issue: DB used by failing runs is missing expected columns/constraints alignment.
3. Data contract issue: non-UUID `'system'` value written into UUID field in audit flows.
4. Test implementation issue: seed SQL not updated for new required `campaign_id`.
5. Type safety issue: tests lag behind stricter TypeScript contracts.

---

## Recommended Fix Order

1. **Split test scopes cleanly**
   - Unit tests only in default `vitest.config.ts`.
   - Integration tests only in `vitest.integration.config.ts`.

2. **Stabilize DB schema for tests**
   - Ensure latest migrations run in the integration DB.
   - Verify refund columns exist in `payments`.
   - Ensure `seasonal_credit_allocations` insert paths include `campaign_id`.

3. **Fix audit actor ID contract**
   - Use nullable UUID + system UUID sentinel, or
   - Widen DB type consistently to support system actors, and align schema/tests.

4. **Fix broken assertions/timeouts**
   - Update tests expecting `null` where API currently omits field (or change API).
   - Keep integration timeout policy in integration config only.

5. **Resolve TS compile errors**
   - Null guards for `Date | null`.
   - Correct env typing in tests.
   - Align mocks/call signatures with current `UserContext`.
   - Remove unsafe casts or cast via `unknown` intentionally with guards.

---

## Verification Checklist

- `pnpm --filter wrapper-backend test` passes for unit-only scope.
- `pnpm --filter wrapper-backend test:integration` passes with integration config.
- `pnpm --filter wrapper-backend build` passes (no TS errors).
- Root `pnpm test` and `pnpm build` both pass.
- No regressions on payment/refund and credit expiry flows.

---

## Note for deployment pipeline

Current deployment workflow deploys on `main` push without a hard test gate. Until this is resolved, green local/build checks should be treated as required pre-push.
