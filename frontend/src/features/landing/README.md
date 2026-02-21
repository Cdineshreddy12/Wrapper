# Landing Feature

Public-facing marketing pages including the main landing page, product/industry pages, pricing, and legal pages.

## Directory Structure

```
landing/
├── pages/
│   ├── index.ts               # Re-exports all pages
│   ├── Landing.tsx            # Main landing page (hero, products, industries, contact)
│   ├── Pricing.tsx            # Pricing and plans page
│   ├── ProductPage.tsx        # Product detail / marketing page
│   ├── IndustryPage.tsx       # Industry-specific content page
│   ├── PrivacyPolicy.tsx      # Privacy policy
│   ├── TermsOfService.tsx     # Terms of service
│   ├── CookiePolicy.tsx       # Cookie policy
│   └── Security.tsx           # Security information page
└── components/
    ├── index.ts               # Re-exports all components
    ├── HeroSection.tsx        # Landing hero with CTA
    ├── DemoSection.tsx        # Demo request form
    ├── TrustIndicators.tsx    # Social proof / trust badges
    ├── StackedCardsSection.tsx # Stacked card animation section
    ├── CostSavingsSection.tsx # Cost comparison / savings section
    ├── VisualHub.tsx          # Product visual showcase
    ├── WorkflowVisualizer.tsx # Animated workflow diagram
    └── Icons.tsx              # Dynamic icon helper (DynamicIcon)
```

## Pages

- **Landing** — Main entry: hero, product showcase, industry highlights, contact form. Checks auth status and redirects onboarded users to the dashboard.
- **Pricing** — Plans and pricing information
- **ProductPage / IndustryPage** — Dynamic content pages driven by data in `@/data/content` and `@/data/industryPages`
- **Legal pages** — Static PrivacyPolicy, TermsOfService, CookiePolicy, Security

## Key APIs

| Component | Endpoints |
|-----------|-----------|
| Landing | `GET /api/admin/auth-status` (redirect check), `POST /contact/submit` |
| DemoSection | `POST /demo/schedule` |

## Dependencies

- `@kinde-oss/kinde-auth-react` — Auth check for redirect
- `framer-motion` — Section animations
- `lucide-react` — Icons
- `@/data/content`, `@/data/industryPages` — Page content data
- `@/components/ui/resizable-navbar` — Navigation bar
- `@/components/layout/LandingFooter` — Footer
