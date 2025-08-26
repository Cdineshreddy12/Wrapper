# 🚀 GitHub Workflows Summary for Wrapper Application

## 📋 Overview

This document provides a comprehensive overview of the GitHub Actions workflows implemented for the Wrapper application. These workflows automate testing, deployment, and CI/CD processes to ensure reliable and consistent deployments.

## 🔄 Available Workflows

### 1. **CI Workflow** (`.github/workflows/ci.yml`)
**Purpose**: Continuous Integration with comprehensive testing and quality checks

**Triggers**:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches

**Features**:
- ✅ **Multi-Node Testing**: Tests on Node.js 18 and 20
- ✅ **Linting & Testing**: Backend and frontend validation
- ✅ **Type Checking**: TypeScript compilation verification
- ✅ **Code Quality**: Console.log, TODO, and bundle size checks
- ✅ **Database Validation**: Migration and schema verification
- ✅ **Security Audit**: Dependency vulnerability scanning
- ✅ **Performance Analysis**: Dependency size and optimization checks

**Output**: 
- 🟢 **Green**: All checks passed
- 🟡 **Yellow**: Warnings but no critical failures
- 🔴 **Red**: Tests failed, deployment blocked

---

### 2. **Staging Deployment** (`.github/workflows/staging.yml`)
**Purpose**: Deploy changes to staging environment for testing

**Triggers**:
- Pull request creation/updates
- Manual workflow dispatch

**Features**:
- 🚀 **Automatic Deployment**: Deploys on PR creation/updates
- 📝 **PR Comments**: Automatically adds staging URL to PRs
- 🔍 **Comprehensive Testing**: Runs all tests before deployment
- ✅ **Environment Validation**: Verifies staging deployment
- 🔄 **Service Management**: Handles PM2 and nginx updates

**Deployment Path**: `/home/ec2-user/Wrapper-Staging`

---

### 3. **Production Deployment** (`.github/workflows/deploy.yml`)
**Purpose**: Deploy tested changes to production environment

**Triggers**:
- Pushes to `main` branch
- Manual workflow dispatch

**Features**:
- 🚀 **Automatic Deployment**: Deploys on main branch merge
- 🔒 **Production Safety**: Only deploys after CI passes
- ✅ **Health Verification**: Comprehensive deployment validation
- 🔄 **Service Management**: PM2 and nginx updates
- 📊 **Status Notifications**: Success/failure reporting

**Deployment Path**: `/home/ec2-user/Wrapper`

---

## 🔧 Setup Requirements

### **1. GitHub Repository Secrets**

Navigate to your repository: `Settings` → `Secrets and variables` → `Actions`

#### **Required Secrets**
```bash
# EC2 Production Server
EC2_HOST=35.171.71.112
EC2_USER=ec2-user
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
# Your SSH private key content here
-----END OPENSSH PRIVATE KEY-----

# EC2 Staging Server (Optional)
STAGING_HOST=your-staging-ip
STAGING_USER=ec2-user
```

#### **How to Get SSH Private Key**
```bash
# If you already have the key
cat ~/.ssh/wrapper.pem

# If you need to generate a new key
ssh-keygen -t rsa -b 4096 -C "github-actions@wrapper.com"
# Save as wrapper.pem

# Add public key to EC2
ssh-copy-id -i wrapper.pem.pub ec2-user@35.171.71.112
```

### **2. EC2 Server Setup**

#### **Production Server**
```bash
# SSH to your EC2 instance
ssh -i wrapper.pem ec2-user@35.171.71.112

# Create Wrapper directory
mkdir -p /home/ec2-user/Wrapper
cd /home/ec2-user/Wrapper

# Clone your repository
git clone https://github.com/Cdineshreddy12/Wrapper.git .

# Install PM2 globally
npm install -g pm2

# Start the backend service
cd backend
npm install
pm2 start server.js --name wrapper-api

# Save PM2 configuration
pm2 save
pm2 startup

# Setup nginx
sudo yum install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### **Staging Server (Optional)**
```bash
# Create staging directory
mkdir -p /home/ec2-user/Wrapper-Staging
cd /home/ec2-user/Wrapper-Staging

# Clone your repository
git clone https://github.com/Cdineshreddy12/Wrapper.git .

# Install PM2 globally
npm install -g pm2

# Start the staging backend service
cd backend
npm install
pm2 start server.js --name wrapper-api-staging

# Save PM2 configuration
pm2 save
pm2 startup
```

### **3. Nginx Configuration**

#### **Production Config** (`/etc/nginx/nginx.conf`)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root /home/ec2-user/Wrapper/frontend/dist;
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
}
```

#### **Staging Config** (if you have a staging server)
```nginx
server {
    listen 8080;
    server_name staging.your-domain.com;
    
    # Frontend
    location / {
        root /home/ec2-user/Wrapper-Staging/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        # ... same proxy headers as production
    }
}
```

---

## 🚀 Usage Examples

### **1. Automatic Deployment (Recommended)**

#### **Push to Main Branch**
```bash
git add .
git commit -m "Add new feature"
git push origin main
```
**Result**:
- ✅ CI workflow runs automatically
- ✅ Production deployment runs automatically
- ✅ Health checks verify deployment

#### **Create Pull Request**
```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# Create PR on GitHub
```
**Result**:
- ✅ CI workflow runs automatically
- ✅ Staging deployment runs automatically
- ✅ PR comment with staging URL

### **2. Manual Deployment**

#### **Manual Production Deployment**
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select **production** environment
5. Click **Run workflow**

#### **Manual Staging Deployment**
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Staging** workflow
3. Click **Run workflow**
4. Select **staging** environment
5. Click **Run workflow**

