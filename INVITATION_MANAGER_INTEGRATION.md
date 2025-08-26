# Invitation Manager Integration Guide

## Overview
The Invitation Manager has been successfully integrated into the admin dashboard, providing administrators with a comprehensive tool to manage team invitations, view invitation URLs, and handle invitation lifecycle.

## Features Implemented

### 1. Backend API Endpoints
- **GET** `/api/invitations/admin/:orgCode` - Get all invitations for an organization
- **POST** `/api/invitations/admin/:orgCode/:invitationId/resend` - Resend invitation email
- **DELETE** `/api/invitations/admin/:orgCode/:invitationId` - Cancel invitation
- **POST** `/api/invitations/create-test-invitation` - Create new invitation

### 2. Frontend Components
- **InvitationManager** - Main component for managing invitations
- **AdminDashboard** - Dashboard page with tabs including invitations
- **TestInvitationManager** - Test page for development

### 3. Key Features
- ✅ View all invitations with status (pending, accepted, expired)
- ✅ Copy invitation URLs to clipboard
- ✅ Open invitation URLs directly
- ✅ Resend invitation emails
- ✅ Cancel pending invitations
- ✅ Create new invitations
- ✅ Summary statistics (total, pending, accepted, expired)
- ✅ Organization switching support

## How to Access

### Option 1: Through Admin Dashboard
1. Navigate to `/dashboard/admin` (main dashboard)
2. Or navigate to `/org/{orgCode}/admin` (organization-specific)
3. Click on the "Invitations" tab

### Option 2: Direct Test Page
1. Navigate to `/test-invitation-manager` (for testing without auth)

### Option 3: Navigation Menu
1. In the dashboard sidebar, click on "Admin"
2. This will take you to the admin dashboard with invitation management

## Usage Instructions

### Viewing Invitations
1. The dashboard shows all invitations in a table format
2. Each invitation displays:
   - Email address
   - Role assigned
   - Status (with color-coded badges)
   - Invited by
   - Invitation date
   - Expiration date
   - Days until expiry

### Managing Invitations
1. **Copy URL**: Click the copy button to copy invitation URL to clipboard
2. **Open URL**: Click the external link button to open invitation URL
3. **Resend Email**: Click the mail button to resend invitation email
4. **Cancel**: Click the trash button to cancel pending invitations

### Creating New Invitations
1. Use the "Create New Invitation" form at the top
2. Enter email address and select role
3. Click "Create Invitation"
4. The invitation will be created and appear in the list

### Sharing Invitation URLs
1. If emails fail to send, you can share the invitation URLs directly
2. Click "View All Invitation URLs" button to see all pending invitation URLs
3. Copy and share these URLs with your team members
4. URLs are in format: `http://localhost:3001/invite?token={invitationToken}`

## API Response Format

### Get Invitations Response
```json
{
  "success": true,
  "organization": {
    "tenantId": "uuid",
    "companyName": "Company Name",
    "kindeOrgId": "org_code"
  },
  "invitations": [
    {
      "invitationId": "uuid",
      "email": "user@example.com",
      "roleName": "Member",
      "status": "pending",
      "invitedBy": "Admin Name",
      "invitedAt": "2025-08-24T16:58:44.000Z",
      "expiresAt": "2025-08-31T16:58:44.000Z",
      "invitationUrl": "http://localhost:3001/invite?token=abc123",
      "isExpired": false,
      "daysUntilExpiry": 7
    }
  ],
  "summary": {
    "total": 3,
    "pending": 2,
    "accepted": 1,
    "expired": 0
  }
}
```

## Environment Variables

Make sure these are set in your `.env` file:
```bash
FRONTEND_URL=http://localhost:3001  # For generating invitation URLs
```

## Troubleshooting

### Common Issues

1. **Invitation URLs not working**
   - Check if `FRONTEND_URL` environment variable is set correctly
   - Verify the frontend is running on the specified URL

2. **Cannot see invitations**
   - Check if you're using the correct organization code
   - Verify the user has admin permissions

3. **Email resend failing**
   - Check email service configuration
   - The system will provide the invitation URL as fallback

4. **Component not loading**
   - Check browser console for errors
   - Verify all imports are correct
   - Check if the route is properly configured

### Testing

1. **Test the API endpoints**:
   ```bash
   # Get invitations
   curl "http://localhost:3000/api/invitations/admin/org_0e3615925db1d"
   
   # Create test invitation
   curl -X POST "http://localhost:3000/api/invitations/create-test-invitation" \
     -H "Content-Type: application/json" \
     -d '{"orgCode":"org_0e3615925db1d","email":"test@example.com","roleName":"Member"}'
   ```

2. **Test the frontend**:
   - Navigate to `/test-invitation-manager` for isolated testing
   - Navigate to `/dashboard/admin` for full dashboard experience

## Next Steps

1. **Customize the UI**: Modify colors, layout, and styling as needed
2. **Add more features**: Bulk operations, invitation templates, etc.
3. **Integrate with email service**: Ensure proper email delivery
4. **Add analytics**: Track invitation acceptance rates and patterns
5. **Role management**: Allow admins to create custom roles for invitations

## Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Check the backend logs for API errors
3. Verify all routes are properly configured
4. Test the API endpoints directly with curl
5. Check if all required components are imported correctly
