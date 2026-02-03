# Onboarding E2E Test

The Playwright test in `scripts/onboarding-test-with-profile.mjs` is aligned with the actual onboarding flow in the codebase.

## How onboarding works (code flow)

1. **Route**  
   `/onboarding` → `OnboardingPageGuard` → `OnboardingPage` (from `indexOptimized` → `OnboardingPageOptimized`).

2. **Loading**  
   While `useKindeAuth().isLoading` is true, the page shows “Loading your information...” and a spinner. When Kinde is ready, it renders `OnboardingFormOptimized`.

3. **Form**  
   `OnboardingFormOptimized` uses:
   - `selectedFlow = 'newBusiness'` (no flow selector in this version)
   - `getFlowConfig('newBusiness')` → 4 steps: Business Details, Tax Details, Admin Details, Review & Submit
   - `MultiStepForm` + `OnboardingLayout` + `StepRenderer` + `NavigationButtons`

4. **Steps (StepRenderer)**  
   - **Step 1** `businessDetails` → `BusinessDetailsStep`  
     Required for “Next”: Registration Country, Company Name, Company Type, Business Type (`canProceed` in `useStepNavigation`).
   - **Step 2** `taxDetails` → `TaxDetailsStep`  
     Required: billing address (street, city, zip), and State for IN/US/CA/AU. Leave VAT/GST toggles off to skip PAN/GSTIN.
   - **Step 3** `adminDetails` → `AdminDetailsStep`  
     Required: First Name, Last Name, Admin Email (readonly from Kinde), Support Email.
   - **Step 4** `review` → `ReviewStep`  
     Required: terms accepted. Submit button label is **“Launch Workspace”** (`NavigationButtons.tsx`).

5. **Submit**  
   - User clicks “Launch Workspace” → form `onSubmit` → `OnboardingFormOptimized.handleSubmit`.
   - `handleSubmit` posts to `POST /onboarding/onboard-frontend` with sanitized payload.
   - On success: `setIsSubmitted(true)` → UI shows `SuccessMessage` (“Form submitted successfully!”) and toast “Organization Created Successfully!”.

## Test script behavior

- Uses the same persistent browser profile as OAuth tests; log in once with `npm run test:oauth-browser`, then run `npm run test:onboarding`.
- **Restored state:** If the app opens on Step 4 (Review & Submit) due to form persistence, the test detects "Launch Workspace", accepts terms, clicks it, and asserts success.
- Waits for “Loading your information...” to disappear, then:
  1. **Step 1**: Ensures country (e.g. India), fills Company Name (by label or placeholder), opens Company Type combobox and selects first option, same for Business Type, then clicks Next.
  2. **Step 2**: Fills billing address (placeholder “Registered business address”), City, Postal/ZIP, State combobox if visible, then Next.
  3. **Step 3**: Fills First Name, Last Name, Support Email (Admin Email is readonly and left as-is), then Next.
  4. **Step 4**: Clicks “I accept the Terms and Conditions” (or the terms checkbox), then clicks “Launch Workspace”.
- Success is asserted by visible text such as “Form submitted successfully”, “Organization Created Successfully”, or “Setting up your workspace”.

## Key selectors (from the UI code)

| Step   | Field / Action      | Selector / source |
|--------|---------------------|-------------------|
| 1      | Company Name        | `getByLabel(/company name/i)` or `getByPlaceholder(/Acme Innovations|e\.g\./i)` (BusinessDetailsStep) |
| 1      | Company Type        | `getByRole('combobox', { name: /company type/i })` → option |
| 1      | Business Type       | `getByRole('combobox', { name: /business type/i })` → option |
| 1      | Country             | `getByRole('combobox', { name: /registration country|country/i })` (default IN) |
| 2      | Billing address     | `getByPlaceholder(/Registered business address/i)` |
| 2      | City / ZIP / State  | `getByLabel(/City|Postal\/ZIP|state/i)` and state combobox |
| 3      | First / Last name   | `getByLabel(/first name|last name/i)` |
| 3      | Support Email       | `getByLabel(/support email/i)` (Admin Email is readonly) |
| 4      | Terms               | `getByText(/I accept the Terms/)` or `getByRole('checkbox')` |
| 4      | Submit              | `getByRole('button', { name: /Launch Workspace/i })` (NavigationButtons) |

## Running the test

```bash
cd frontend
# Ensure frontend + backend are running; log in once:
# npm run test:oauth-browser
npm run test:onboarding
```

Screenshots are written to `playwright-debug-screenshots/`. To reset tenant data before a run: `cd backend && node scripts/delete-all-tenant-data.js`.

## Testing onboarding extensively

1. **Full flow (Steps 1–4)**  
   Clear persisted form data (or use a fresh profile), then run `npm run test:onboarding`. The script walks Step 1 → 2 → 3 → 4, fills required fields, accepts terms, and submits.

2. **Restored state (Step 4 only)**  
   If the app opens on Step 4 (Review & Submit) due to form persistence, the test detects "Launch Workspace", checks the terms checkbox, **waits for the button to become enabled**, then clicks submit and asserts success.

3. **Step 4 fix (terms + button)**  
   The "Launch Workspace" button is disabled until `termsAccepted` is true. The test now: (a) clicks the terms label and/or checks the terms checkbox, (b) waits for the button to be enabled (`waitFor({ state: 'enabled' })`), (c) re-checks the checkbox if still disabled, then (d) clicks submit. This avoids timeouts from clicking a disabled button.
