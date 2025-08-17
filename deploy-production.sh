#!/bin/bash

# 🚀 Quick Production Deployment Script
# This script helps you deploy to production quickly

set -e

echo "🚀 **WRAPPER PRODUCTION DEPLOYMENT**"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/deploy.sh" ]; then
    echo "❌ Error: Please run this script from the Wrapper-main directory"
    exit 1
fi

echo "✅ **PRE-DEPLOYMENT CHECKLIST**"
echo "1. Code changes committed and pushed ✅"
echo "2. Production server ready"
echo "3. Production database configured"
echo "4. Production environment variables set"
echo "5. SSL certificates configured"
echo "6. Domain DNS configured"
echo ""

read -p "Are you ready to deploy to production? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🔧 **DEPLOYMENT OPTIONS**"
echo "1. Automated deployment (recommended)"
echo "2. Manual deployment"
echo "3. Show deployment guide"
echo ""

read -p "Choose deployment option (1-3): " option

case $option in
    1)
        echo ""
        echo "🚀 **AUTOMATED DEPLOYMENT**"
        echo "=========================="
        echo ""
        echo "To deploy automatically:"
        echo "1. Copy this repository to your production server"
        echo "2. Run: chmod +x scripts/deploy.sh"
        echo "3. Run: ./scripts/deploy.sh production"
        echo ""
        echo "Prerequisites on production server:"
        echo "- Node.js 18+, npm, PM2, nginx"
        echo "- Production database configured"
        echo "- Production .env file created"
        echo ""
        ;;
    2)
        echo ""
        echo "📝 **MANUAL DEPLOYMENT STEPS**"
        echo "=============================="
        echo ""
        echo "1. Server Preparation:"
        echo "   sudo yum update -y"
        echo "   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
        echo "   sudo yum install -y nodejs npm nginx"
        echo "   npm install -g pm2"
        echo ""
        echo "2. Clone and Setup:"
        echo "   git clone https://github.com/Cdineshreddy12/Wrapper.git"
        echo "   cd Wrapper"
        echo "   cp backend/env.example backend/.env"
        echo "   nano backend/.env  # Edit with production values"
        echo ""
        echo "3. Install and Build:"
        echo "   cd backend && npm ci --production"
        echo "   cd ../frontend && npm ci --production && npm run build"
        echo ""
        echo "4. Database Setup:"
        echo "   cd ../backend"
        echo "   npm run db:migrate"
        echo "   npm run sync-permissions"
        echo ""
        echo "5. Start Services:"
        echo "   pm2 start server.js --name 'wrapper-api'"
        echo "   pm2 save && pm2 startup"
        echo ""
        ;;
    3)
        echo ""
        echo "📖 **DEPLOYMENT GUIDE**"
        echo "======================="
        echo "See: PRODUCTION_DEPLOYMENT_GUIDE.md"
        echo ""
        ;;
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo ""
echo "🚨 **CRITICAL PRODUCTION SETTINGS**"
echo "==================================="
echo "1. Email Service IP Whitelist:"
echo "   - Add production server IP to Brevo whitelist"
echo "   - Go to: https://app.brevo.com/security/authorised_ips"
echo "   - This is required for user invitations to work"
echo ""
echo "2. Environment Variables:"
echo "   - Set NODE_ENV=production"
echo "   - Use production database URLs"
echo "   - Use production API keys and secrets"
echo "   - Set production domain URLs"
echo ""
echo "3. Security:"
echo "   - Generate strong JWT and session secrets"
echo   - Configure SSL certificates
echo "   - Set up firewall rules"
echo ""

echo ""
echo "🎯 **POST-DEPLOYMENT VERIFICATION**"
echo "=================================="
echo "1. Health checks: curl http://localhost:3000/api/health"
echo "2. Permission sync: npm run sync-permissions:summary"
echo "3. Email service: node test-email-service.js"
echo "4. CRM permissions: npm run sync-permissions:app crm"
echo ""

echo ""
echo "📞 **SUPPORT**"
echo "=============="
echo "If you encounter issues:"
echo "1. Check the troubleshooting section in PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "2. Verify all environment variables are set correctly"
echo "3. Check server logs: pm2 logs wrapper-api"
echo "4. Ensure database connection is working"
echo ""

echo ""
echo "🎉 **DEPLOYMENT READY!**"
echo "========================"
echo "Your Wrapper application is ready for production deployment!"
echo "Follow the steps above to deploy successfully."
echo ""
echo "Good luck with your production deployment! 🚀"
