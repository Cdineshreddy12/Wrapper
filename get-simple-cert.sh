#!/bin/bash

# Get Simple Let's Encrypt Certificate
# For main domain only (no wildcards)

set -e

echo "🔐 Simple Let's Encrypt Certificate Setup"
echo "========================================"

# Check if certbot is installed
if ! command -v certbot >/dev/null 2>&1; then
    echo "❌ Certbot is not installed."
    echo ""
    echo "Install Certbot:"
    echo "  Ubuntu/Debian: sudo apt install certbot python3-certbot-nginx"
    echo "  CentOS/RHEL: sudo yum install certbot python-certbot-nginx"
    exit 1
fi

# Get domain from user
read -p "Enter your domain (e.g., wrapper.zopkit.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

echo ""
echo "📋 Certificate Details:"
echo "  Domain: $DOMAIN"
echo "  Type: Standard (covers only the main domain)"
echo ""

# Check if certificate already exists
if sudo certbot certificates | grep -q "$DOMAIN"; then
    echo "⚠️  Certificate for $DOMAIN already exists!"
    echo ""
    echo "Existing certificates:"
    sudo certbot certificates
    echo ""
    read -p "Do you want to renew the existing certificate? (y/N): " RENEW
    if [[ $RENEW =~ ^[Yy]$ ]]; then
        echo "🔄 Renewing certificate..."
        sudo certbot renew --cert-name $DOMAIN
    fi
    exit 0
fi

echo "🚀 Getting certificate for $DOMAIN"
echo ""
echo "📜 This uses HTTP-01 challenge (automatic)"
echo ""

# Get certificate with nginx plugin
sudo certbot --nginx \
  --email admin@$DOMAIN \
  --agree-tos \
  --redirect \
  -d $DOMAIN

echo ""
echo "✅ Certificate obtained successfully!"
echo ""
echo "📋 Certificate Details:"
echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "  Valid for: $DOMAIN only"
echo ""

# Test certificate
echo "🧪 Testing certificate..."
if openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -text -noout | grep -q "DNS:$DOMAIN"; then
    echo "✅ Certificate is valid"
else
    echo "⚠️  Certificate may not be properly configured"
fi

echo ""
echo "🎉 Setup complete! Your certificate is ready."
echo ""
echo "📝 Note: This certificate only covers $DOMAIN"
echo "   Subdomains like tenant1.$DOMAIN will use HTTP (not HTTPS)"
echo "   Consider getting a wildcard certificate for full HTTPS support"
echo ""
echo "🔄 Certificate Renewal:"
echo "  Let's Encrypt certificates auto-renew every 90 days"
echo "  Manual renewal: sudo certbot renew --cert-name $DOMAIN"
