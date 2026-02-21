# Settings Feature

Application and account settings including theme customization, navigation preferences, and tenant profile management.

## Directory Structure

```
settings/
├── index.ts
└── pages/
    ├── Settings.tsx            # Settings shell with tabs
    └── AccountSettings.tsx     # Account/tenant profile form
```

## Pages

### Settings

Main settings page with two tabs:
- **General** — Theme toggle (light/dark), glassmorphism toggle, navigation mode (traditional sidebar / dock)
- **Account Details** — Links to the account settings form

Listens for `tour-open-account-tab` events and supports `?tab=account` URL parameter for direct navigation.

### AccountSettings

Comprehensive tenant profile form with sections:
- **Company details** — Name, type, industry
- **Contact information** — Email, phone, salutation
- **Mailing address** — Full address with country/state
- **Banking details** — Bank account information
- **Integrations** — Connected service settings

Uses validation schemas from the onboarding feature for field options (salutations, countries, states).

## Key APIs

| Action | Endpoint |
|--------|----------|
| Load tenant | `GET /tenants/current` |
| Update tenant | `PATCH /tenants/current` |

## Dependencies

- `@/lib/api` — API client
- `@/components/theme/ThemeToggle` — Theme switcher
- `@/components/theme/ThemeProvider` — Theme context
- `@/features/onboarding/schemas` — Validation schemas and field options
- `framer-motion` — Tab transition animations
