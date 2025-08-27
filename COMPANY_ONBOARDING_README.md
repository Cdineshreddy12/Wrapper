# Company Onboarding System

## Overview

This is a comprehensive company onboarding system that replaces the previous multiple onboarding processes with a single, unified form. The system collects all necessary company information in a structured, multi-step process with automatic progress tracking and form prefilling.

## Features

### 🏢 **Company Profile Fields**
- **Company Name** (Required) - 3-80 characters
- **Legal Company Name** - Max 255 characters
- **Company ID/Registration** - Legal entity identification
- **D-U-N-S Number** - 9-digit format for business verification
- **Industry** (Required) - Standard industry picklist
- **Company Type** (Required) - Prospect, Customer, Partner, etc.
- **Ownership** - Public, Private, Subsidiary, etc.
- **Annual Revenue** - Currency field with positive validation
- **Number of Employees** - 1-999999 range
- **Ticker Symbol** - Stock exchange format
- **Website** - Valid URL format
- **Description** - Max 32,000 characters
- **Founded Date** - Cannot be future date

### 📍 **Contact & Address Fields**
- **Billing Address** - Street, City, State, Zip, Country
- **Shipping Address** - Street, City, State, Zip, Country
- **Phone** - E.164 format
- **Fax** - International format

### 🌍 **Localization & Regional Settings**
- **Default Language** (Required) - Supported languages
- **Default Locale** (Required) - Standard locale codes
- **Default Currency** (Required) - ISO currency codes
- **Multi-Currency Enabled** - Checkbox for international business
- **Advanced Currency Management** - Exchange rate management
- **Default Time Zone** (Required) - Standard timezone list
- **First Day of Week** - Sunday/Monday options

### 👤 **Administrator Setup Fields**
- **First Name** (Required) - Max 40 characters
- **Last Name** (Required) - Max 80 characters
- **Email** (Required) - Valid email format
- **Username** (Required) - Must be email format
- **Alias** (Required) - 8 characters max
- **Phone** - International format
- **Mobile** - International format
- **Title** - Max 80 characters
- **Department** - Max 80 characters
- **Role** (Required) - Standard role hierarchy
- **Profile** (Required) - System Administrator default

## Technical Implementation

### Frontend (`frontend/src/pages/CompanyOnboarding.tsx`)
- **React TypeScript** component with modern UI
- **Multi-step form** with progress tracking
- **Auto-save functionality** using localStorage
- **Form validation** with required field checking
- **Responsive design** with Tailwind CSS
- **Progress bar** showing completion percentage
- **Section navigation** with visual indicators

### Backend (`backend/src/routes/onboarding-clean.js`)
- **Fastify endpoint** `/company-setup`
- **Data validation** for required fields
- **Database integration** with Drizzle ORM
- **Tenant creation** with all company details
- **User setup** with admin privileges
- **Role assignment** with custom permissions
- **Subscription creation** with trial period
- **Progress tracking** endpoint `/progress/:userId`

### Form Tracking & Prefilling
- **Automatic progress saving** every 500ms after input changes
- **Local storage persistence** across browser sessions
- **Section state management** to resume from last completed step
- **User data prefilling** from authentication context
- **Form validation** with real-time feedback

## API Endpoints

### POST `/api/onboarding/company-setup`
Creates a new company with all profile information.

**Request Body:**
```json
{
  "companyName": "Acme Corp",
  "industry": "Technology",
  "companyType": "Customer",
  "defaultLanguage": "English",
  "defaultCurrency": "USD",
  "defaultTimeZone": "UTC",
  "adminFirstName": "John",
  "adminLastName": "Doe",
  "adminEmail": "john@acme.com",
  "adminUsername": "john@acme.com",
  "adminRole": "System Administrator",
  "adminProfile": "System Administrator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company setup completed successfully",
  "data": {
    "tenant": {
      "id": "uuid",
      "orgCode": "acmecorp",
      "name": "Acme Corp"
    },
    "user": {
      "id": "uuid",
      "email": "john@acme.com",
      "name": "John Doe"
    },
    "role": {
      "id": "uuid",
      "name": "System Administrator"
    }
  }
}
```

### GET `/api/onboarding/progress/:userId`
Gets the onboarding progress for a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "isComplete": true,
    "tenant": {
      "id": "uuid",
      "name": "Acme Corp",
      "orgCode": "acmecorp",
      "status": "trial"
    }
  }
}
```

## Database Schema

The system creates records in the following tables:
- **tenants** - Company/organization information
- **tenantUsers** - User accounts and profiles
- **customRoles** - Role definitions and permissions
- **userRoleAssignments** - User-role relationships
- **subscriptions** - Trial and billing information

## Usage

### For Users
1. Navigate to `/onboarding`
2. Complete each section of the form
3. Progress is automatically saved
4. Return later to continue from where you left off
5. Submit when all required fields are completed

### For Developers
1. The form automatically handles validation
2. Progress is persisted in localStorage
3. Backend creates complete company setup
4. User is redirected to dashboard upon completion

## Benefits

- **Unified Experience** - Single onboarding flow instead of multiple processes
- **Progress Tracking** - Users can save and resume at any time
- **Comprehensive Data** - All necessary company information collected
- **Validation** - Built-in field validation and error handling
- **Responsive Design** - Works on all device sizes
- **Auto-save** - No data loss during the onboarding process

## Migration from Old System

The old onboarding files have been removed:
- `SimpleOnboarding.tsx`
- `KindeOrganizationOnboarding.tsx`
- `Onboarding.tsx`
- `OrganizationSetup.tsx`

All routes now point to the new `CompanyOnboarding` component at `/onboarding`.

## Future Enhancements

- **Multi-language support** for international users
- **Advanced validation rules** based on company type
- **Integration with external services** (D&B, company databases)
- **Bulk import** for enterprise customers
- **Custom field support** for specific industries
