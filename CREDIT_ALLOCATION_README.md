# Credit Allocation System

## Overview

The Credit Allocation System solves the credit duplication problem by allowing organizations to allocate credits from their main pool to specific applications. This ensures that:

- Applications can only consume credits that have been explicitly allocated to them
- No credit duplication occurs across multiple applications
- Fine-grained control over credit usage per application
- Better tracking and management of credit consumption

## Architecture

### Database Schema

#### `credit_allocations` Table
```sql
- allocation_id: UUID (Primary Key)
- tenant_id: UUID (Tenant reference)
- source_entity_id: UUID (Organization entity)
- target_application: VARCHAR (crm, hr, affiliate, system)
- allocated_credits: DECIMAL (Total credits allocated)
- used_credits: DECIMAL (Credits consumed)
- available_credits: DECIMAL (Remaining credits)
- allocation_type: VARCHAR (manual, automatic, bulk)
- allocation_purpose: TEXT (Description)
- is_active: BOOLEAN
- allocated_at: TIMESTAMP
- expires_at: TIMESTAMP (Optional)
- auto_replenish: BOOLEAN
- allocated_by: UUID (User who allocated)
- last_updated_at: TIMESTAMP
```

#### `credit_allocation_transactions` Table
Tracks all changes to credit allocations:
- Allocation/deallocation events
- Credit consumption by applications
- Transfer between applications
- Audit trail for all credit movements

### Core Components

#### Backend Services

1. **`CreditAllocationService`**
   - `allocateCreditsToApplication()` - Allocate credits from org to app
   - `consumeApplicationCredits()` - Applications consume allocated credits
   - `getApplicationAllocations()` - Get allocation summary
   - `getApplicationCreditBalance()` - Check specific app balance
   - `transferCreditsBetweenApplications()` - Transfer between apps

2. **Enhanced `CreditService`**
   - Automatic application credit detection from operation codes
   - Fallback to organization credits when app allocation insufficient
   - Priority system: App allocation → Organization pool

#### Frontend Components

1. **`AdminDashboard`** - Overview with org + app credit stats
2. **`ApplicationCreditAllocations`** - Full allocation management
3. **`CreditBalance`** - Personal credit view with app allocations
4. **`OrganizationHierarchyChart`** - Visual org + app credits display

## Usage

### For Administrators

#### 1. Allocate Credits to Applications
```bash
POST /api/credits/allocate/application
{
  "targetApplication": "crm",
  "creditAmount": 500,
  "allocationPurpose": "Monthly CRM operations"
}
```

#### 2. View All Allocations
```bash
GET /admin/credits/application-allocations
```

#### 3. Transfer Between Applications
```bash
POST /api/credits/transfer/application
{
  "fromApplication": "crm",
  "toApplication": "hr",
  "creditAmount": 100,
  "transferReason": "Reallocating for HR project"
}
```

### For Applications

#### 1. Consume Allocated Credits
```bash
POST /api/credits/consume/application
{
  "application": "crm",
  "creditAmount": 5.0,
  "operationCode": "crm.leads.create",
  "description": "Creating new lead"
}
```

#### 2. Check Application Balance
```bash
GET /api/credits/balance/application/crm
```

### For Users

#### 1. View Personal Credit Balance
The `CreditBalance` component now shows:
- Organization credits (available/reserved)
- Application allocations (per app breakdown)
- Usage statistics

#### 2. Organization Hierarchy View
The hierarchy chart displays:
- Organization credit balances
- Application credit allocations per entity
- Visual indicators for allocation status

## Credit Consumption Flow

### 1. Operation Detection
```javascript
// Operation codes follow pattern: {app}.{module}.{action}
// Examples: crm.leads.create, hr.payroll.process, system.admin.login
const applicationCode = CreditService.extractApplicationFromOperationCode(operationCode);
```

