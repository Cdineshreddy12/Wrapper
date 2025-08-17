# 🔄 **PERMISSION MATRIX SYNC SETUP**

## 📋 **Overview**
This guide will help you sync the updated CRM permissions from the permission matrix to your database.

## ✅ **What's Already Done**
- ✅ **CRM URL Updated**: Changed from `http://localhost:3002` to `https://crm.zopkit.com`
- ✅ **Missing Modules Added**: All 7 missing CRM modules have been added
- ✅ **Missing Permissions Added**: All missing permissions for existing modules
- ✅ **System Module Enhanced**: Added user, role, activity logs, and reports permissions
- ✅ **Sync Script Created**: `src/scripts/sync-permissions.js` is ready to use

## 🆕 **New CRM Modules Added**
1. **🧾 Invoices Module** - Complete invoice management
2. **📦 Inventory Module** - Product inventory and stock management
3. **🛒 Product Orders Module** - Order fulfillment management
4. **🎫 Tickets Module** - Customer support ticket management
5. **📞 Communications Module** - Customer communication management
6. **📅 Calendar Module** - Appointment and meeting management
7. **🤖 AI Insights Module** - AI-powered analytics

## 🚀 **Quick Setup Steps**

### **1. Environment Setup**
Create a `.env` file in the backend directory:

```bash
# Copy the example
cp env.example .env

# Edit with your database details
nano .env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/wrapper_db
DB_POOL_SIZE=20

# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key

# CRM URL (already updated in matrix)
CRM_APP_URL=https://crm.zopkit.com
```

### **2. Test Database Connection**
```bash
# Test if database is accessible
node test-db-connection.js
```

### **3. Run Permission Sync**
```bash
# Full sync (recommended)
npm run sync-permissions

# Or sync specific app
npm run sync-permissions:app crm

# Validate matrix only
npm run sync-permissions:validate

# Show summary
npm run sync-permissions:summary
```

## 📊 **Expected Results**

After successful sync, you should see:

```
🎉 **SYNC COMPLETED SUCCESSFULLY**

📊 **SYNC STATISTICS**
   Applications Created: 0
   Applications Updated: 1 (CRM)
   Modules Created: 7 (new CRM modules)
   Modules Updated: 6 (existing CRM modules)
   Total Applications: 3
   Total Modules: 25+
   Total Permissions: 200+
```

## 🔍 **Verification**

### **Check Database Tables**
```sql
-- Check applications
SELECT app_code, app_name, base_url FROM applications WHERE app_code = 'crm';

-- Check modules
SELECT module_code, module_name, is_core FROM application_modules WHERE app_id = (
  SELECT app_id FROM applications WHERE app_code = 'crm'
);

-- Check permissions count
SELECT COUNT(*) as total_permissions FROM application_modules WHERE app_id = (
  SELECT app_id FROM applications WHERE app_code = 'crm'
);
```

### **Check Frontend**
1. Open the Role Builder in your frontend
2. Navigate to CRM section
3. Verify all new modules are visible:
   - Invoices
   - Inventory
   - Product Orders
   - Tickets
   - Communications
   - Calendar
   - AI Insights

## 🛠️ **Troubleshooting**

### **Common Issues**

**1. Database Connection Failed**
```bash
❌ Database connection failed: connect ECONNREFUSED
💡 Solution: Make sure PostgreSQL is running
```

**2. Missing Environment Variables**
```bash
❌ DATABASE_URL environment variable is required
💡 Solution: Create .env file with DATABASE_URL
```

**3. Permission Denied**
```bash
❌ permission denied for table applications
💡 Solution: Check database user permissions
```

**4. Table Does Not Exist**
```bash
❌ relation "applications" does not exist
💡 Solution: Run database migrations first
```

### **Run Migrations First**
If tables don't exist:
```bash
# Generate migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate
```

## 📝 **Manual Database Setup**

If you prefer to set up manually:

### **1. Create Tables**
```sql
-- Applications table
CREATE TABLE applications (
  app_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code VARCHAR(50) UNIQUE NOT NULL,
  app_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  base_url VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  version VARCHAR(20),
  is_core BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Application modules table
CREATE TABLE application_modules (
  module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES applications(app_id),
  module_code VARCHAR(50) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT false,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Insert CRM Application**
```sql
INSERT INTO applications (app_code, app_name, description, icon, base_url, version, is_core, sort_order)
VALUES (
  'crm',
  'Customer Relationship Management',
  'Complete CRM solution for managing customers, deals, and sales pipeline',
  '💼',
  'https://crm.zopkit.com',
  '2.0.0',
  true,
  1
);
```

## 🎯 **Next Steps**

After successful sync:

1. **Test Role Creation**: Create a new role with the new permissions
2. **Verify Frontend**: Check that all modules appear in the role builder
3. **Update Documentation**: Update any API documentation
4. **Test Permissions**: Verify that permission checks work correctly

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Verify database connection with `test-db-connection.js`
3. Check console logs for detailed error messages
4. Ensure all environment variables are set correctly

---

**Last Updated**: January 2024  
**Status**: ✅ Ready for sync
