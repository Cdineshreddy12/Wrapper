# 🚀 CREDIT PURCHASING & USER INVITATION SYSTEM

## Overview

Complete implementation guide for **Credit Purchasing** and **User Invitation** systems integrated with your organization/location hierarchy and application-level data isolation.

---

## 💰 CREDIT PURCHASING SYSTEM

### **1. Credit System Architecture**

```javascript
// Multi-level credit management
const creditSystem = {
  tenant: {
    totalCredits: 10000,
    availableCredits: 7500,
    reservedCredits: 2500
  },
  organization: {
    'org-123': { credits: 2000, used: 1200, available: 800 },
    'org-456': { credits: 1500, used: 800, available: 700 }
  },
  location: {
    'loc-123': { credits: 500, used: 300, available: 200 },
    'loc-456': { credits: 800, used: 400, available: 400 }
  }
};
```

### **2. Credit Purchase Flow**

#### **Step 1: Check Current Credit Balance**
```javascript
// GET /api/credits/balance/:entityType/:entityId
const response = await fetch('/api/credits/balance/organization/org-123', {
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Application': 'crm'
  }
});

const balance = {
  totalCredits: 2000,
  usedCredits: 1200,
  availableCredits: 800,
  expiryDate: '2024-12-31'
};
```

#### **Step 2: Get Credit Packages**
```javascript
// GET /api/credits/packages
const packages = await fetch('/api/credits/packages', {
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Application': 'crm'
  }
});

const creditPackages = [
  {
    packageId: 'basic-1000',
    credits: 1000,
    price: 50,
    currency: 'USD',
    validityDays: 365,
    discount: 0
  },
  {
    packageId: 'premium-5000',
    credits: 5000,
    price: 225,  // 10% discount
    currency: 'USD',
    validityDays: 365,
    discount: 10
  },
  {
    packageId: 'enterprise-10000',
    credits: 10000,
    price: 400,  // 20% discount
    currency: 'USD',
    validityDays: 365,
    discount: 20
  }
];
```

#### **Step 3: Purchase Credits**
```javascript
// POST /api/credits/purchase
const purchaseData = {
  packageId: 'premium-5000',
  entityType: 'organization',  // or 'location'
  entityId: 'org-123',
  paymentMethod: 'stripe',
  billingAddress: {
    street: '123 Business St',
    city: 'Bangalore',
    country: 'India',
    zipCode: '560001'
  }
};

const response = await fetch('/api/credits/purchase', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Application': 'crm',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(purchaseData)
});

const purchaseResult = {
  success: true,
  purchaseId: 'pur-123',
  creditsAdded: 5000,
  newBalance: 5800,  // 800 + 5000
  expiryDate: '2024-12-31',
  invoiceUrl: 'https://stripe.com/invoice/inv_123'
};
```

#### **Step 4: Credit Allocation to Sub-Entities**
```javascript
// POST /api/credits/allocate
const allocationData = {
  fromEntityType: 'organization',
  fromEntityId: 'org-123',
  allocations: [
    {
      toEntityType: 'organization',
      toEntityId: 'sub-org-456',
      credits: 1000
    },
    {
      toEntityType: 'location',
      toEntityId: 'loc-789',
      credits: 500
    }
  ]
};

const allocationResponse = await fetch('/api/credits/allocate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Application': 'crm',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(allocationData)
});
```

---

## 👥 USER INVITATION SYSTEM

### **1. Invitation Flow Architecture**

```javascript
const invitationFlow = {
  step1: 'Create Invitation',
  step2: 'Send Email/SMS',
  step3: 'User Accepts',
  step4: 'Account Setup',
  step5: 'Role Assignment',
  step6: 'Entity Assignment'
};
```

### **2. Create User Invitation**

#### **Step 1: Create Invitation**
```javascript
// POST /api/invitations
const invitationData = {
  email: 'john.doe@company.com',
  phone: '+91-9876543210',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',  // tenant_admin, organization_admin, location_manager, user
  entityAssignments: [
    {
      entityType: 'organization',
      entityId: 'org-123',
      role: 'editor'
    },
    {
      entityType: 'location',
      entityId: 'loc-456',
      role: 'viewer'
    }
  ],
  applicationAccess: ['crm', 'hr', 'finance'],
  sendNotification: true,
  expiryHours: 168  // 7 days
};

const invitationResponse = await fetch('/api/invitations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Application': 'crm',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(invitationData)
});

const invitation = {
  success: true,
  invitationId: 'inv-123',
  invitationToken: 'abc123def456',
  expiresAt: '2024-01-15T10:30:00Z',
  inviteUrl: 'https://app.company.com/accept-invitation?token=abc123def456'
};
```

