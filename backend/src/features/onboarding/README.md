# Onboarding Feature

Handles new-organization and new-user onboarding: company and admin details, tax verification (PAN/GSTIN), preferences, subdomain and DNS setup, team invitations, step tracking, and retry with stored form data.

## Directory Structure

```
onboarding/
├── index.ts                                      # Feature exports
├── routes/
│   ├── core-onboarding.ts                        # Main onboarding workflow
│   ├── status-management.ts                      # Payment success, invitations, completion
│   ├── data-management.ts                        # User org data and step updates
│   ├── subdomain-management.ts                   # Subdomain availability checks
│   ├── admin-management.ts                       # Reset, debug, create-organization
│   ├── verification-routes.ts                    # PAN and GSTIN verification
│   └── dns-management.ts                         # DNS/subdomain/custom domain management
└── services/
    ├── unified-onboarding-service.ts             # Single onboarding workflow orchestrator
    ├── onboarding-validation-service.ts          # Duplicate checks, PAN/GSTIN validation
    ├── onboarding-tracking-service.ts            # Phase tracking and progress reporting
    ├── onboarding-organization-setup.ts          # Application assignment by plan/package
    ├── verification-service.ts                   # PAN/GSTIN verification via sandbox.co.in
    ├── onboarding-verification-service.ts        # Post-onboarding verification checks
    └── dns-management-service.ts                 # AWS Route 53 DNS management
```

## Endpoints

### Core Onboarding (`/api/onboarding`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/onboard-frontend/validate-step` | Validate a single onboarding step |
| POST | `/onboard-frontend` | Run full onboarding workflow (company, admin, tax, preferences, terms) |
| GET | `/onboard-frontend/retry-data` | Get stored form/step data for retry |
| POST | `/onboard-frontend/retry` | Retry onboarding using stored data |

### Status Management (`/api/onboarding`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/success` | Payment success callback (handles Stripe session) |
| GET | `/status` | Get onboarding status (isOnboarded, step, savedFormData) |
| POST | `/invite-team` | Send team invitations |
| POST | `/complete` | Mark onboarding as completed |
| POST | `/get-data` | Get onboarding data by email |

### Data Management (`/api/onboarding`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user-organization` | Get user's organization and info |
| POST | `/mark-complete` | Mark onboarding complete for user |
| POST | `/update-step` | Create/update onboarding form data for a step |

### Subdomain Management (`/api/onboarding`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/check-subdomain` | Check subdomain availability (query param) |
| POST | `/check-subdomain` | Check subdomain availability (body) |

### Admin Management (`/api/onboarding`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/debug-user/:kindeUserId` | Debug user: tenant, roles, Kinde orgs/roles |
| POST | `/reset` | Reset onboarding status |
| POST | `/create-organization` | Create organization via Kinde + DB |

### Verification (`/api/onboarding`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/verify-pan` | Verify PAN number |
| POST | `/verify-gstin` | Verify GSTIN and ensure active status |

### DNS Management (`/api/dns`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tenants/:tenantId/domains` | List domains for a tenant |
| GET | `/changes/:changeId` | Get DNS change status |
| GET | `/health` | DNS service health check |
| POST | `/subdomains` | Create subdomain for tenant |
| POST | `/custom-domains` | Start custom domain setup |
| POST | `/verify-domain` | Verify custom domain ownership |
| POST | `/check-subdomain` | Check subdomain availability |
| POST | `/validate-domain` | Validate custom domain format |
| DELETE | `/subdomains/:tenantId` | Delete tenant subdomain |
| DELETE | `/custom-domains/:tenantId` | Delete tenant custom domain |

## Services

| Service | Description |
|---------|-------------|
| **UnifiedOnboardingService** | Single workflow orchestrator: validate, create tenant/org/admin/role/subscription/credits, Kinde org/user assignment, store/retrieve/delete form data |
| **OnboardingValidationService** | Duplicate checks (email, subdomain), PAN/GSTIN validation and verification before onboarding |
| **OnboardingTrackingService** | Track onboarding phases (phase, status, metadata) and report progress/analytics |
| **OnboardingOrganizationSetup** | Map credit package/plan to applications, update organization applications, assign applications to tenant |
| **VerificationService** | PAN and GSTIN verification via sandbox.co.in API with auth token caching |
| **OnboardingVerificationService** | Post-onboarding checks: verify tenant, org entity, admin user, role, subscription, credits, and application assignments |
| **DNSManagementService** | AWS Route 53 integration: create/delete subdomain and custom domain records, verify domain ownership, generate unique subdomains |