---

## 📊 Workflow Status Monitoring

### **CI Workflow Status**
- 🟢 **Green**: All tests passed, code quality checks passed
- 🟡 **Yellow**: Some warnings but no critical failures
- 🔴 **Red**: Tests failed, deployment blocked

### **Deployment Status**
- 🟢 **Success**: Application deployed and verified
- 🔴 **Failed**: Deployment failed, check logs
- 🟡 **Pending**: Deployment in progress

### **Health Check Endpoints**
- **Backend Health**: `GET /api/health`
- **Frontend**: `GET /`
- **Staging Health**: `GET /api/health` (on staging server)

---

## 🔍 Troubleshooting

### **Common Issues & Solutions**

#### **1. SSH Connection Failed**
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa

# Test SSH connection
ssh -i ~/.ssh/id_rsa ec2-user@35.171.71.112

# Verify SSH key in GitHub secrets
# Make sure the entire key is copied including BEGIN and END lines
```

#### **2. PM2 Service Not Found**
```bash
# SSH to EC2
ssh -i wrapper.pem ec2-user@35.171.71.112

# Check PM2 status
pm2 status

# Start service if not running
cd /home/ec2-user/Wrapper/backend
pm2 start server.js --name wrapper-api

# Save and setup startup
pm2 save
pm2 startup
```

#### **3. Nginx Configuration Issues**
```bash
# Check nginx syntax
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Reload nginx
sudo systemctl reload nginx

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### **4. Port Already in Use**
```bash
# Check what's using port 3000
sudo netstat -tlnp | grep :3000

# Kill process if needed
sudo kill -9 <PID>

# Or change port in server.js
const PORT = process.env.PORT || 3001;
```

### **Debug Steps**

#### **1. Check Workflow Logs**
1. Go to **Actions** tab in GitHub
2. Click on failed workflow
3. Click on failed job
4. Check step logs for error messages

#### **2. Check Server Logs**
```bash
# SSH to EC2
ssh -i wrapper.pem ec2-user@35.171.71.112

# Check PM2 logs
pm2 logs wrapper-api

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system logs
sudo journalctl -u nginx -f
```

#### **3. Verify Environment Variables**
```bash
# Check if environment variables are set
echo $NODE_ENV
echo $PORT
echo $DATABASE_URL

# Check .env file
cat .env
```

---

## 📈 Additional Features

### **1. Health Check Routes**
The backend now includes comprehensive health check endpoints:
- `/api/health` - Basic health status
- `/api/health/detailed` - Detailed service status
- `/api/health/ready` - Readiness probe
- `/api/health/live` - Liveness probe
- `/api/health/deployment` - Deployment information

### **2. Deployment Script**
A local deployment script is available at `scripts/deploy.sh`:
```bash
# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging

# Show help
./scripts/deploy.sh --help
```

### **3. Automatic Backups**
The deployment process automatically creates backups before updating:
- Keeps last 3 backups
- Timestamped backup directories
- Automatic cleanup of old backups

---

## 🔒 Security Features

### **1. SSH Key Management**
- Dedicated SSH keys for GitHub Actions
- Regular key rotation recommended
- Limited key permissions on EC2

### **2. Environment Variables**
- Sensitive data stored in GitHub secrets
- No sensitive data committed to repository
- Environment variable validation in workflows

### **3. Access Control**
- Limited EC2 access to necessary users
- IAM roles for EC2 permissions
- SSH access monitoring

---

## 📚 Documentation Files

### **1. Workflow Documentation**
- `.github/README.md` - Detailed workflow setup and usage
- `.github/workflows/` - All workflow YAML files
- `GITHUB_WORKFLOWS_SUMMARY.md` - This summary document

### **2. Application Documentation**
- `CRM_WRAPPER_INTEGRATION_README.md` - CRM integration guide
- `CRM_PERMISSION_API_README.md` - CRM API documentation
- `README.md` - Main project documentation

### **3. Scripts and Utilities**
- `scripts/deploy.sh` - Local deployment script
- `backend/test-crm-integration-simple.js` - CRM integration tests
- `backend/test-enterprise-fixes.js` - Enterprise features tests

---

## 🆘 Support & Maintenance

### **1. Regular Checks**
- Monitor authentication success rates
- Check for new Kinde features
- Update security measures
- Monitor workflow performance

### **2. User Feedback**
- Collect integration feedback
- Monitor error reports
- Improve user experience
- Update documentation

### **3. Troubleshooting Resources**
- Check the troubleshooting section above
- Review workflow logs in GitHub Actions
- Verify server configuration on EC2
- Check GitHub secrets configuration
- Contact development team for assistance

---

## 🎯 Success Metrics

Your GitHub workflows are successful when:
- ✅ **Automated deployments** work reliably
- ✅ **CI checks** catch issues before deployment
- ✅ **Health monitoring** provides real-time status
- ✅ **Rollback procedures** are available when needed
- ✅ **Documentation** is always up-to-date

---

## 🚀 Next Steps

### **1. Immediate Actions**
- [ ] Set up GitHub repository secrets
- [ ] Configure EC2 server environment
- [ ] Test workflows with a small change
- [ ] Verify health check endpoints

### **2. Future Enhancements**
- [ ] Add Slack/Discord notifications
- [ ] Implement automated rollbacks
- [ ] Add performance monitoring
- [ ] Set up staging environment

### **3. Production Deployment**
- [ ] Test in staging environment
- [ ] Monitor production metrics
- [ ] Set up alerting for issues
- [ ] Plan rollback procedures

---

**🎉 Goal**: Automated, reliable, and secure deployment of the Wrapper application!

For questions or support, refer to the detailed documentation files or contact the development team.