#### **Step 2: Accept Invitation**
```javascript
// POST /api/invitations/accept
const acceptanceData = {
  token: 'abc123def456',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  acceptTerms: true,
  timezone: 'Asia/Kolkata',
  language: 'en'
};

const acceptResponse = await fetch('/api/invitations/accept', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(acceptanceData)
});

const userAccount = {
  success: true,
  userId: 'user-456',
  email: 'john.doe@company.com',
  organizations: ['org-123'],
  locations: ['loc-456'],
  applications: ['crm', 'hr', 'finance'],
  roles: ['editor', 'viewer']
};
```

#### **Step 3: Invitation Management**
```javascript
// GET /api/invitations - List invitations
const invitations = await fetch('/api/invitations?status=pending', {
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Application': 'crm'
  }
});

// PUT /api/invitations/:id - Update invitation
const updateData = {
  status: 'cancelled',
  reason: 'Position no longer available'
};

// DELETE /api/invitations/:id - Cancel invitation
```

---

## 🔧 IMPLEMENTATION STEPS

### **Phase 1: Database Schema**

#### **Credit System Tables:**
```sql
-- Credit packages
CREATE TABLE credit_packages (
  package_id VARCHAR(50) PRIMARY KEY,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  validity_days INTEGER NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit purchases
CREATE TABLE credit_purchases (
  purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(20) NOT NULL, -- organization, location
  entity_id UUID NOT NULL,
  package_id VARCHAR(50) NOT NULL,
  credits_purchased INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_id VARCHAR(100),
  expiry_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit balances
CREATE TABLE credit_balances (
  balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  reserved_credits INTEGER DEFAULT 0,
  expiry_date DATE,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, entity_id)
);

-- Credit allocations
CREATE TABLE credit_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  from_entity_type VARCHAR(20) NOT NULL,
  from_entity_id UUID NOT NULL,
  to_entity_type VARCHAR(20) NOT NULL,
  to_entity_id UUID NOT NULL,
  credits_allocated INTEGER NOT NULL,
  allocated_by UUID NOT NULL,
  allocated_at TIMESTAMP DEFAULT NOW()
);
```

#### **User Invitation Tables:**
```sql
-- User invitations
CREATE TABLE user_invitations (
  invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  invitation_token VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, cancelled
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  role VARCHAR(50) DEFAULT 'user',
  application_access JSONB DEFAULT '[]',
  entity_assignments JSONB DEFAULT '[]',
  invitation_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invitation activities
CREATE TABLE invitation_activities (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- created, sent, viewed, accepted, expired
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Phase 2: API Implementation**

#### **Credit APIs:**
```javascript
// Credit Management Routes
POST   /api/credits/packages          # Get available packages
GET    /api/credits/balance/:type/:id # Get credit balance
POST   /api/credits/purchase          # Purchase credits
POST   /api/credits/allocate          # Allocate credits
GET    /api/credits/transactions     # Get credit transactions
GET    /api/credits/usage            # Get credit usage analytics
```

#### **Invitation APIs:**
```javascript
// User Invitation Routes
POST   /api/invitations               # Create invitation
GET    /api/invitations               # List invitations
GET    /api/invitations/:id           # Get invitation details
PUT    /api/invitations/:id           # Update invitation
DELETE /api/invitations/:id           # Cancel invitation
POST   /api/invitations/accept        # Accept invitation
POST   /api/invitations/resend/:id    # Resend invitation
```

### **Phase 3: Service Implementation**

#### **Credit Service:**
```javascript
class CreditService {
  async purchaseCredits(purchaseData) {
    // Validate package
    // Process payment via Stripe
    // Update credit balance
    // Create transaction record
    // Send confirmation email
  }

  async allocateCredits(allocationData) {
    // Validate available credits
    // Check allocation permissions
    // Update balances
    // Create allocation record
    // Send notifications
  }

