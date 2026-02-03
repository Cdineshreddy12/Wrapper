# OAuth UI Testing Guide

Two approaches for testing OAuth flows (e.g., Google Sign-in) and event publishing via the website.

---

## 1. Use Real Browser + Persistent Profile (semi-works)

If you *must* test OAuth UI, use Playwright with a persistent Chromium profile:

```javascript
import { chromium } from 'playwright';

const context = await chromium.launchPersistentContext(
  '/Users/you/chrome-profile',
  {
    headless: false,
    channel: 'chrome'
  }
);

const page = await context.newPage();
```

### Notes

- Login manually once
- Reuse session cookies
- May break anytime
- Not CI-safe

### Usage

```bash
cd frontend
npm run dev   # Start frontend first
# In another terminal:
npm run test:oauth-browser
```

### How it works

- **First run**: A Chrome window opens. Sign in manually with Google.
- **Subsequent runs**: Session cookies are reused from `playwright-oauth-profile/` — you should already be logged in.

### Env vars

```bash
# Custom profile path (default: ./playwright-oauth-profile)
PLAYWRIGHT_OAUTH_PROFILE=/Users/you/chrome-profile npm run test:oauth-browser

# Custom app URL
VITE_APP_URL=http://localhost:3001 npm run test:oauth-browser
```

### Test onboarding (same profile)

After logging in once with the profile above, you can run the onboarding E2E test so auth is already done:

```bash
cd frontend
npm run dev   # Start frontend
# In another terminal (after logging in once via test:oauth-browser):
npm run test:onboarding
```

This uses the same `playwright-oauth-profile/` (or `PLAYWRIGHT_OAUTH_PROFILE`) so session cookies are reused and the script goes straight to `/onboarding`, fills Business Details → Tax Details → Admin Details → Review & Submit. Screenshots are saved under `playwright-debug-screenshots/`.

**Prereqs:** `npx playwright install` (once), then log in once via `npm run test:oauth-browser` so the profile has session cookies.

**Verify in DB:** After onboarding, confirm success in the database using [Supabase MCP](ONBOARDING_VERIFICATION.md#1-supabase-mcp-execute_sql) (`execute_sql` with the documented queries) or the backend script: `cd backend && node scripts/verify-onboarding-in-db.js`. See [ONBOARDING_VERIFICATION.md](ONBOARDING_VERIFICATION.md).

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Step 4 timeout on submit button | The last-step button is **Launch Workspace** (not Submit/Complete/Finish). The test script targets it; ensure terms checkbox is checked first. |
| Google blocks / "unsafe browser" | Script now includes anti-automation flags. Use default profile first. |
| Session doesn't persist | Use default `playwright-oauth-profile` (don't customize). Login, then close browser with Ctrl+C (don't kill process). |
| Chrome not found | Script falls back to Chromium. Or install Chrome: `brew install --cask google-chrome` |
| Custom profile path | Use a new empty directory. To reuse existing Chrome data, copy the profile folder first. |

---

## 2. OAuth Test Users (Google-approved way)

Configure test users in Google Cloud Console for staging environments.

### Steps

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **OAuth consent screen**
4. Under **Test users**, click **+ ADD USERS**
5. Add your test email addresses
6. These users can sign in even when the app is in "Testing" mode

### Caveats

- Still ❌ for full automation (requires manual login)
- Useful for staging and manual QA
- Up to 100 test users in Testing mode

---

## Testing AWS MQ Events via the Website

1. **Start the app** (frontend + backend running)
2. **Run the OAuth browser**: `npm run test:oauth-browser`
3. **Sign in** (first run only)
4. **Trigger events**: Invite user, assign role, or deactivate user
5. **Verify in RabbitMQ**: [Queues](https://b-a9633a38-d347-4b4e-8962-9b2a4646d7af.mq.us-east-1.on.aws/#/queues)  
   - Login: `Zopkit` / `Zopkitlaunch@2026`  
   - Watch **crm-events** queue message count

### Automated UI Event Test

After logging in once:

```bash
npm run test:trigger-event
```

This script will:
1. Open the app with your persistent session (logged in)
2. Navigate to Roles, edit a custom role, save (triggers `role_updated` event)
3. Open RabbitMQ and verify the crm-events queue message count increased
