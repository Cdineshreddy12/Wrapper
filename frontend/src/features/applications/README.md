# Applications Feature

Displays and manages the tenant's assigned applications. Users can browse their available apps, view details and modules, and launch applications via SSO.

## Directory Structure

```
applications/
├── components/
│   ├── ApplicationCard.tsx            # Individual app card with tilt effect and launch actions
│   ├── ApplicationCardDecoration.tsx  # SVG decorations per theme type
│   ├── ApplicationDetailsModal.tsx    # Modal variant of app details
│   ├── ApplicationGrid.tsx            # Animated grid of application cards
│   ├── ApplicationHeader.tsx          # Page title with refresh button
│   ├── LoadingState.tsx               # Skeleton loading placeholders
│   └── applicationUtils.tsx           # Icons, theme colors, status helpers
└── pages/
    ├── ApplicationPage.tsx            # Main applications list page
    └── ApplicationDetailsPage.tsx     # Single application details with modules & permissions
```

## Key APIs

Data is sourced from `useApplications` → `useTenantApplications` (shared query):

- `GET /admin/application-assignments/tenant-apps/:tenantId` — Tenant's assigned applications with modules

No other direct API calls within this feature.

## Features

- **App grid** — Themed cards with stagger animation and recently-used tracking (localStorage)
- **App details** — Module list with permission risk styling, base URL, subscription tier
- **Launch** — Open application via base URL with SSO redirect support
- **Theming** — Per-app color themes (yellow, blue, emerald, purple, etc.)

## Dependencies

- `@/hooks/useApplications` — Application data hook
- `@/hooks/useSharedQueries` — `useTenantApplications`
- `@/types/application` — `Application`, `AppThemeConfig`, `ThemeType`
- `@/components/theme/ThemeProvider` — Theme and glassmorphism support
- `framer-motion` — Card and header animations
- `lucide-react` — Icons
