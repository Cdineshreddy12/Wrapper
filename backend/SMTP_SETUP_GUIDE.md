# 📧 **SMTP SETUP GUIDE - EMAIL FALLBACK**

## **🚨 Current Situation**
Your Brevo email service is blocked due to IP restrictions. Here's how to set up SMTP as a fallback.

## **🔧 Quick SMTP Setup (Gmail)**

### **Step 1: Enable 2-Factor Authentication**
1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Enable "2-Step Verification"
3. This is required for App Passwords

### **Step 2: Generate App Password**
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Name it "Wrapper App"
4. Copy the generated 16-character password

### **Step 3: Update Environment Variables**
Add these to your `.env` file:

```bash
# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_SECURE=false
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Your Company Name
```

### **Step 4: Test SMTP Connection**
```bash
node -e "
import EmailService from './src/utils/email.js';
EmailService.testSMTPConnection().then(console.log).catch(console.error);
"
```

## **📧 Alternative SMTP Providers**

### **Outlook/Hotmail**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### **Yahoo Mail**
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### **Custom SMTP Server**
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
```

## **🧪 Testing the Setup**

### **Test 1: Connection Test**
```bash
node fix-email-service.js
```

### **Test 2: Send Test Email**
```bash
node -e "
import EmailService from './src/utils/email.js';
EmailService.sendEmail({
  to: [{ email: 'test@example.com' }],
  subject: 'SMTP Test',
  htmlContent: '<h1>SMTP is working!</h1>'
}).then(console.log).catch(console.error);
"
```

### **Test 3: Full Invitation System**
```bash
node test-invitation-system.js
```

## **✅ Expected Results**
After SMTP setup:
- ✅ Email service will work
- ✅ Invitations will be sent successfully
- ✅ Users will receive email notifications
- ✅ System will be production-ready

## **🚀 Production Recommendations**

### **Option 1: Fix Brevo (Recommended)**
1. Add your IP to Brevo whitelist
2. Use Brevo as primary email service
3. Keep SMTP as fallback

### **Option 2: Use SMTP Only**
1. Configure reliable SMTP provider
2. Monitor email delivery
3. Set up email analytics

### **Option 3: Professional Email Service**
1. SendGrid, Mailgun, or AWS SES
2. Better deliverability and monitoring
3. Professional support and analytics

---

**💡 Quick Fix: Just add your IP to Brevo whitelist and you're done!**
**🔄 Fallback: Use SMTP if you need immediate solution.**
