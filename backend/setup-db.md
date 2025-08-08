# Database Setup Guide

## Prerequisites

You need a PostgreSQL database. You can use:

1. **Local PostgreSQL** - Install PostgreSQL locally
2. **Supabase** - Free PostgreSQL hosting
3. **Neon** - Serverless PostgreSQL
4. **Railway** - PostgreSQL hosting

## Environment Variables

Create a `.env` file in the backend directory with:

```env
# Environment
NODE_ENV=development

# Server Configuration  
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000

# Redis Configuration (already configured)
REDIS_URL=redis://redis-12246.c257.us-east-1-3.ec2.redns.redis-cloud.com:12246

# PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database_name

# Security (generate strong secrets)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
INTERNAL_API_KEY=internal-api-key-for-tools

# Optional - Kinde Authentication
KINDE_DOMAIN=your-kinde-domain.kinde.com
KINDE_CLIENT_ID=your-kinde-client-id
KINDE_CLIENT_SECRET=your-kinde-client-secret
KINDE_REDIRECT_URI=http://localhost:3001/api/auth/callback

# Brevo Email Service
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your Company Name

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_BILLING=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
MAX_FILE_SIZE=50000000
```

## Setup Instructions

### 1. Database Setup

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
# Create database
createdb wrapper_dev

# Set DATABASE_URL
DATABASE_URL=postgresql://username:password@localhost:5432/wrapper_dev
```

**Option B: Supabase (Recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the database URL from Settings > Database
4. Use the URL in your `.env` file

### 2. Redis Setup

Redis is already configured with the provided URL:
```env
REDIS_URL=redis://redis-12246.c257.us-east-1-3.ec2.redns.redis-cloud.com:12246
```

### 3. Kinde SSO Setup

1. Go to [kinde.com](https://kinde.com) and create an account
2. Create a new application
3. Configure redirect URLs:
   - Login: `http://localhost:3000/auth/callback`
   - Logout: `http://localhost:3000/login`
4. Copy the domain, client ID, and client secret to your `.env`

### 4. Brevo Email Setup

1. Go to [brevo.com](https://brevo.com) (formerly SendinBlue)
2. Create a free account
3. Go to SMTP & API > API Keys
4. Create a new API key
5. Add the API key to your `.env` file as `BREVO_API_KEY`
6. Set your sender email and name

### 5. Stripe Setup (Optional)

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your test API keys from the dashboard
3. Set up webhook endpoints for subscription events
4. Add keys to your `.env` file

### 6. Initialize Database

```bash
# Generate database schema
npm run db:generate

# Push schema to database  
npm run db:push

# (Optional) Open database studio
npm run db:studio
```

### 7. Start the Server

```bash
npm run dev
```

The server will start on http://localhost:3001

## Testing the Setup

1. **Health Check**: Visit http://localhost:3001/health
2. **API Documentation**: Visit http://localhost:3001/docs
3. **Test Email**: The service will log email attempts if Brevo is not configured
4. **Test Redis**: Check the console for Redis connection status

## Production Deployment

For production:

1. Set `NODE_ENV=production`
2. Use production database URLs
3. Set strong JWT/session secrets
4. Configure production Kinde/Brevo/Stripe accounts
5. Set up SSL certificates
6. Configure environment-specific URLs

## Troubleshooting

### Database Issues
- Ensure PostgreSQL is running
- Check connection string format
- Verify database exists and user has permissions

### Redis Issues
- The provided Redis URL should work out of the box
- Check network connectivity if connection fails

### Email Issues
- Verify Brevo API key is correct
- Check sender email is verified in Brevo
- Review Brevo account limits

### Kinde Issues
- Ensure redirect URLs match exactly
- Check domain configuration
- Verify client credentials

## Features Included

✅ **Multi-tenant architecture** with organization isolation
✅ **SSO authentication** with Kinde
✅ **Email service** with Brevo
✅ **Subscription management** with Stripe
✅ **Advanced permissions** with role-based access
✅ **Usage tracking** with Redis caching
✅ **API documentation** with Swagger
✅ **Rate limiting** and security middleware 