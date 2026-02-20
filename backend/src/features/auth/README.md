# Auth Feature

OAuth2 login and session handling with Kinde. Supports social login (Google, GitHub, Microsoft, Apple, LinkedIn), organization-scoped login by subdomain, cookie-based token management, refresh, logout, and token validation (Kinde RS256 or Operations HS256).

## Directory Structure

```
auth/
├── index.ts                  # Feature exports
├── routes/
│   └── auth.ts               # All auth endpoints
└── services/
    └── kinde-service.ts      # Kinde OAuth client and management API
```

## Endpoints (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/oauth/login` | Generic Kinde OAuth entry point (onboarding flow) |
| GET | `/oauth/:provider` | Per-provider OAuth (google, github, microsoft, apple, linkedin) |
| GET | `/login/:subdomain` | Org-specific login using Kinde `org_code` for the subdomain |
| GET | `/callback` | OAuth2 callback – exchanges code for tokens, sets cookies, redirects |
| GET | `/me` | Current authenticated user and organization context |
| GET | `/providers` | List of enabled social login providers with URLs |
| POST | `/logout` | Clear auth cookies and return Kinde logout URL |
| POST | `/refresh` | Refresh access token using refresh cookie |
| POST | `/validate-token` | Validate token (Kinde RS256 or Operations HS256) and return user context |

## Services

| Service | Description |
|---------|-------------|
| **KindeService** | Full Kinde integration: social auth URLs with connection IDs, org-scoped login, token exchange, refresh, JWKS verification, user info retrieval, M2M tokens, user/organization management (create, list, add/remove users, role assignment) |
