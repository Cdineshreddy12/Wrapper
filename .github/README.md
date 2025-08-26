# 🚀 GitHub Workflows for Wrapper Application

This directory contains GitHub Actions workflows for automated testing, deployment, and CI/CD of the Wrapper application.

## 📋 Available Workflows

### 1. **CI Workflow** (`ci.yml`)
- **Triggers**: Pull requests and pushes to `main` and `develop` branches
- **Purpose**: Continuous Integration with comprehensive testing and quality checks
- **Features**:
  - Linting and testing on multiple Node.js versions
  - Code quality checks (console.log, TODO comments, bundle size)
  - Database migration validation
  - Performance and security audits
  - Dependency analysis

### 2. **Staging Deployment** (`staging.yml`)
- **Triggers**: Pull requests and manual workflow dispatch
- **Purpose**: Deploy changes to staging environment for testing
- **Features**:
  - Automatic deployment on PR creation/updates
  - PR comments with staging URL
  - Comprehensive testing before deployment
  - Staging environment validation

### 3. **Production Deployment** (`deploy.yml`)
- **Triggers**: Pushes to `main` branch and manual workflow dispatch
- **Purpose**: Deploy tested changes to production environment
- **Features**:
  - Automatic deployment on main branch merge
  - Production environment validation
  - Health checks and verification
  - Rollback capabilities

## 🔧 Setup Instructions

### **1. Repository Secrets**

Add these secrets in your GitHub repository (`Settings` → `Secrets and variables` → `Actions`):

#### **Required Secrets**
```bash
# EC2 Production Server
EC2_HOST=35.171.71.112
EC2_USER=ec2-user
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
# Your SSH private key content here
-----END OPENSSH PRIVATE KEY-----

# EC2 Staging Server (if you have one)
STAGING_HOST=your-staging-ip
STAGING_USER=ec2-user
```

#### **How to Get SSH Private Key**
1. **If you already have the key**:
   ```bash
   cat ~/.ssh/wrapper.pem
   # Copy the entire content including BEGIN and END lines
   ```

2. **If you need to generate a new key**:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@wrapper.com"
   # Save as wrapper.pem
   ```

3. **Add public key to EC2**:
   ```bash
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

# Setup nginx (if not already configured)
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

#### **Production Nginx Config** (`/etc/nginx/nginx.conf`)
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
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

#### **Staging Nginx Config** (if you have a staging server)
```nginx
server {
    listen 8080;  # Different port for staging
    server_name staging.your-domain.com;
    
    # Frontend
    location / {
        root /home/ec2-user/Wrapper-Staging/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;  # Different port for staging
        # ... same proxy headers as production
    }
}
```

## 🚀 Usage

### **Automatic Deployment**

#### **1. Push to Main Branch**
```bash
git add .
git commit -m "Add new feature"
git push origin main
```
- ✅ **CI workflow** runs automatically
- ✅ **Production deployment** runs automatically
- ✅ **Health checks** verify deployment

#### **2. Create Pull Request**
```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# Create PR on GitHub
```
- ✅ **CI workflow** runs automatically
- ✅ **Staging deployment** runs automatically
- ✅ **PR comment** with staging URL

### **Manual Deployment**

#### **1. Manual Production Deployment**
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select **production** environment
5. Click **Run workflow**

#### **2. Manual Staging Deployment**
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Staging** workflow
3. Click **Run workflow**
4. Select **staging** environment
5. Click **Run workflow**

## 📊 Workflow Status

### **CI Workflow Status**
- 🟢 **Green**: All tests passed, code quality checks passed
- 🟡 **Yellow**: Some warnings but no critical failures
- 🔴 **Red**: Tests failed, deployment blocked

### **Deployment Status**
- 🟢 **Success**: Application deployed and verified
- 🔴 **Failed**: Deployment failed, check logs
- 🟡 **Pending**: Deployment in progress

## 🔍 Troubleshooting

### **Common Issues**

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

## 📈 Monitoring and Alerts

### **1. Health Check Endpoints**
- **Backend Health**: `GET /api/health`
- **Frontend**: `GET /`
- **Staging Health**: `GET /api/health` (on staging server)

### **2. Performance Monitoring**
- **Bundle Size**: Checked in CI workflow
- **Dependencies**: Security audits in CI
- **Database**: Migration validation in CI

### **3. Deployment Notifications**
- **GitHub Actions**: Automatic status updates
- **PR Comments**: Staging deployment URLs
- **Workflow Status**: Success/failure notifications

## 🔒 Security Considerations

### **1. SSH Key Management**
- Use dedicated SSH keys for GitHub Actions
- Rotate keys regularly
- Limit key permissions on EC2

### **2. Environment Variables**
- Never commit sensitive data to repository
- Use GitHub secrets for all sensitive values
- Validate environment variables in workflows

### **3. Access Control**
- Limit EC2 access to necessary users only
- Use IAM roles for EC2 permissions
- Monitor SSH access logs

## 📚 Additional Resources

### **1. GitHub Actions Documentation**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### **2. PM2 Documentation**
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)

### **3. Nginx Documentation**
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Configuration](https://nginx.org/en/docs/beginners_guide.html)

## 🆘 Support

If you encounter issues with the workflows:

1. **Check the troubleshooting section** above
2. **Review workflow logs** in GitHub Actions
3. **Verify server configuration** on EC2
4. **Check GitHub secrets** are properly configured
5. **Contact the development team** for assistance

---

**🎯 Goal**: Automated, reliable, and secure deployment of the Wrapper application!

For questions or support, refer to the main project documentation or contact the development team.
