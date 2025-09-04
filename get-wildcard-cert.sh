#!/bin/bash

# Get Let's Encrypt Wildcard Certificate
# This script helps you get a wildcard certificate for *.yourdomain.com

set -e

echo "🔐 Let's Encrypt Wildcard Certificate Setup"
echo "=========================================="

# Check if certbot is installed
if ! command -v certbot >/dev/null 2>&1; then
    echo "❌ Certbot is not installed."
    echo ""
    echo "Install Certbot:"
    echo "  Ubuntu/Debian: sudo apt install certbot"
    echo "  CentOS/RHEL: sudo yum install certbot"
    echo "  macOS: brew install certbot"
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
echo "  Certificate: *.$DOMAIN"
echo "  Type: Wildcard (covers all subdomains)"
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

echo "🚀 Getting wildcard certificate for *.$DOMAIN"
echo ""
echo "⚠️  IMPORTANT: This requires DNS-01 challenge"
echo "   You'll need to add a TXT record to your DNS"
echo ""

# Get wildcard certificate
echo "📜 Requesting wildcard certificate..."
sudo certbot certonly \
  --manual \
  --preferred-challenges=dns \
  --email admin@$DOMAIN \
  --server https://acme-v02.api.letsencrypt.org/directory \
  --agree-tos \
  -d "*.$DOMAIN" \
  -d $DOMAIN

echo ""
echo "✅ Certificate obtained successfully!"
echo ""
echo "📋 Certificate Details:"
echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "  Valid for: *.$DOMAIN and $DOMAIN"
echo ""

# Check renewal
echo "🔄 Certificate Renewal:"
echo "  Let's Encrypt certificates auto-renew every 90 days"
echo "  Renewal usually happens automatically via cron/systemd"
echo ""
echo "  To manually renew:"
echo "  sudo certbot renew --cert-name $DOMAIN"
echo ""

# Test certificate
echo "🧪 Testing certificate..."
if openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -text -noout | grep -q "DNS:*\.$DOMAIN"; then
    echo "✅ Wildcard certificate is valid"
else
    echo "⚠️  Certificate may not be properly configured"
fi

echo ""
echo "🎉 Setup complete! Your wildcard certificate is ready."
echo ""
echo "📝 Next steps:"
echo "1. Update your Nginx configuration with the certificate paths"
echo "2. Test HTTPS access to your subdomains"
echo "3. Set up automatic renewal monitoring"
