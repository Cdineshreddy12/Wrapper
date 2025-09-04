#!/bin/bash

# Nginx Setup Script for Multi-Tenant SaaS
# This script helps set up Nginx configuration for subdomain routing

set -e

echo "🚀 Setting up Nginx for Multi-Tenant SaaS Application"
echo "=================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists nginx; then
    echo "❌ Nginx is not installed. Please install Nginx first:"
    echo "   Ubuntu/Debian: sudo apt install nginx"
    echo "   CentOS/RHEL: sudo yum install nginx"
    echo "   macOS: brew install nginx"
    exit 1
fi

if ! command_exists certbot; then
    echo "⚠️  Certbot not found. SSL certificates will need to be configured manually."
fi

echo "✅ Prerequisites check completed"

# Create SSL directory structure
echo "🔐 Setting up SSL certificate directories..."
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private

# Backup existing configuration
echo "💾 Backing up existing Nginx configuration..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Copy our configuration
echo "📄 Installing Nginx configuration..."
sudo cp nginx.conf /etc/nginx/conf.d/default.conf

# Get user input for paths
read -p "Enter the path to your frontend dist directory [/var/www/wrapper-main/frontend/dist]: " FRONTEND_PATH
FRONTEND_PATH=${FRONTEND_PATH:-/var/www/wrapper-main/frontend/dist}

read -p "Enter your backend server address [127.0.0.1:3000]: " BACKEND_SERVER
BACKEND_SERVER=${BACKEND_SERVER:-127.0.0.1:3000}

# Update configuration with user paths
echo "🔧 Updating configuration with your paths..."
sudo sed -i "s|/var/www/wrapper-main/frontend/dist|$FRONTEND_PATH|g" /etc/nginx/conf.d/default.conf
sudo sed -i "s|127\.0\.0\.1:3000|$BACKEND_SERVER|g" /etc/nginx/conf.d/default.conf

# Test configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors. Please check the configuration file."
    exit 1
fi

# Ask about SSL setup
read -p "Do you want to set up SSL certificates now? (y/N): " SETUP_SSL
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    echo "🔐 Setting up SSL certificates..."

    read -p "Enter your main domain [wrapper.zopkit.com]: " MAIN_DOMAIN
    MAIN_DOMAIN=${MAIN_DOMAIN:-wrapper.zopkit.com}

    # Setup main domain certificate
    echo "📜 Setting up certificate for $MAIN_DOMAIN..."
    if command_exists certbot; then
        sudo certbot certonly --nginx -d $MAIN_DOMAIN
    else
        echo "⚠️  Certbot not available. Please manually configure SSL certificates."
        echo "   Place certificates in:"
        echo "   - /etc/ssl/certs/$MAIN_DOMAIN.crt"
        echo "   - /etc/ssl/private/$MAIN_DOMAIN.key"
    fi

    # Setup wildcard certificate
    read -p "Do you want to set up wildcard certificate for subdomains? (y/N): " SETUP_WILDCARD
    if [[ $SETUP_WILDCARD =~ ^[Yy]$ ]]; then
        echo "📜 Setting up wildcard certificate for *.$MAIN_DOMAIN..."
        if command_exists certbot; then
            sudo certbot certonly --manual --preferred-challenges=dns -d "*.$MAIN_DOMAIN"
        else
            echo "⚠️  Certbot not available. Please manually configure wildcard SSL certificate."
        fi
    fi
else
    echo "⚠️  Skipping SSL setup. Make sure to configure SSL certificates manually."
    echo "   Update the ssl_certificate and ssl_certificate_key paths in nginx.conf"
fi

# Create self-signed default certificate for custom domains
echo "🔐 Creating default certificate for custom domains..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/default.key \
  -out /etc/ssl/certs/default.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=default"

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "🎉 Nginx setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Ensure your backend is running on $BACKEND_SERVER"
echo "2. Make sure your frontend files are in $FRONTEND_PATH"
echo "3. Configure DNS records for your domains"
echo "4. Test the setup with: curl -H 'Host: $MAIN_DOMAIN' http://localhost/"
echo ""
echo "📚 For more information, see NGINX_SETUP_README.md"
echo ""
echo "🔍 Useful commands:"
echo "  sudo nginx -t                    # Test configuration"
echo "  sudo systemctl reload nginx      # Reload configuration"
echo "  sudo tail -f /var/log/nginx/error.log    # View error logs"
echo "  sudo tail -f /var/log/nginx/access.log   # View access logs"
