# 🔧 **BREVO IP WHITELIST FIX**

## 🚨 **IMMEDIATE ISSUE**
Your email service is failing because your IP address is not whitelisted in Brevo.

## 📍 **YOUR CURRENT IP ADDRESS**
```
2409:40f0:115d:7994:fd0e:5856:ab8a:a36
```

## 🚀 **QUICK FIX (5 minutes)**

### **Step 1: Access Brevo Security Settings**
1. Go to: https://app.brevo.com/security/authorised_ips
2. Login with your Brevo account
3. Navigate to "Authorized IPs" section

### **Step 2: Add Your IP Address**
1. Click "Add IP Address" or "Add New IP"
2. Enter: `2409:40f0:115d:7994:fd0e:5856:ab8a:a36`
3. Add description: "Wrapper Backend Server"
4. Click "Save" or "Add"

### **Step 3: Alternative - Add IP Range**
If you want to whitelist your entire network:
- **IP Range**: `2409:40f0:115d::/64`
- **Description**: "Wrapper Network Range"

## ✅ **VERIFICATION**

### **Test Email Service**
After adding the IP, test with:
```bash
node test-email-service.js
```

### **Expected Result**
```
✅ **EMAIL SENT SUCCESSFULLY**
Result: { messageId: 'actual-message-id', provider: 'brevo' }
```

## 🔍 **TROUBLESHOOTING**

### **If Still Getting 401 Error**
1. **Check IP Format**: Ensure no extra spaces or characters
2. **Wait for Propagation**: IP whitelist changes may take 5-10 minutes
3. **Verify API Key**: Ensure API key is still valid
4. **Check Brevo Status**: Verify Brevo service is operational

### **Alternative Solutions**
1. **Use SMTP Fallback**: Configure Gmail SMTP as backup
2. **VPN**: Use a VPN with a whitelisted IP
3. **Different Email Service**: Switch to SendGrid, Mailgun, etc.

## 📧 **SMTP FALLBACK CONFIGURATION**

If you want to set up SMTP as backup, add to `.env`:
```env
# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your Company Name
```

## 🎯 **NEXT STEPS**

1. **Add IP to Brevo whitelist** (immediate)
2. **Test email service** (verify fix)
3. **Test user invitation** (verify functionality)
4. **Monitor email delivery** (ensure reliability)

## 📞 **SUPPORT**

- **Brevo Support**: https://help.brevo.com/
- **IP Whitelist Docs**: https://help.brevo.com/hc/en-us/articles/360000268710-IP-whitelist
- **API Documentation**: https://developers.brevo.com/

---

**Status**: 🔴 **IP WHITELISTING REQUIRED**  
**Priority**: 🚨 **HIGH - IMMEDIATE ACTION NEEDED**
