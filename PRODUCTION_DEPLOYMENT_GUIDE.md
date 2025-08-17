# 🚀 **PRODUCTION DEPLOYMENT GUIDE**

## 📋 **OVERVIEW**
This guide will help you deploy the updated Wrapper application to production with all the new CRM permissions and email service fixes.

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### **1. Code Changes Committed** ✅
- [x] CRM permissions updated (7 new modules, 99 new permissions)
- [x] CRM URL updated to https://crm.zopkit.com
- [x] Email service configuration fixed
- [x] Permission sync infrastructure added
- [x] All changes pushed to GitHub

### **2. Production Environment Setup**
- [ ] Production server ready (EC2, VPS, etc.)
- [ ] Production database configured
- [ ] Production environment variables set
- [ ] SSL certificates configured
- [ ] Domain DNS configured

## 🛠️ **DEPLOYMENT OPTIONS**

### **Option 1: Automated Deployment (Recommended)**
Use the existing deployment script:

```bash
# On your production server
cd /path/to/wrapper
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### **Option 2: Manual Deployment**
Follow the step-by-step manual process below.

### **Option 3: GitHub Actions (CI/CD)**
Set up automated deployment through GitHub Actions (requires workflow scope).

## 🚀 **AUTOMATED DEPLOYMENT**

### **Prerequisites on Production Server**
```bash
# Install required software
sudo yum update -y  # For Amazon Linux/CentOS
sudo yum install -y git nodejs npm nginx

# Install PM2 globally
npm install -g pm2

# Create deployment user
sudo useradd -m -s /bin/bash ec2-user
sudo usermod -aG wheel ec2-user
```

### **Run Deployment**
```bash
# Clone repository (if not already done)
git clone https://github.com/Cdineshreddy12/Wrapper.git
cd Wrapper

# Make deployment script executable
chmod +x scripts/deploy.sh

# Run production deployment
./scripts/deploy.sh production
```

## 📝 **MANUAL DEPLOYMENT STEPS**

### **Step 1: Server Preparation**
```bash
# Update system
sudo yum update -y

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
sudo yum install -y nginx
```

### **Step 2: Clone and Setup**
```bash
# Clone repository
git clone https://github.com/Cdineshreddy12/Wrapper.git
cd Wrapper

# Create production environment file
cp backend/env.example backend/.env
nano backend/.env
```

### **Step 3: Configure Production Environment**
Edit `backend/.env` with production values:

```env
# Environment
NODE_ENV=production

# Server Configuration  
PORT=3000
HOST=0.0.0.0
FRONTEND_URL=https://yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://username:password@your-production-db-host:5432/wrapper_prod
DB_POOL_SIZE=50

# Security (generate strong secrets)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Kinde Authentication (production)
KINDE_DOMAIN=https://auth.zopkit.com
KINDE_CLIENT_ID=your-production-kinde-client-id
KINDE_CLIENT_SECRET=your-production-kinde-client-secret

# Brevo Email Service (production)
BREVO_API_KEY=your-production-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your Company Name

# Stripe Configuration (production)
STRIPE_SECRET_KEY=sk_live_your-production-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret

# Application URLs (production)
CRM_APP_URL=https://crm.zopkit.com
```

### **Step 4: Install Dependencies**
```bash
# Backend dependencies
cd backend
npm ci --production

# Frontend dependencies
cd ../frontend
npm ci --production
```

### **Step 5: Build Frontend**
```bash
cd frontend
npm run build
```

### **Step 6: Setup Database**
```bash
cd ../backend

# Run migrations
npm run db:migrate

# Sync permissions (important for new CRM modules)
npm run sync-permissions
```

### **Step 7: Start Backend Service**
```bash
cd backend

# Start with PM2
pm2 start server.js --name "wrapper-api"

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### **Step 8: Configure Nginx**
Create nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Frontend
    location / {
        root /path/to/Wrapper/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/api/health;
    }
}
```

### **Step 9: Start Nginx**
```bash
# Test configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🔧 **POST-DEPLOYMENT VERIFICATION**

### **1. Health Checks**
```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend
curl http://localhost/
```

### **2. Permission Sync Verification**
```bash
cd backend
npm run sync-permissions:summary
```

### **3. Email Service Test**
```bash
cd backend
node test-email-service.js
```

### **4. CRM Permissions Test**
```bash
cd backend
npm run sync-permissions:app crm
```

## 🚨 **CRITICAL PRODUCTION SETTINGS**

### **1. Email Service IP Whitelist**
**IMPORTANT**: Add your production server IP to Brevo whitelist:
1. Go to: https://app.brevo.com/security/authorised_ips
2. Add your production server IP address
3. This is required for user invitations to work

### **2. Database Security**
- Use strong passwords
- Restrict database access to application server only
- Enable SSL connections
- Regular backups

### **3. SSL/TLS Configuration**
- Use Let's Encrypt or commercial certificates
- Enable HTTP/2
- Configure security headers

### **4. Monitoring and Logging**
```bash
# PM2 monitoring
pm2 monit

# Log monitoring
pm2 logs wrapper-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔍 **TROUBLESHOOTING**

### **Common Issues**

**1. Permission Denied**
```bash
# Fix file permissions
sudo chown -R ec2-user:ec2-user /path/to/Wrapper
chmod +x scripts/deploy.sh
```

**2. Port Already in Use**
```bash
# Check what's using port 3000
sudo netstat -tlnp | grep :3000

# Kill process if needed
sudo kill -9 <PID>
```

**3. Database Connection Failed**
```bash
# Test database connection
cd backend
node test-db-connection.js
```

**4. Email Service 401 Error**
```bash
# Check IP whitelist
cd backend
node test-email-service.js
```

## 📊 **DEPLOYMENT STATUS CHECK**

After deployment, verify:

- [ ] Backend service running (PM2 status)
- [ ] Frontend accessible (nginx serving)
- [ ] Database connected
- [ ] Permissions synced
- [ ] Email service working
- [ ] User invitations functional
- [ ] CRM permissions available

## 🎯 **NEXT STEPS**

1. **Deploy to production** using the guide above
2. **Test all functionality** including user invitations
3. **Monitor logs** for any issues
4. **Set up monitoring** and alerting
5. **Configure backups** and disaster recovery
6. **Document production setup** for team

---

**Status**: 🟢 **READY FOR PRODUCTION DEPLOYMENT**  
**Last Updated**: January 2024  
**Version**: 2.0.0 - Production Ready
