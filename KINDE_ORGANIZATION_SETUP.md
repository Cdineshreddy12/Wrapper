# Kinde Organization Management Setup

## Problem
When accepting user invitations, users are not being added to Kinde organizations. The API returns "No users added" even though the request is successful.

## Root Cause
Your M2M (Machine-to-Machine) client in Kinde doesn't have the necessary permissions to manage organization memberships.

## Solution

### Step 1: Configure M2M Client Permissions
1. **Go to Kinde Dashboard**: Navigate to your Kinde admin dashboard
2. **Find M2M Application**: Go to **Settings → Applications**
3. **Select your M2M app**: Click on your M2M application (usually named something like "Backend API" or similar)
4. **Add Required Scopes**:
   - `admin` (full administrative access)
   - `organizations:read` (read organization data)
   - `organizations:write` (manage organization memberships)

### Step 2: Configure Organization Settings
1. **Go to Organizations**: In Kinde dashboard, go to **Settings → Organizations**
2. **Select your organization**: Click on the organization you want to manage
3. **Enable M2M Management**: Ensure "Allow M2M access" is enabled
4. **Assign Admin Role**: Make sure your M2M client has the "Organization Admin" role

### Step 3: Update Environment Variables
Add these to your `.env` file:
```bash
KINDE_MANAGEMENT_SCOPES=admin,organizations:read,organizations:write
KINDE_MANAGEMENT_AUDIENCE=https://your-domain.kinde.com/api
```

### Step 4: Test the Setup
1. **Restart your server**: `npm run dev`
2. **Try invitation acceptance**: Accept a multi-entity invitation
3. **Check logs**: You should see successful organization assignment

## Alternative: Skip Kinde Organization Management

If you can't configure M2M permissions, the invitation system will still work perfectly for internal user management. Kinde organization assignment is optional - users will be properly managed in your internal database with correct permissions and memberships.

The system is designed to be resilient and will continue working even if Kinde organization management fails.

## Troubleshooting

### "No users added" error
- M2M client lacks organization management permissions
- Organization doesn't allow M2M access
- Wrong organization code format

### 404 errors on organization endpoints
- M2M client doesn't have read permissions for organizations
- API endpoints have changed in your Kinde version

### Environment Variables
Make sure these are set correctly:
```bash
KINDE_DOMAIN=https://your-domain.kinde.com
KINDE_M2M_CLIENT_ID=your_m2m_client_id
KINDE_M2M_CLIENT_SECRET=your_m2m_client_secret
KINDE_MANAGEMENT_AUDIENCE=https://your-domain.kinde.com/api
KINDE_MANAGEMENT_SCOPES=admin,organizations:read,organizations:write
```
