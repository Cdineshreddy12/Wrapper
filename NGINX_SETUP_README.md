# Nginx Multi-Tenant Configuration

This guide explains how to configure Nginx to handle subdomain routing for your multi-tenant SaaS application.

## 🏗️ Architecture Overview

```
Internet → Nginx (Port 80/443) → Backend API (Port 3000)
                              → Frontend Static Files
```

Nginx handles:
- **Main Domain:** `wrapper.zopkit.com`
- **Subdomains:** `*.wrapper.zopkit.com` (e.g., `tenant1.wrapper.zopkit.com`)
- **Custom Domains:** Any other domain pointing to your server

## 📁 Files Structure

```
/etc/nginx/
├── conf.d/
│   └── default.conf (our main config)
├── ssl/
│   ├── certs/
│   │   ├── wrapper.zopkit.com.crt
│   │   ├── wildcard.zopkit.com.crt
│   │   └── default.crt
│   └── private/
│       ├── wrapper.zopkit.com.key
│       ├── wildcard.zopkit.com.key
│       └── default.key
```

## 🔧 Installation & Setup

### 1. Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# macOS (with Homebrew)
brew install nginx
```

### 2. SSL Certificates

You need three types of SSL certificates:

#### A. Main Domain Certificate
```bash
# Let's Encrypt for wrapper.zopkit.com
sudo certbot certonly --nginx -d wrapper.zopkit.com
```

#### B. Wildcard Certificate
```bash
# Let's Encrypt wildcard certificate
sudo certbot certonly --manual --preferred-challenges=dns -d "*.wrapper.zopkit.com"
```

#### C. Default Certificate (for custom domains)
```bash
# Self-signed or purchase wildcard certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/default.key \
  -out /etc/ssl/certs/default.crt
```

### 3. Configure Nginx

```bash
# Copy our configuration
sudo cp nginx.conf /etc/nginx/conf.d/default.conf

# Update paths in the config file
sudo sed -i 's|/var/www/wrapper-main/frontend/dist|/path/to/your/frontend/dist|g' /etc/nginx/conf.d/default.conf
sudo sed -i 's|127.0.0.1:3000|your-backend-server:3000|g' /etc/nginx/conf.d/default.conf

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔄 How It Works

### 1. Domain Routing

| Domain Type | Example | Server Block | Headers Sent |
|-------------|---------|--------------|--------------|
| Main Domain | `wrapper.zopkit.com` | Main server | `X-Tenant-Subdomain: ""` |
| Subdomain | `tenant1.wrapper.zopkit.com` | Subdomain server | `X-Tenant-Subdomain: "tenant1"` |
| Custom Domain | `tenant1.com` | Custom domain server | `X-Custom-Domain: "true"` |

### 2. Backend Headers

Nginx sends these headers to your backend:

```javascript
// For subdomain: tenant1.wrapper.zopkit.com
headers: {
  'X-Tenant-Domain': 'tenant1.wrapper.zopkit.com',
  'X-Tenant-Subdomain': 'tenant1',
  'X-Custom-Domain': undefined
}

// For custom domain: tenant1.com
headers: {
  'X-Tenant-Domain': 'tenant1.com',
  'X-Tenant-Subdomain': '',
  'X-Custom-Domain': 'true'
}
```

### 3. Frontend Headers

Nginx also sends headers to the frontend for client-side tenant identification.

## 🧪 Testing

### 1. Test Main Domain
```bash
curl -H "Host: wrapper.zopkit.com" http://localhost/
```

### 2. Test Subdomain
```bash
curl -H "Host: test.wrapper.zopkit.com" http://localhost/
```

### 3. Test API with Tenant Info
```bash
curl -H "Host: tenant1.wrapper.zopkit.com" http://localhost/api/health
```

## 🔒 Security Features

- **Rate Limiting:** API calls limited to 10 requests/second
- **SSL/TLS:** Forced HTTPS with modern cipher suites
- **Security Headers:** XSS protection, frame options, HSTS
- **CORS:** Configured for cross-origin requests
- **Gzip Compression:** Enabled for better performance

## 📊 Monitoring

### Health Check
```bash
curl http://your-domain.com/health
# Should return: "healthy"
```

### Nginx Status
```bash
sudo nginx -s reload
sudo systemctl status nginx
```

### Logs
```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

## 🐳 Docker Deployment

If using Docker:

```bash
# Build and run
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🔧 Backend Integration

Your backend should read the tenant information from headers:

```javascript
// Express.js middleware example
app.use((req, res, next) => {
  const tenantDomain = req.headers['x-tenant-domain'];
  const tenantSubdomain = req.headers['x-tenant-subdomain'];
  const isCustomDomain = req.headers['x-custom-domain'] === 'true';

  // Determine tenant identifier
  let tenantIdentifier;
  if (tenantSubdomain) {
    tenantIdentifier = tenantSubdomain; // Subdomain tenant
  } else if (isCustomDomain) {
    tenantIdentifier = tenantDomain; // Custom domain tenant
  } else {
    tenantIdentifier = null; // Main domain
  }

  req.tenantId = tenantIdentifier;
  next();
});
```

## 🚀 DNS Configuration

### For Subdomains (*.wrapper.zopkit.com)
Your DNS should have:
```
Type: CNAME
Name: *.wrapper.zopkit.com
Value: wrapper.zopkit.com (or your server's IP)
```

### For Custom Domains
Each custom domain needs:
```
Type: CNAME
Name: tenant1.com
Value: wrapper.zopkit.com (or your server's IP)
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway
```
# Check if backend is running
curl http://localhost:3000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### 2. SSL Certificate Issues
```
# Check certificate validity
openssl x509 -in /etc/ssl/certs/wrapper.zopkit.com.crt -text -noout

# Test SSL connection
openssl s_client -connect wrapper.zopkit.com:443
```

#### 3. Subdomain Not Working
```
# Check DNS resolution
nslookup test.wrapper.zopkit.com

# Check Nginx configuration
sudo nginx -t
```

#### 4. CORS Issues
```
# Check CORS headers in browser dev tools
# Verify Access-Control-Allow-Origin header is present
```

### Debug Commands

```bash
# Test Nginx configuration
sudo nginx -t

# Reload without restart
sudo nginx -s reload

# Check which server block is being used
curl -I -H "Host: test.wrapper.zopkit.com" http://localhost/

# View Nginx processes
ps aux | grep nginx
```

## 📞 Support

For issues:
1. Check `/var/log/nginx/error.log`
2. Verify backend is running on port 3000
3. Ensure SSL certificates are valid
4. Test with `curl` commands above

## 🔄 Updates

When updating the configuration:
```bash
sudo cp nginx.conf /etc/nginx/conf.d/default.conf
sudo nginx -t
sudo nginx -s reload
```
