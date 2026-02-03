# Tenant Dashboard Settings E2E + Supabase Verification

## Overview

The script `scripts/settings-dashboard-e2e.mjs` uses Playwright with a **persistent browser profile** (e.g. ZopKit - Work / letszopkit@gmail.com) to:

1. Open `/dashboard/settings`
2. Fill **Contact** (Billing/Support email, Salutation, Middle Name, Department, Job Title, Authority Level, Direct/Mobile phone, Preferred method)
3. Fill **Tax & Compliance** (Tax Residence Country, Regulatory Compliance Status, PAN, EIN, VAT, CIN, Withholding Tax toggle)
4. Click **Save Changes** and assert success toast

After the test runs, you can **observe the saved data in Supabase** using the Supabase MCP or SQL editor.

## Prerequisites

1. **Log in once** as letszopkit (or your test user) using the same Chrome profile:
   ```bash
   cd frontend
   # Use your ZopKit/letszopkit Chrome profile path, or default playwright-oauth-profile
   PLAYWRIGHT_OAUTH_PROFILE=./playwright-zopkit-profile node scripts/oauth-browser-test.mjs
   ```
   Sign in with letszopkit@gmail.com, then close. Next runs of the settings test will reuse this session.

2. **Frontend and backend** running (e.g. `npm run dev` in frontend, backend on its port).

3. **Playwright browsers** installed: `npx playwright install`

## Run the test

```bash
cd frontend
npm run test:settings-e2e
```

Optional env:

- `PLAYWRIGHT_OAUTH_PROFILE` – path to persistent profile (default: `./playwright-oauth-profile`)
- `VITE_APP_URL` – app URL (default: `http://localhost:3001`)

## Observe data in Supabase (MCP or SQL)

After the test saves, run this in **Supabase MCP** (`execute_sql`) or in the Supabase SQL editor:

```sql
SELECT
  tenant_id,
  company_name,
  admin_email,
  contact_salutation,
  contact_middle_name,
  contact_department,
  contact_job_title,
  contact_authority_level,
  contact_direct_phone,
  contact_mobile_phone,
  billing_email,
  support_email,
  tax_residence_country,
  regulatory_compliance_status,
  tax_registration_details,
  withholding_tax_applicable,
  updated_at
FROM tenants
WHERE admin_email ILIKE '%letszopkit%' OR admin_email ILIKE '%zopkit%'
LIMIT 5;
```

You should see the Contact and Tax & Compliance values updated (e.g. `contact_salutation`, `contact_department`, `tax_residence_country`, `tax_registration_details`).

## Current letszopkit tenant (before test)

Example snapshot from Supabase (before running the E2E fill):

- `admin_email`: letszopkit@gmail.com
- `contact_salutation`, `contact_middle_name`, `contact_department`, `contact_authority_level`, `contact_direct_phone`: often null
- `contact_job_title`: e.g. "overall"
- `contact_mobile_phone`: e.g. "8074683901"
- `tax_residence_country`: null
- `regulatory_compliance_status`: "Pending"
- `tax_registration_details`: {} or empty

After the test, these fields should be populated as per the script (e.g. Salutation Mr., Department Engineering, Tax country IN, PAN/EIN/VAT/CIN filled, Compliance Compliant).