  async getCreditBalance(entityType, entityId) {
    // Calculate current balance
    // Include expiry information
    // Return formatted response
  }
}
```

#### **Invitation Service:**
```javascript
class InvitationService {
  async createInvitation(invitationData) {
    // Generate secure token
    // Create invitation record
    // Send email/SMS notification
    // Create activity log
  }

  async acceptInvitation(token, userData) {
    // Validate token
    // Create user account
    // Assign roles and entities
    // Update invitation status
    // Send welcome email
  }

  async resendInvitation(invitationId) {
    // Check invitation status
    // Generate new token if needed
    // Send notification
    // Update activity log
  }
}
```

---

## 💳 PAYMENT INTEGRATION

### **Stripe Integration:**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // $50.00
  currency: 'usd',
  metadata: {
    packageId: 'premium-5000',
    entityType: 'organization',
    entityId: 'org-123'
  }
});

// Handle webhook
app.post('/webhooks/stripe', (req, res) => {
  const event = req.body;

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    // Update credit balance
    // Send confirmation email
  }
});
```

### **Credit Package Configuration:**
```javascript
const creditPackages = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1000,
    price: 50,
    stripePriceId: 'price_starter',
    features: ['Basic Support', 'Email Notifications']
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 5000,
    price: 225,
    stripePriceId: 'price_professional',
    features: ['Priority Support', 'Advanced Analytics', 'API Access']
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 25000,
    price: 1000,
    stripePriceId: 'price_enterprise',
    features: ['Dedicated Support', 'Custom Integrations', 'SLA Guarantee']
  }
];
```

---

## 📧 NOTIFICATION SYSTEM

### **Email Templates:**
```javascript
const emailTemplates = {
  invitation: {
    subject: 'You\'re invited to join {{organizationName}}',
    template: `
      <h2>Welcome to {{organizationName}}!</h2>
      <p>You've been invited to join our team.</p>
      <p>Click here to accept: {{invitationUrl}}</p>
      <p>This invitation expires in {{expiryHours}} hours.</p>
    `
  },

  creditPurchase: {
    subject: 'Credit Purchase Confirmation',
    template: `
      <h2>Thank you for your purchase!</h2>
      <p>You've successfully purchased {{credits}} credits.</p>
      <p>New Balance: {{newBalance}} credits</p>
      <p>Expiry Date: {{expiryDate}}</p>
    `
  },

  creditAllocated: {
    subject: 'Credits Allocated to Your Account',
    template: `
      <h2>Credits Allocated</h2>
      <p>{{credits}} credits have been allocated to your account.</p>
      <p>Allocated by: {{allocatedBy}}</p>
      <p>New Balance: {{newBalance}} credits</p>
    `
  }
};
```

### **SMS Notifications:**
```javascript
const smsTemplates = {
  invitation: 'You\'re invited to join {{organizationName}}. Accept: {{invitationUrl}}',
  creditPurchase: 'Purchase confirmed! {{credits}} credits added. Balance: {{newBalance}}',
  creditLow: 'Credit balance low: {{availableCredits}} remaining. Purchase more: {{purchaseUrl}}'
};
```

---

## 🔒 SECURITY FEATURES

### **Credit Security:**
- ✅ **Audit Trail**: All credit transactions logged
- ✅ **Fraud Detection**: Suspicious activity monitoring
- ✅ **Balance Validation**: Prevent negative balances
- ✅ **Expiry Management**: Automatic credit expiration
- ✅ **Permission Checks**: Only authorized users can allocate credits

### **Invitation Security:**
- ✅ **Secure Tokens**: Cryptographically secure invitation tokens
- ✅ **Token Expiration**: Automatic cleanup of expired invitations
- ✅ **Rate Limiting**: Prevent invitation spam
- ✅ **IP Tracking**: Monitor invitation acceptance locations
- ✅ **Role Validation**: Prevent privilege escalation

---

## 📊 ANALYTICS & REPORTING

### **Credit Analytics:**
```javascript
const creditAnalytics = {
  usageByApplication: {
    crm: { used: 1200, remaining: 800 },
    hr: { used: 800, remaining: 1200 },
    finance: { used: 600, remaining: 1400 }
  },
  usageByEntity: {
    organizations: 1500,
    locations: 1100
  },
  purchaseHistory: [
    { date: '2024-01-01', credits: 1000, amount: 50 },
    { date: '2024-01-15', credits: 2000, amount: 90 }
  ],
  expiryAlerts: [
    { entity: 'org-123', credits: 500, expiryDate: '2024-02-01' }
  ]
};
```

