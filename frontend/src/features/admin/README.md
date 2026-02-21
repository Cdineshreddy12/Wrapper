# Admin Feature

Company admin dashboard for platform-wide management of tenants, entities, credits, applications, and invitations.

## Directory Structure

```
admin/
├── index.ts
├── hooks/
│   ├── useDashboard.ts              # Dashboard overview & recent activity queries
│   ├── useTenantManagement.ts       # Tenant CRUD, bulk status, export
│   ├── useEntityManagement.ts       # Entity list, hierarchy, status, search
│   └── useCreditManagement.ts       # Credit overview, analytics, alerts, allocation
├── pages/
│   ├── AdminDashboardPage.tsx        # Route wrapper for the admin dashboard
│   ├── AdminDashboard.tsx            # Credit configuration entry view
│   ├── CampaignDetailsPage.tsx       # Seasonal credit campaign details
│   └── TenantDetailsPage.tsx         # Individual tenant details page
└── components/
    ├── AdminDashboard.tsx            # Main tabbed dashboard (overview, tenants, entities, …)
    ├── TenantManagement.tsx          # Tenant list, search, filter, status toggle, export
    ├── EntityManagement.tsx          # Entity list, hierarchy, credit allocation
    ├── CreditManagement.tsx          # Global/tenant operation costs, templates
    ├── ApplicationAssignmentManager.tsx  # Assign apps to tenants, manage modules
    ├── ApplicationCreditAllocations.tsx  # Per-app credit balance, allocate, transfer
    ├── AdminPromotionManager.tsx      # Promote user to system admin
    ├── CampaignDetailsModal.tsx       # Seasonal campaign modal
    ├── ContactSubmissionsTable.tsx     # Contact form submissions table
    ├── ExpiryManagementPanel.tsx       # Seasonal credit expiry warnings & extensions
    ├── InvitationManager.tsx          # Invitation list, create, resend, cancel
    ├── SeasonalCreditsManagement.tsx   # Campaign CRUD, expiry management
    ├── TrialSystemMonitor.tsx         # Trial monitoring status & restart
    └── credit-configuration/
        ├── index.ts
        ├── types.ts                   # Shared types for credit config
        ├── CreditConfigurationScreen.tsx  # Per-tenant config management screen
        ├── CreditConfigurationBuilder.tsx # Builder UI for credit config
        ├── CreditOperationCostManager.tsx # Operation cost management (global/tenant)
        ├── OperationConfigEditor.tsx   # Single operation config editor
        ├── ModuleConfiguration.tsx     # Module-level configuration
        ├── TenantList.tsx             # Tenant picker sidebar
        ├── ConfigurationSummary.tsx    # Config summary view
        ├── BulkUpdateDialog.tsx        # Bulk update dialog
        ├── ComparisonModal.tsx         # Compare configs modal
        ├── TemplateDialog.tsx          # Apply template dialog
        └── WarningModal.tsx            # Change impact warning modal
```

## Key APIs

| Area | Endpoints |
|------|-----------|
| Dashboard | `GET /admin/dashboard/overview`, `/admin/dashboard/recent-activity`, `/admin/dashboard/contact-submissions` |
| Tenants | `GET /admin/tenants/comprehensive`, `PATCH /admin/tenants/:id/status`, `POST /admin/tenants/bulk/status` |
| Entities | `GET /admin/entities/all`, `PATCH /admin/entities/:id/status`, `POST /admin/entities/bulk/status` |
| Credits | `GET /admin/credits/overview`, `POST /admin/credits/bulk-allocate` |
| Seasonal | `GET /admin/seasonal-credits/campaigns`, `POST /admin/seasonal-credits/send-warnings` |
| Trials | `GET /admin/trials/system-status`, `POST /admin/trials/restart-monitoring` |
| Promotion | `POST /admin-promotion/promote-system-admin` |

Also uses `operationCostAPI`, `creditConfigurationAPI`, `applicationAssignmentAPI`, and `invitationAPI` from `@/lib/api`.

## Sub-features

1. **Dashboard overview** — Stats, recent activity, contact submissions
2. **Tenant management** — List, filter, activate/deactivate, credit debug, export
3. **Entity management** — Hierarchy, status updates, credit allocation
4. **Credit management** — Operation costs, templates, comparison/warning modals
5. **Application assignments** — Assign apps to tenants, module and permission management
6. **Credit configuration** — Per-tenant operation/module/app config with builder UI
7. **Seasonal credits** — Campaign CRUD, expiry warnings, extension
8. **Trial monitoring** — System status and restart
9. **Admin promotion** — Promote users to system admin
10. **Invitations** — Create, resend, cancel invitations

## Dependencies

- `@tanstack/react-query` — Data fetching and cache invalidation
- `framer-motion` — Page animations
- `lucide-react` — Icons
- `sonner` / `react-hot-toast` — Notifications
- `@/components/ui/*` — shadcn/ui components
