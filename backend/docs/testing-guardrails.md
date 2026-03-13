# Test Guardrails for Security and Reliability

This document explains what each high-value test file protects, why failures matter, and how to respond safely.

## Run Tests

- Full suite: `pnpm --dir backend test`
- Single file examples:
  - `pnpm --dir backend vitest run src/middleware/auth/request-analyzer.test.ts`
  - `pnpm --dir backend vitest run src/services/data-isolation-service.test.ts`

## Guard Test Files and What They Protect

### `src/middleware/auth/request-analyzer.test.ts`

- **Purpose:** Prevent accidental auth bypass or RLS bypass on protected routes.
- **High-risk regression:** Adding protected paths (for example `/api/payments/`) to public/system bypass lists.
- **What a failure means:** A route classification changed and could expose data without authentication.
- **Action:** Re-check `isPublicEndpoint()`, `isSystemOperation()`, and route prefix matching (`startsWith`).

### `src/features/subscriptions/adapters/razorpay.adapter.test.ts`

- **Purpose:** Protect webhook signature verification and normalized event mapping.
- **High-risk regression:** Wrong HMAC algorithm, wrong secret usage, or payload/signature validation bugs.
- **What a failure means:** Fake/tampered webhooks may be accepted or real webhooks rejected.
- **Action:** Verify `verifyWebhook()` still uses HMAC-SHA256 against raw body and correct secret.

### `src/features/credits/services/credit-core.test.ts`

- **Purpose:** Protect idempotent credit record creation and root-organization fallback logic.
- **High-risk regression:** Removing existence checks before insert, causing duplicate credit records.
- **What a failure means:** Credits can be duplicated or root-org resolution can become unstable.
- **Action:** Ensure `ensureCreditRecord()` preserves "check-before-insert" behavior.

### `src/services/data-isolation-service.test.ts`

- **Purpose:** Enforce tenant boundary and membership-scoped visibility.
- **High-risk regression:** Returning tenant-wide organizations for regular users with no memberships.
- **What a failure means:** Cross-tenant/cross-org data exposure risk (critical security issue).
- **Action:** Keep "no membership => empty access" semantics for non-admin users.

### `src/features/auth/adapters/kinde-adapter.test.ts`

- **Purpose:** Ensure auth adapter delegates correctly to Kinde service and supports test-time swapping.
- **High-risk regression:** Calling wrong service method or bypassing adapter indirection.
- **What a failure means:** auth flows can break silently; tests/mocks become unreliable.

### `src/features/notifications/adapters/brevo-adapter.test.ts`

- **Purpose:** Ensure email adapter routes each method to correct email service API.
- **High-risk regression:** Accidentally calling wrong email method (`sendEmail` vs `sendUserInvitation`).
- **What a failure means:** invitation/payment emails can misfire or fail at runtime.

### `src/features/messaging/adapters/amazon-mq-adapter.test.ts`

- **Purpose:** Ensure message bus adapter actually delegates publish operations to MQ publisher.
- **High-risk regression:** local synthetic responses or skipped publisher calls.
- **What a failure means:** events appear successful in code but are never published.

## Failure Response Checklist

When one of the guard tests fails:

1. Reproduce with the single-file command.
2. Inspect only the target method and immediate call path.
3. Confirm no "temporary debug fallback" accidentally replaced delegation/verification logic.
4. Re-run full suite before merging.
5. If behavior intentionally changed, update both test expectations and this document.

## Notes

- Some tests intentionally log warnings/errors while validating failure paths. Console stderr output alone is not a failure signal.
- The source of truth is the Vitest pass/fail summary and exit code.

