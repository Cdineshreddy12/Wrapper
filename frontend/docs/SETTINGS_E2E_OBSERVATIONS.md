# Settings E2E – DB + Screenshot Observations & Issues

## Supabase (DB) observation

### Query used (Supabase MCP `execute_sql`)

```sql
SELECT tenant_id, company_name, admin_email, contact_salutation, contact_middle_name,
       contact_department, contact_job_title, contact_authority_level,
       contact_direct_phone, contact_mobile_phone, billing_email, support_email,
       tax_residence_country, regulatory_compliance_status, tax_registration_details,
       withholding_tax_applicable, updated_at
FROM tenants
WHERE admin_email ILIKE '%letszopkit%' OR admin_email ILIKE '%reddycdinesh%'
LIMIT 5;
```

### letszopkit tenant (unchanged by this test run)

| Field | Value |
|-------|--------|
| admin_email | letszopkit@gmail.com |
| contact_salutation | null |
| contact_middle_name | null |
| contact_department | null |
| contact_authority_level | null |
| contact_direct_phone | null |
| tax_residence_country | null |
| regulatory_compliance_status | Pending |
| tax_registration_details | {} |
| withholding_tax_applicable | false |

### reddycdinesh41 tenant (updated by this test run)

| Field | Value |
|-------|--------|
| admin_email | reddycdinesh41@gmail.com |
| contact_salutation | **null** |
| contact_middle_name | E2E ✓ |
| contact_department | Engineering ✓ |
| contact_job_title | Lead ✓ |
| contact_authority_level | **null** |
| contact_direct_phone | +15551234567 ✓ |
| contact_mobile_phone | 8074683901 ✓ |
| billing_email | billing@zopkit.com ✓ |
| support_email | support@zopkit.com ✓ |
| tax_residence_country | **null** |
| regulatory_compliance_status | **Pending** |
| tax_registration_details | {"pan":"ABCDE1234F","ein":"12-3456789","vat":"VAT123456789","cin":"U12345AB2023PTC123456"} ✓ |
| withholding_tax_applicable | true ✓ |
| updated_at | 2026-02-01 17:31:28.481 |

So **text inputs and the withholding toggle were persisted**; **dropdowns (Salutation, Authority Level, Tax Residence Country, Regulatory Compliance Status) were not**.

---

## Screenshot observations

1. **settings-e2e-after-save** – Green toast “Account settings updated successfully”. Sidebar shows **C. DINESH REDDY / reddycdinesh41@gmail.com**, so the test ran with the **reddycdinesh41** profile, not letszopkit.

2. **settings-e2e-contact-filled** – Contact tab:
   - **Salutation:** still “Select” (dropdown not set).
   - **Authority Level:** still “Select authority level” (dropdown not set).
   - Middle Name, Department, Job Title, phones, emails are filled.

So the **profile used** was reddycdinesh41, and the **dropdowns were never set in the UI** (or not in time before save), which matches the DB: those four fields are null/Pending.

---

## Issues identified

### 1. Profile / tenant mismatch

- Script and docs say “letszopkit profile”, but the run used the **default** persistent profile, which had **reddycdinesh41@gmail.com** logged in.
- So the **letszopkit** tenant in the DB was **not** updated; only **reddycdinesh41’s** tenant was.
- **Takeaway:** To update letszopkit’s tenant, log in as letszopkit in that profile before running the test. To verify after a run, query the tenant for the **logged-in user** (e.g. `admin_email ILIKE '%reddycdinesh%'` or `'%letszopkit%'` depending on who was used).

### 2. Dropdowns (Selects) not persisting

- **Salutation**, **Authority Level**, **Tax Residence Country**, and **Regulatory Compliance Status** stayed null/Pending in the DB and showed “Select” in the screenshot.
- Cause: In the E2E script, the **Select** options were either not clicked reliably (timing, wrong locator) or the chosen value didn’t make it into the form state before “Save Changes”.
- **Takeaway:** Harden the script: after opening each combobox, wait for the option to be visible, then click by **value** (e.g. `[data-value="mr"]`) or by stable role+name so the correct option is selected and the form state (and thus PATCH payload) includes these fields.

---

## Verification query (use the right tenant)

After running the test, verify the **tenant that was actually updated** (same user as in the sidebar):

- If you ran as **letszopkit**:  
  `WHERE admin_email ILIKE '%letszopkit%'`
- If you ran as **reddycdinesh41**:  
  `WHERE admin_email ILIKE '%reddycdinesh%'`

Use the full `SELECT` from the top of this doc with the appropriate `WHERE` clause.