### 2. Priority Consumption
```javascript
if (applicationCode) {
  // Try application allocation first
  const appResult = await consumeApplicationCredits(tenantId, applicationCode, amount);

  if (appResult.success) {
    return appResult; // Success from app allocation
  } else {
    // Fall back to organization credits
    return consumeOrganizationCredits(tenantId, amount);
  }
} else {
  // Direct organization consumption
  return consumeOrganizationCredits(tenantId, amount);
}
```

### 3. Validation & Auto-Replenish
- **Validation**: Check sufficient credits before operations
- **Auto-Replenish**: Automatically allocate more credits when running low
- **Expiry**: Handle allocation expiry and renewal

## Benefits

### ✅ Problem Solved
- **Before**: 1000 org credits × 8 apps = 8000 total credits (duplication)
- **After**: 1000 org credits allocated to specific apps (no duplication)

### ✅ Features
- **Granular Control**: Allocate different amounts per application
- **Audit Trail**: Complete transaction history
- **Auto-Replenish**: Automatic credit replenishment
- **Transfer**: Move credits between applications
- **Validation**: Prevent overspending
- **Expiry**: Time-based credit allocations

### ✅ User Experience
- **Admin Dashboard**: Comprehensive credit overview
- **Application Management**: Easy allocation management
- **Personal Dashboard**: Clear credit visibility
- **Hierarchy View**: Visual credit distribution

## Security & Permissions

### Permission Requirements
- `credits:allocate` - Allocate credits to applications
- `credits:transfer` - Transfer between applications
- `admin:credits` - View all allocations (admin only)

### Data Isolation
- Tenants can only see their own allocations
- Applications can only consume their allocated credits
- Audit logs track all credit movements

## Monitoring & Alerts

### Admin Alerts
- Low application credit warnings
- Expiring allocations
- High credit consumption rates

### User Alerts
- Insufficient application credits
- Allocation expiry warnings
- Auto-replenishment notifications

## Migration Guide

### For Existing Systems
1. Run database migration to create allocation tables
2. Existing credit consumption continues to work
3. Gradually allocate credits to applications
4. Enable application-specific validation as needed

### Backward Compatibility
- All existing credit operations work unchanged
- Organization credits remain the fallback
- No breaking changes to existing APIs

## API Reference

### Core Endpoints

#### Allocation Management
- `POST /api/credits/allocate/application` - Allocate credits
- `GET /api/credits/allocations/application` - Get allocations
- `POST /api/credits/transfer/application` - Transfer credits
- `POST /api/credits/consume/application` - Consume app credits

#### Admin Endpoints
- `GET /admin/credits/application-allocations` - All allocations
- `GET /api/credits/balance/application/:app` - App balance

#### User Endpoints
- `GET /api/credits/current` - Enhanced with app allocations
- `GET /api/credits/balance/application/:app` - App-specific balance

## Troubleshooting

### Common Issues
1. **"Credit Allocation Required"** - Allocate credits to application first
2. **"Insufficient Application Credits"** - Add more credits to allocation
3. **"Allocation Expired"** - Renew or create new allocation

### Debugging
- Check allocation status: `GET /api/credits/balance/application/:app`
- View all allocations: `GET /admin/credits/application-allocations`
- Audit transactions: Check `credit_allocation_transactions` table

## Future Enhancements

### Planned Features
- **Bulk Allocation**: Allocate to multiple apps at once
- **Scheduled Allocation**: Time-based credit distribution
- **Cost Centers**: Department-level credit management
- **Budget Alerts**: Proactive credit usage warnings
- **Analytics**: Detailed credit usage reporting

### Integration Points
- **Billing Systems**: Integration with external billing
- **Usage Analytics**: Advanced consumption reporting
- **Budget Planning**: Predictive credit allocation
- **Multi-Tenant**: Cross-tenant credit sharing

---

This system provides a robust, scalable solution for managing credit allocations across applications while maintaining backward compatibility and providing excellent user experience.