### **Invitation Analytics:**
```javascript
const invitationAnalytics = {
  totalSent: 150,
  accepted: 120,
  pending: 20,
  expired: 10,
  acceptanceRate: 80,
  averageAcceptanceTime: '2.5 hours',
  topInvitationSources: ['email', 'sms', 'direct_link']
};
```

---

## 🚀 IMPLEMENTATION ROADMAP

### **Week 1-2: Foundation**
- ✅ Database schema design
- ✅ Basic API endpoints
- ✅ Stripe payment integration
- ✅ Email/SMS notification setup

### **Week 3-4: Core Features**
- ✅ Credit purchase flow
- ✅ User invitation system
- ✅ Credit allocation system
- ✅ Basic analytics dashboard

### **Week 5-6: Advanced Features**
- ✅ Bulk operations
- ✅ Advanced analytics
- ✅ Fraud detection
- ✅ Automated notifications

### **Week 7-8: Testing & Optimization**
- ✅ Comprehensive testing
- ✅ Performance optimization
- ✅ Security audit
- ✅ Production deployment

---

## 🎯 SUCCESS METRICS

### **Credit System:**
- ✅ **Conversion Rate**: 15-25% trial-to-paid conversion
- ✅ **Average Purchase**: $100-200 per transaction
- ✅ **Retention Rate**: 85%+ monthly active users
- ✅ **Credit Utilization**: 70-80% of purchased credits used

### **Invitation System:**
- ✅ **Acceptance Rate**: 60-80% invitation acceptance
- ✅ **Time to Accept**: < 24 hours average
- ✅ **User Activation**: 90%+ of accepted users become active
- ✅ **Onboarding Completion**: 75%+ complete full setup

---

## 📞 NEXT STEPS

### **Immediate Actions (This Week):**
1. **Set up Stripe account** and configure webhooks
2. **Design email/SMS templates** for notifications
3. **Create credit package pricing** strategy
4. **Plan invitation workflow** and user journey

### **Short-term Goals (Next 2 Weeks):**
1. **Implement credit purchase API** endpoints
2. **Build user invitation system** with token management
3. **Create admin dashboard** for credit and invitation management
4. **Set up automated notifications** and alerts

### **Integration Points:**
1. **Frontend Components**: Credit purchase forms, invitation management
2. **Admin Dashboard**: Credit analytics, user management
3. **Notification System**: Email/SMS templates and delivery
4. **Payment Processing**: Stripe integration and error handling

---

## 💰 MONETIZATION STRATEGY

### **Credit-Based Pricing:**
```javascript
const pricingTiers = {
  free: {
    credits: 100,
    features: ['Basic CRM', '1 Location', 'Email Support']
  },
  starter: {
    credits: 1000,
    price: 50,
    features: ['All Apps', '5 Locations', 'Priority Support']
  },
  professional: {
    credits: 5000,
    price: 225,
    features: ['Advanced Analytics', 'Unlimited Locations', 'API Access']
  },
  enterprise: {
    credits: 25000,
    price: 1000,
    features: ['Custom Integrations', 'Dedicated Support', 'SLA Guarantee']
  }
};
```

### **Revenue Streams:**
- ✅ **Credit Package Sales**: Primary revenue source
- ✅ **Premium Support**: Add-on service
- ✅ **Custom Integrations**: Enterprise add-on
- ✅ **White-label Solutions**: B2B partnerships

---

## 🎉 CONCLUSION

**Your credit purchasing and user invitation system will:**

1. **💰 Generate Revenue**: Through credit package sales and premium services
2. **👥 Drive User Growth**: Via seamless invitation and onboarding process
3. **📊 Provide Insights**: Through comprehensive analytics and reporting
4. **🔒 Ensure Security**: With enterprise-grade access controls
5. **🚀 Scale Effortlessly**: Built on your existing architecture

**Ready to implement the next phase of your business suite!** 🚀

---

## 📞 QUESTIONS & NEXT ACTIONS

**Do you want to:**

1. **🎯 Start with credit purchasing** - Set up Stripe and create purchase flow?
2. **👥 Begin with user invitations** - Implement invitation system first?
3. **📊 Focus on analytics** - Build dashboards and reporting first?
4. **🔧 Need technical specifications** - Detailed API documentation?

**Let's build the monetization engine for your business suite!** 💰
