# Schema Parity Report (Production vs Local Drizzle)

Date: 2026-03-04

Execution guide: see `docs/db-schema-parity-runbook.md` for step-by-step setup, verification, and troubleshooting.

This report compares:

- Production (`public` schema via DB MCP)
- Local active Drizzle schema files in `src/db/schema`

## Current Status

- **Table-name parity:** `40 / 40` matched.
- **Recently missing tables fixed locally:** `external_applications`, `usage_logs`, `usage_metrics_daily`.
- **Local-only table removed from active schema exports:** `admin_notification_history`.

## Confirmed Column Drift

### `event_tracking`

Type alignment completed:

- Active Drizzle schema now uses `text` for `event_id`, `event_type`, `tenant_id`, `entity_id`, `stream_key`, `published_by`, and `status`.
- Active Drizzle schema now uses `timestamptz` (`timestamp(..., { withTimezone: true })`) for `published_at`, `acknowledged_at`, `last_retry_at`, `created_at`, and `updated_at`.
- SQL migration added: `src/db/migrations/align_event_tracking_column_types.sql` for environments that still have old local types.

## Confirmed Index Drift Checklist

The following production indexes are present but not represented in local Drizzle table definitions (or differ in semantics/order).

### High priority (hot paths)

- [x] `audit_logs`: `idx_audit_logs_tenant_id`, `idx_audit_logs_tenant_created_at`
- [x] `payments`: `idx_payments_tenant_id`, `idx_payments_tenant_created_at`
- [x] `tenant_users`: `idx_tenant_users_tenant_id`, `idx_tenant_users_email`, `idx_tenant_users_kinde_user_id`

### Security / auth / invitation flows

- [x] `tenant_invitations`: `idx_tenant_invitations_scope`, `idx_tenant_invitations_primary_entity`, `idx_tenant_invitations_pending_multi`
- [x] `membership_invitations`: unique index on `invitation_token` (`membership_invitations_invitation_token_unique`)

### Notifications

- [x] `notifications`: `idx_notifications_tenant_id`, `idx_notifications_type`, `idx_notifications_priority`, `idx_notifications_target_user_id`, `idx_notifications_created_at`, `idx_notifications_scheduled_at`, `idx_notifications_expires_at`, `idx_notifications_is_read`, `idx_notifications_is_dismissed`, `idx_notifications_is_active`
- [x] `notification_templates`: `idx_notification_templates_category_active`, `idx_notification_templates_type_active`, `idx_notification_templates_created_at`, `idx_notification_templates_created_by`, `idx_notification_templates_is_active`
- [x] `tenant_template_customizations`: `idx_tenant_template_customizations_tenant_id`, `idx_tenant_template_customizations_template_id`, `idx_tenant_template_customizations_tenant_template`, `idx_tenant_template_customizations_is_active`

### Entities / hierarchy

- [x] `entities`: `entities_entity_code_unique`, `idx_entities_parent_entity_id`, `idx_entities_hierarchy_path`, `idx_entities_tenant_hierarchy`, `idx_entities_type_hierarchy`

### Tracking / event pipeline

- [x] `event_tracking`: index names/composites aligned; SQL migration added for strict partial-index predicate parity:
  - `event_tracking_acknowledged_idx` (`WHERE acknowledged = false`)
  - `event_tracking_replay_idx` (`WHERE status IN ('pending','failed')`)
  - `event_tracking_target_app_idx` (`WHERE status IN ('pending','failed')`)
- [x] `webhook_logs`: index set is aligned (including unique `event_id` index + event_type/status/created_at indexes)

### Billing / credits

- [x] `credit_configurations`: `idx_credit_config_lookup`, `unique_global_credit_config`, `unique_tenant_credit_config` (partial unique semantics aligned via SQL migration)
- [x] `credit_purchases`: unique index `credit_purchases_batch_id_unique`

### Seasonal credits

- [x] `seasonal_credit_campaigns`: `idx_seasonal_campaigns_tenant`, `idx_seasonal_campaigns_status`
- [x] `seasonal_credit_allocations`: `idx_seasonal_allocations_campaign`, `idx_seasonal_allocations_tenant_entity`, `idx_seasonal_allocations_target_app`, `idx_seasonal_allocations_expiry`, `idx_seasonal_allocations_expiry_app` (partial semantics aligned via SQL migration)

### Tenants (extended profile fields)

- [x] `tenants`: several optional-field indexes now represented locally (with filtered predicates aligned via SQL migration):
  - `idx_tenants_tax_registered`
  - `idx_tenants_vat_gst_registered`
  - `idx_tenants_organization_size`
  - `idx_tenants_billing_email`
  - `idx_tenants_support_email`
  - `idx_tenants_bank_name`
  - `idx_tenants_tax_exempt_status`
  - `idx_tenants_tax_residence_country`
  - `idx_tenants_regulatory_compliance_status`

### Change log

- [x] `change_log`: `idx_change_log_priority` order aligned to `(priority, changed_at)`.
- [x] `change_log`: `idx_change_log_unprocessed` partial predicate aligned via SQL migration.

### External apps

- [x] `external_applications`: both `external_applications_api_key_unique` and `external_applications_api_key_key` are represented.

## Recommended Next Execution Order

1. Optional cleanup only: remove duplicate historical indexes in production where functionally redundant.

## Notes

- This report tracks **strict parity** (exact structural equivalence), not just runtime compatibility.
- Some production indexes appear to be historical duplicates. Keep them only if intentionally required for compatibility.
