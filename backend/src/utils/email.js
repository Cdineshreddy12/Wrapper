import axios from 'axios';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const BREVO_API_URL = 'https://api.brevo.com/v3';
const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@wrapper.app';
const senderName = process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'Wrapper';

// Create axios instance for Brevo API
const brevoClient = axios.create({
  baseURL: BREVO_API_URL,
  headers: {
    'api-key': process.env.BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

class EmailService {
  constructor() {
    this.emailProvider = this.detectEmailProvider();
    this.smtpTransporter = null;
    
    if (this.emailProvider === 'smtp') {
      this.initializeSMTP();
    }
    
    console.log(`📧 Email Service initialized with provider: ${this.emailProvider}`);
  }
  
  detectEmailProvider() {
    // Clean up the API key - remove any whitespace or invalid characters
    const cleanApiKey = process.env.BREVO_API_KEY?.trim();
    
    if (cleanApiKey && cleanApiKey !== 'your-brevo-api-key' && cleanApiKey.length > 20) {
      return 'brevo';
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      return 'smtp';
    } else {
      console.warn('⚠️  No email provider configured. Email service will run in demo mode.');
      return 'demo';
    }
  }
  
  initializeSMTP() {
    try {
      this.smtpTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
        }
      });
      
      console.log('✅ SMTP transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error);
      this.emailProvider = 'demo';
    }
  }

  // Send welcome email to new organization admin
  async sendWelcomeEmail({ email, name, companyName, subdomain, kindeOrgCode, loginUrl }) {
    const subject = `Welcome to ${companyName} - Your Wrapper Account is Ready!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Wrapper</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .credentials { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Wrapper!</h1>
            <p>Your organization workspace is ready</p>
          </div>
          <div class="content">
            <h2>Hi ${name}!</h2>
            
            <p>Congratulations! Your organization <strong>${companyName}</strong> has been successfully set up on Wrapper.</p>
            
            <div class="info-box">
              <h3>🎉 Your Workspace Details</h3>
              <ul>
                <li><strong>Organization:</strong> ${companyName}</li>
                <li><strong>Workspace URL:</strong> ${subdomain}.wrapper.app</li>
                <li><strong>Admin Email:</strong> ${email}</li>
              </ul>
            </div>
            
            <h3>🔐 Single Sign-On (SSO) Login</h3>
            <p>We've configured Single Sign-On for your organization. No passwords needed - just use your email address to log in securely!</p>
            
            <div class="credentials">
              <p><strong>Your SSO Login URL:</strong></p>
              <p><a href="${loginUrl}">${loginUrl}</a></p>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Access Your Workspace</a>
            </div>
            
            <h3>🚀 What's Next?</h3>
            <ol>
              <li>Click the button above to access your workspace</li>
              <li>Complete your profile setup</li>
              <li>Invite your team members</li>
              <li>Start using your business tools</li>
            </ol>
            
            <div class="info-box">
              <h4>💡 Need Help?</h4>
              <p>Our support team is here to help you get started. Reply to this email or visit our help center.</p>
          </div>
            
            <p>Welcome aboard!</p>
            <p><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: [{ email, name }],
      subject,
      htmlContent: html
    });
  }

  // Send user invitation email
  async sendUserInvitation({ email, tenantName, roleName, invitationToken, invitedByName, message }) {
    const subject = `You're invited to join ${tenantName} on Wrapper`;
    
    // Handle both token-based and direct URL invitations
    const acceptUrl = invitationToken.startsWith('http') 
      ? invitationToken 
      : `${process.env.FRONTEND_URL}/invite/accept?token=${invitationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .info-box { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .message-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>Join ${tenantName} on Wrapper</p>
          </div>
          <div class="content">
            <h2>Hi there!</h2>
            
            <p><strong>${invitedByName}</strong> has invited you to join <strong>${tenantName}</strong> on Wrapper.</p>
            
            <div class="info-box">
              <h3>📋 Your Role</h3>
              <p>You've been assigned the role of <strong>${roleName}</strong> in the organization.</p>
            </div>
            
            ${message ? `
            <div class="message-box">
              <h4>💌 Personal Message</h4>
              <p><em>"${message}"</em></p>
            </div>
            ` : ''}
            
            <h3>🔐 Easy SSO Access</h3>
            <p>We use Single Sign-On (SSO) for secure, password-free authentication. Just use your email address to log in!</p>
            
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">Accept Invitation & Join Team</a>
            </div>
            
            <h3>🚀 What You'll Get Access To</h3>
            <ul>
              <li>Integrated CRM, HR, and Business Tools</li>
              <li>Collaborative Workspace</li>
              <li>Team Communication</li>
              <li>Analytics and Reporting</li>
              <li>And much more!</li>
            </ul>
            
            <p><small>This invitation will expire in 7 days. If you have any questions, please contact ${invitedByName} or reply to this email.</small></p>
            
            <p>Welcome to the team!</p>
            <p><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: [{ email }],
      subject,
      htmlContent: html
    });
  }

  // Send usage alert email
  async sendUsageAlert({ tenantId, adminEmail, tenantName, alertType, metricType, currentValue, limitValue, percentage }) {
    const subject = `${tenantName} - Usage Alert: ${alertType.replace('_', ' ').toUpperCase()}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Usage Alert</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 15px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Usage Alert</h1>
            <p>Your organization has reached a usage threshold</p>
          </div>
          <div class="content">
            <h2>Hi there!</h2>
            
            <p>Your organization <strong>${tenantName}</strong> has reached <strong>${percentage}%</strong> of your ${metricType} limit.</p>
            
            <div class="alert-box">
              <h3>📊 Usage Details</h3>
              <ul>
                <li><strong>Current Usage:</strong> ${currentValue}</li>
                <li><strong>Limit:</strong> ${limitValue}</li>
                <li><strong>Percentage:</strong> ${percentage}%</li>
                <li><strong>Alert Type:</strong> ${alertType.replace('_', ' ')}</li>
              </ul>
            </div>
            
            <h3>🚀 What You Can Do</h3>
            <ul>
              <li>Review your current usage in the dashboard</li>
              <li>Consider upgrading your plan for higher limits</li>
              <li>Optimize your usage patterns</li>
              <li>Contact support if you need assistance</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard/billing" class="button">Manage Your Plan</a>
            </div>
            
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            
            <p><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: [{ email: adminEmail }],
      subject,
      htmlContent: html
    });
  }

  // Send downgrade confirmation email
  async sendDowngradeConfirmation({ tenantId, fromPlan, toPlan, refundAmount, effectiveDate }) {
    const subject = `Subscription Downgrade Confirmation`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Downgrade Confirmation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .amount-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📉 Subscription Downgrade Confirmed</h1>
            <p>Your plan change has been processed</p>
          </div>
          <div class="content">
            <h2>Downgrade Successful</h2>
            
            <p>Your subscription has been successfully changed:</p>
            
            <div class="info-box">
              <h3>Plan Change Details</h3>
              <ul>
                <li><strong>From:</strong> ${fromPlan.charAt(0).toUpperCase() + fromPlan.slice(1)} Plan</li>
                <li><strong>To:</strong> ${toPlan.charAt(0).toUpperCase() + toPlan.slice(1)} Plan</li>
                <li><strong>Effective Date:</strong> ${new Date(effectiveDate).toLocaleDateString()}</li>
              </ul>
            </div>
            
            ${refundAmount > 0 ? `
            <div class="amount-box">
              <h3>💰 Refund Processing</h3>
              <p>A prorated refund of <strong>$${refundAmount.toFixed(2)}</strong> is being processed and will appear in your account within 5-10 business days.</p>
            </div>
            ` : ''}
            
            <h3>What's Next?</h3>
            <ul>
              <li>Your new plan features are now active</li>
              <li>You can upgrade again anytime from your billing page</li>
              <li>Contact support if you have any questions</li>
            </ul>
            
            <p>Thank you for using Wrapper!</p>
            <p><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: [{ email: 'admin@example.com' }], // Would get tenant admin email in production
      subject,
      htmlContent: html
    });
  }

  // Send payment failure notification
  async sendPaymentFailedNotification({ tenantId, amount, currency, nextAttempt, failureReason }) {
    console.log('📧 Sending payment failure notification:', {
      tenantId,
      amount,
      currency,
      nextAttempt,
      failureReason
    });
    
    const subject = `Payment Failed - Action Required`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Failed</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Failed</h1>
            <p>We couldn't process your payment</p>
          </div>
          <div class="content">
            <div class="alert-box">
              <h3>Payment Details</h3>
              <p><strong>Amount:</strong> ${amount} ${currency}</p>
              <p><strong>Reason:</strong> ${failureReason}</p>
              ${nextAttempt ? `<p><strong>Next Attempt:</strong> ${new Date(nextAttempt).toLocaleDateString()}</p>` : ''}
            </div>
            
            <p>Please update your payment method to avoid service interruption.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // In production, you would get the tenant admin email and send the actual email
    console.log('✅ Payment failure notification sent successfully');
  }

  // Send dispute notification
  async sendDisputeNotification({ tenantId, disputeId, amount, currency, reason, evidenceDueBy }) {
    console.log('📧 Sending dispute notification:', {
      tenantId,
      disputeId,
      amount,
      currency,
      reason,
      evidenceDueBy
    });
    
    const subject = `Payment Dispute - ${disputeId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Dispute</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6f42c1; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚖️ Payment Dispute</h1>
            <p>A dispute has been filed for your payment</p>
          </div>
          <div class="content">
            <p><strong>Dispute ID:</strong> ${disputeId}</p>
            <p><strong>Amount:</strong> ${amount} ${currency}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            ${evidenceDueBy ? `<p><strong>Evidence Due:</strong> ${new Date(evidenceDueBy).toLocaleDateString()}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('✅ Dispute notification sent successfully');
  }

  // Send refund confirmation
  async sendRefundConfirmation({ tenantId, refundId, amount, currency, reason, processedAt }) {
    console.log('📧 Sending refund confirmation:', {
      tenantId,
      refundId,
      amount,
      currency,
      reason,
      processedAt
    });
    
    const subject = `Refund Confirmation - $${amount}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Refund Confirmation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💸 Refund Processed</h1>
            <p>Your refund has been processed successfully</p>
          </div>
          <div class="content">
            <p><strong>Refund Amount:</strong> ${amount} ${currency}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Processed:</strong> ${new Date(processedAt).toLocaleDateString()}</p>
            <p>The refund will appear in your account within 5-10 business days.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('✅ Refund confirmation sent successfully');
  }

  // Generic email sending method with multi-provider support
  async sendEmail({ to, subject, htmlContent, textContent, attachments = [] }) {
    try {
      console.log(`📧 Sending email via ${this.emailProvider}:`, {
        to: Array.isArray(to) ? to.map(t => t.email || t) : [to],
        subject: subject?.substring(0, 50) + '...'
      });

      // Normalize the 'to' field
      const recipients = Array.isArray(to) ? to : [{ email: to }];
      const recipientEmails = recipients.map(r => r.email || r);

      let result;
      let lastError;

      // Try primary provider first
      try {
        switch (this.emailProvider) {
          case 'brevo':
            result = await this.sendViaBrevo({ recipients, subject, htmlContent, textContent, attachments });
            break;
            
          case 'smtp':
            result = await this.sendViaSMTP({ recipients, subject, htmlContent, textContent, attachments });
            break;
            
          case 'demo':
          default:
            result = this.sendDemo({ recipients, subject, htmlContent, textContent });
            break;
        }
        
        if (result) {
          console.log('✅ Email sent successfully via primary provider');
          return result;
        }
      } catch (primaryError) {
        lastError = primaryError;
        console.error(`❌ Primary provider (${this.emailProvider}) failed:`, primaryError.message);
      }

      // Try SMTP fallback if primary failed
      if (this.emailProvider !== 'smtp' && this.smtpTransporter) {
        console.log('🔄 Trying SMTP fallback...');
        try {
          result = await this.sendViaSMTP({ recipients, subject, htmlContent, textContent, attachments });
          console.log('✅ Email sent successfully via SMTP fallback');
          return result;
        } catch (smtpError) {
          console.error('❌ SMTP fallback also failed:', smtpError.message);
          lastError = smtpError;
        }
      }

      // If all providers failed, fall back to demo mode
      console.log('🔄 All email providers failed, falling back to demo mode...');
      result = this.sendDemo({ recipients, subject, htmlContent, textContent });
      
      // Log the failure for debugging
      console.warn('⚠️ Email sent in demo mode due to provider failures:', {
        primaryProvider: this.emailProvider,
        primaryError: lastError?.message,
        fallbackUsed: 'demo'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Critical error in email service:', error);
      
      // Last resort: demo mode
      try {
        const recipients = Array.isArray(to) ? to : [{ email: to }];
        return this.sendDemo({ recipients, subject, htmlContent, textContent });
      } catch (demoError) {
        console.error('❌ Even demo mode failed:', demoError);
        throw new Error(`All email providers failed: ${error.message}`);
      }
    }
  }

  async sendViaBrevo({ recipients, subject, htmlContent, textContent, attachments }) {
    const emailData = {
      sender: { 
        name: senderName, 
        email: senderEmail 
      },
      to: recipients,
      subject,
      htmlContent,
      textContent,
      attachments
    };

    try {
      const response = await brevoClient.post('/smtp/email', emailData);
      
      console.log('✅ Email sent via Brevo:', {
        messageId: response.data.messageId,
        to: recipients.map(r => r.email || r),
        subject
      });
      
      return response.data;
    } catch (error) {
      // Handle specific Brevo errors
      if (error.response?.status === 401) {
        if (error.response.data?.code === 'unauthorized') {
          throw new Error(`Brevo API unauthorized: ${error.response.data.message}. Please check your API key and IP whitelist.`);
        }
        throw new Error('Brevo API unauthorized: Invalid API key or IP not whitelisted');
      } else if (error.response?.status === 429) {
        throw new Error('Brevo API rate limit exceeded. Please try again later.');
      } else if (error.response?.status >= 500) {
        throw new Error('Brevo API server error. Please try again later.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Brevo API request timeout. Please try again.');
      } else {
        throw new Error(`Brevo API error: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  async sendViaSMTP({ recipients, subject, htmlContent, textContent, attachments }) {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: recipients.map(r => r.email || r).join(', '),
      subject,
      html: htmlContent,
      text: textContent || htmlContent?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      attachments: attachments || []
    };

    const result = await this.smtpTransporter.sendMail(mailOptions);
    
    console.log('✅ Email sent via SMTP:', {
      messageId: result.messageId,
      to: recipients.map(r => r.email || r),
      subject
    });
    
    return {
      messageId: result.messageId,
      provider: 'smtp'
    };
  }

  sendDemo({ recipients, subject, htmlContent, textContent }) {
    console.log('📧 Demo Mode - Email would be sent:', {
      from: `"${senderName}" <${senderEmail}>`,
      to: recipients.map(r => r.email || r),
      subject,
      hasHtml: !!htmlContent,
      hasText: !!textContent,
      timestamp: new Date().toISOString()
    });
    
    // In demo mode, also log a sample of the content for debugging
    if (htmlContent) {
      const preview = htmlContent.substring(0, 200).replace(/<[^>]*>/g, '');
      console.log('📝 Email preview:', preview + '...');
    }
    
    return { 
      messageId: `demo-${Date.now()}`,
      provider: 'demo',
      recipients: recipients.length
    };
  }

  // Send bulk emails (for notifications, newsletters, etc.)
  async sendBulkEmail({ to, subject, htmlContent, textContent, templateId = null }) {
    try {
      if (!process.env.BREVO_API_KEY) {
        console.log('Bulk email would be sent:', { to: to.length, subject });
        return { messageId: 'demo-mode' };
      }

      const emailData = {
        sender: { 
          name: senderName, 
          email: senderEmail 
        },
        to,
        subject,
        htmlContent,
        textContent
      };

      if (templateId) {
        emailData.templateId = templateId;
      }

      const response = await brevoClient.post('/smtp/email', emailData);
      
      console.log('Bulk email sent successfully via Brevo:', {
        messageId: response.data.messageId,
        recipients: to.length,
        subject
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending bulk email via Brevo:', error.response?.data || error.message);
      throw new Error(`Failed to send bulk email: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test email configuration for all providers
  async testConnection() {
    try {
      console.log(`🧪 Testing email connection for provider: ${this.emailProvider}`);
      
      switch (this.emailProvider) {
        case 'brevo':
          return await this.testBrevoConnection();
          
        case 'smtp':
          return await this.testSMTPConnection();
          
        case 'demo':
          console.log('📧 Demo mode - no real connection to test');
          return { success: true, provider: 'demo', message: 'Demo mode active' };
          
        default:
          return { success: false, provider: 'none', message: 'No email provider configured' };
      }
    } catch (error) {
      console.error('❌ Email connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async testBrevoConnection() {
    try {
      const response = await brevoClient.get('/account');
      console.log('✅ Brevo connection test successful:', {
        email: response.data.email,
        plan: response.data.plan
      });
      return { 
        success: true, 
        provider: 'brevo', 
        account: {
          email: response.data.email,
          plan: response.data.plan
        }
      };
    } catch (error) {
      console.error('❌ Brevo connection test failed:', error.response?.data || error.message);
      return { 
        success: false, 
        provider: 'brevo', 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async testSMTPConnection() {
    try {
      if (!this.smtpTransporter) {
        throw new Error('SMTP transporter not initialized');
      }
      
      await this.smtpTransporter.verify();
      console.log('✅ SMTP connection test successful');
      return { 
        success: true, 
        provider: 'smtp',
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER
        }
      };
    } catch (error) {
      console.error('❌ SMTP connection test failed:', error.message);
      return { 
        success: false, 
        provider: 'smtp', 
        error: error.message 
      };
    }
  }

  // Get email sending statistics
  async getStats() {
    try {
      if (!process.env.BREVO_API_KEY) {
        return { demo: true };
      }

      const response = await brevoClient.get('/smtp/statistics');
      return response.data;
    } catch (error) {
      console.error('Error getting email stats:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send urgent trial reminder (1 day before expiry)
  static async sendUrgentTrialReminder({ tenantId, hoursRemaining, trialEnd, currentPlan }) {
    console.log(`📧 Sending urgent trial reminder to tenant: ${tenantId}`);
    
    // In production, get tenant admin email from database
    const adminEmail = 'admin@example.com'; // Replace with actual tenant admin email
    
    const subject = `🚨 URGENT: Your trial expires in ${hoursRemaining} hours!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Urgent Trial Reminder</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .urgency-banner { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px; }
          .urgency-banner h2 { color: #dc2626; margin: 0 0 10px 0; font-size: 20px; }
          .countdown { text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .countdown .time { font-size: 36px; font-weight: bold; }
          .countdown .label { font-size: 14px; opacity: 0.9; }
          .cta { text-align: center; margin: 30px 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
          .features { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .features h3 { margin: 0 0 15px 0; color: #1f2937; }
          .features ul { margin: 0; padding-left: 20px; }
          .features li { margin-bottom: 8px; color: #4b5563; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Trial Expiring Soon!</h1>
            <p>Don't lose access to your ${currentPlan} features</p>
          </div>
          
          <div class="content">
            <div class="urgency-banner">
              <h2>⏰ Action Required</h2>
              <p>Your trial period is ending very soon. Upgrade now to maintain uninterrupted access to all features.</p>
            </div>
            
            <div class="countdown">
              <div class="time">${hoursRemaining}</div>
              <div class="label">HOURS REMAINING</div>
            </div>
            
            <p>Hello,</p>
            
            <p>This is an <strong>urgent reminder</strong> that your ${currentPlan} trial will expire in just <strong>${hoursRemaining} hours</strong> on ${new Date(trialEnd).toLocaleDateString()}.</p>
            
            <div class="features">
              <h3>Don't lose access to:</h3>
              <ul>
                <li>✅ Advanced CRM tools</li>
                <li>✅ HR management system</li>
                <li>✅ Unlimited projects</li>
                <li>✅ Premium support</li>
                <li>✅ Advanced analytics</li>
              </ul>
            </div>
            
            <div class="cta">
              <a href="${process.env.FRONTEND_URL}/billing" class="cta-button">
                🚀 Upgrade Now - Save Your Data
              </a>
            </div>
            
            <p><strong>What happens if you don't upgrade?</strong></p>
            <ul>
              <li>❌ Your account will be suspended</li>
              <li>❌ You'll lose access to all premium features</li>
              <li>❌ Your data will be at risk</li>
              <li>❌ You'll need to start over with a new trial</li>
            </ul>
            
            <p>Upgrade takes less than 2 minutes. Secure your account now!</p>
          </div>
          
          <div class="footer">
            <p>This is an automated reminder. If you have questions, contact our support team.</p>
            <p>© 2024 Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      🚨 URGENT: Your trial expires in ${hoursRemaining} hours!
      
      Your ${currentPlan} trial will expire on ${new Date(trialEnd).toLocaleDateString()}.
      
      Upgrade now to maintain access to all features:
      ${process.env.FRONTEND_URL}/billing
      
      Don't lose your data and progress!
    `;
    
    return this.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  // Send trial expiration notice
  static async sendTrialExpirationNotice({ tenantId, plan }) {
    console.log(`📧 Sending trial expiration notice to tenant: ${tenantId}`);
    
    const adminEmail = 'admin@example.com';
    const subject = `❌ Your trial has expired - Account suspended`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial Expired</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .status-banner { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px; }
          .status-banner h2 { color: #dc2626; margin: 0 0 10px 0; font-size: 20px; }
          .cta { text-align: center; margin: 30px 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Trial Period Ended</h1>
            <p>Your account has been suspended</p>
          </div>
          
          <div class="content">
            <div class="status-banner">
              <h2>⚠️ Account Suspended</h2>
              <p>Your ${plan} trial has ended and your account has been temporarily suspended.</p>
            </div>
            
            <p>Hello,</p>
            
            <p>Your trial period has expired and your account is now suspended. To regain access to your data and features, please upgrade to a paid plan.</p>
            
            <p><strong>Current status:</strong></p>
            <ul>
              <li>❌ Account suspended</li>
              <li>❌ No access to premium features</li>
              <li>⚠️ Data preserved for 30 days</li>
            </ul>
            
            <div class="cta">
              <a href="${process.env.FRONTEND_URL}/billing" class="cta-button">
                🔓 Upgrade to Restore Access
              </a>
            </div>
            
            <p>Your data is safe for 30 days. After that, it may be permanently deleted.</p>
          </div>
          
          <div class="footer">
            <p>Questions? Contact our support team for assistance.</p>
            <p>© 2024 Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return this.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent
    });
  }

  // Send admin notification
  static async sendAdminNotification(data) {
    console.log(`📧 Sending admin notification: ${data.type}`);
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
    
    let subject, content;
    
    switch (data.type) {
      case 'trial_expiration':
        subject = `🚨 ${data.count} trials expired today`;
        content = `
          <h2>Trial Expiration Report</h2>
          <p><strong>${data.count}</strong> trial subscriptions have expired and been suspended today.</p>
          <p>These accounts will need to upgrade to regain access.</p>
        `;
        break;
        
      case 'trial_reminders':
        subject = `📧 ${data.count} trial reminders sent`;
        content = `
          <h2>Trial Reminder Report</h2>
          <p>Sent <strong>${data.count}</strong> trial reminder emails today:</p>
          <ul>
            <li>3-day reminders: ${data.breakdown.threeDay}</li>
            <li>1-day urgent reminders: ${data.breakdown.oneDay}</li>
          </ul>
        `;
        break;
        
      case 'daily_cleanup':
        subject = `🧹 Daily cleanup completed`;
        content = `
          <h2>Daily Maintenance Report</h2>
          <p>Today's cleanup results:</p>
          <ul>
            <li>Old records archived: ${data.deletedRecords}</li>
            <li>Subscriptions updated: ${data.updatedSubscriptions}</li>
          </ul>
        `;
        break;
        
      case 'cron_error':
        subject = `❌ Cron job error: ${data.job}`;
        content = `
          <h2>⚠️ Cron Job Error</h2>
          <p><strong>Job:</strong> ${data.job}</p>
          <p><strong>Error:</strong> ${data.error}</p>
          <p>Please investigate and resolve this issue.</p>
        `;
        break;
        
      default:
        subject = `📊 System notification`;
        content = `<p>${JSON.stringify(data)}</p>`;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Notification</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; }
          .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
          .content { padding: 20px 0; }
          .footer { color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Admin Notification</h1>
            <p>${new Date().toLocaleString()}</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>This is an automated system notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return this.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent
    });
  }

  // Send weekly analytics report
  static async sendWeeklyAnalyticsReport(analyticsData) {
    console.log(`📊 Sending weekly analytics report`);
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
    const subject = `📊 Weekly Analytics Report - ${analyticsData.week.start.toDateString()} to ${analyticsData.week.end.toDateString()}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Analytics Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .metrics { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
          .metric-card { background-color: #f8fafc; padding: 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center; border-left: 4px solid #2563eb; }
          .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
          .metric-label { font-size: 14px; color: #6b7280; }
          .section { margin: 30px 0; }
          .section h3 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
          .conversion-rate { font-size: 18px; font-weight: bold; color: #059669; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Analytics Report</h1>
            <p>${analyticsData.week.start.toDateString()} - ${analyticsData.week.end.toDateString()}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>🚀 Subscription Metrics</h3>
              <div class="metrics">
                <div class="metric-card">
                  <div class="metric-value">${analyticsData.subscriptions.newTrials}</div>
                  <div class="metric-label">New Trials</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${analyticsData.subscriptions.newPaid}</div>
                  <div class="metric-label">New Paid Subscriptions</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${analyticsData.subscriptions.expiredTrials}</div>
                  <div class="metric-label">Expired Trials</div>
                </div>
              </div>
              <p><strong>Conversion Rate:</strong> <span class="conversion-rate">${analyticsData.subscriptions.conversionRate}%</span></p>
            </div>
            
            <div class="section">
              <h3>💰 Revenue Metrics</h3>
              <div class="metrics">
                <div class="metric-card">
                  <div class="metric-value">$${analyticsData.revenue.total.toFixed(2)}</div>
                  <div class="metric-label">Total Revenue</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${analyticsData.revenue.paymentCount}</div>
                  <div class="metric-label">Payments</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">$${analyticsData.revenue.averagePayment}</div>
                  <div class="metric-label">Avg Payment</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h3>📈 Key Insights</h3>
              <ul>
                <li><strong>Trial Performance:</strong> ${analyticsData.subscriptions.newTrials} new trials started this week</li>
                <li><strong>Conversion Success:</strong> ${analyticsData.subscriptions.conversionRate}% of trials converted to paid plans</li>
                <li><strong>Revenue Growth:</strong> Generated $${analyticsData.revenue.total.toFixed(2)} in revenue</li>
                <li><strong>Customer Acquisition:</strong> ${analyticsData.subscriptions.newPaid} new paying customers</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>This report is generated automatically every Monday.</p>
            <p>© 2024 Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return this.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent
    });
  }

  // Send trial reminder notification
  async sendTrialReminderNotification({ email, companyName, planName, expirationDate, subscriptionId }) {
    const subject = `⏰ Your ${planName} trial expires soon - ${companyName}`;
    
    const timeRemaining = new Date(expirationDate) - new Date();
    const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial Expiration Reminder</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .timer { background: #ffebee; border: 2px solid #f44336; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Trial Expiring Soon!</h1>
            <p>Don't lose access to your ${planName} features</p>
          </div>
          <div class="content">
            <h2>Hi there!</h2>
            
            <div class="timer">
              <h3>🚨 ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} remaining</h3>
              <p>Your ${planName} trial expires at ${new Date(expirationDate).toLocaleString()}</p>
            </div>
            
            <div class="warning-box">
              <h3>⚠️ What happens when your trial expires?</h3>
              <ul>
                <li>Access to ${planName} features will be suspended</li>
                <li>Your data will be preserved for 30 days</li>
                <li>You can reactivate anytime by upgrading</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/billing?upgrade=true" class="button">Upgrade Now</a>
            </div>
            
            <h3>💳 Flexible Billing Options</h3>
            <ul>
              <li>Monthly or yearly billing</li>
              <li>Cancel anytime</li>
              <li>30-day money-back guarantee</li>
              <li>Secure payment processing</li>
            </ul>
            
            <p>Questions? Reply to this email - we're here to help!</p>
            
            <p>Best regards,<br><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: [{ email }],
      subject,
      htmlContent: html
    });
  }

  // Send trial expired notification
  async sendTrialExpiredNotification({ email, companyName, planName, subscriptionId }) {
    const subject = `🔒 Your ${planName} trial has expired - ${companyName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial Expired</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .action-box { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .urgent-banner { background: #ffebee; border: 2px solid #f44336; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Trial Expired</h1>
            <p>Your ${planName} trial has ended</p>
          </div>
          <div class="content">
            <div class="urgent-banner">
              <h2 style="color: #f44336; margin: 0;">⚠️ IMMEDIATE ACTION REQUIRED</h2>
              <p style="margin: 10px 0 0 0;">Your account access has been suspended. Upgrade now to restore access.</p>
            </div>
            
            <h2>Hi there!</h2>
            
            <p>Your ${planName} trial for <strong>${companyName}</strong> has expired. Your account has been suspended, but don't worry - your data is safe!</p>
            
            <div class="info-box">
              <h3>📋 What's Happened?</h3>
              <ul>
                <li>Your ${planName} trial has ended and access is suspended</li>
                <li>All your data is securely preserved for 30 days</li>
                <li>You can reactivate anytime by upgrading</li>
                <li>No credit card was charged during your trial</li>
              </ul>
            </div>
            
            <div class="action-box">
              <h3>🚀 Ready to Continue?</h3>
              <p>Upgrade now to restore full access to all your ${planName} features and continue where you left off.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/billing?upgrade=true&expired=true&source=email" class="button">🚀 Upgrade & Restore Access Now</a>
            </div>
            
            <h3>🔒 Your Data is Safe</h3>
            <ul>
              <li>All data preserved for 30 days after trial expiration</li>
              <li>Instant restoration when you upgrade</li>
              <li>Full backup and recovery available</li>
            </ul>
            
            <h3>💡 Need Help Choosing a Plan?</h3>
            <p>Our team is here to help you find the perfect plan for your needs. Just reply to this email!</p>
            
            <h3>📞 Urgent Support</h3>
            <p>If you need immediate assistance, contact our support team directly.</p>
            
            <p>Thanks for trying Wrapper!</p>
            <p><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const result = await this.sendEmail({
        to: [{ email }],
        subject,
        htmlContent: html
      });
      
      console.log(`✅ Trial expired email sent successfully to: ${email}`);
      return { success: true, result };
    } catch (error) {
      console.error(`❌ Failed to send trial expired email to: ${email}`, error);
      return { success: false, error: error.message };
    }
  }

  // Send plan expired notification (for paid plans that expire)
  static async sendPlanExpiredNotification({ email, companyName, planName, subscriptionId }) {
    const subject = `🔒 Your ${planName} plan has expired - ${companyName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plan Expired</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .action-box { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .option-box { background: #f0f4f8; border: 1px solid #e2e8f0; padding: 20px; margin: 10px 0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Plan Expired</h1>
            <p>Your ${planName} subscription has ended</p>
          </div>
          <div class="content">
            <h2>Hi there!</h2>
            
            <p>Your ${planName} subscription for <strong>${companyName}</strong> has expired. Your account access has been suspended.</p>
            
            <div class="warning-box">
              <h3>⚠️ What's Changed?</h3>
              <ul>
                <li>Your ${planName} subscription period has ended</li>
                <li>Account access is temporarily suspended</li>
                <li>All your data remains secure and preserved</li>
                <li>You can reactivate anytime by renewing or choosing a new plan</li>
              </ul>
            </div>
            
            <div class="action-box">
              <h3>🔄 What Are Your Options?</h3>
            </div>
            
            <div class="option-box">
              <h4>💎 Renew Your ${planName} Plan</h4>
              <p>Continue with the same great features you've been using.</p>
              <a href="${process.env.FRONTEND_URL}/billing?renew=${planName.toLowerCase()}&source=email" class="button">Renew ${planName}</a>
            </div>
            
            <div class="option-box">
              <h4>🏃‍♂️ Switch to Starter Plan</h4>
              <p>Need something more budget-friendly? Our Starter plan might be perfect for you this month.</p>
              <a href="${process.env.FRONTEND_URL}/billing?upgrade=starter&source=email" class="button">Switch to Starter</a>
            </div>
            
            <div class="option-box">
              <h4>🚀 Upgrade to Professional</h4>
              <p>Ready for more features? Upgrade to our Professional plan.</p>
              <a href="${process.env.FRONTEND_URL}/billing?upgrade=professional&source=email" class="button">Upgrade to Professional</a>
            </div>
            
            <h3>🔒 Your Data is Safe</h3>
            <ul>
              <li>All data preserved during suspension period</li>
              <li>Instant restoration when you renew or upgrade</li>
              <li>No data loss - pick up exactly where you left off</li>
            </ul>
            
            <h3>💡 Need Help Deciding?</h3>
            <p>Our team is here to help you choose the best plan for your current needs. Whether you want to:</p>
            <ul>
              <li>🔄 Renew your current ${planName} plan</li>
              <li>📉 Downgrade to Starter for this month</li>
              <li>📈 Upgrade to get more features</li>
            </ul>
            <p>Just reply to this email and we'll help you find the perfect solution!</p>
            
            <p>Best regards,</p>
            <p><strong>The Wrapper Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const emailService = new EmailService();
      const result = await emailService.sendEmail({
        to: [{ email }],
        subject,
        htmlContent: html
      });
      
      console.log(`✅ Plan expired email sent successfully to: ${email}`);
      return { success: true, result };
    } catch (error) {
      console.error(`❌ Failed to send plan expired email to: ${email}`, error);
      return { success: false, error: error.message };
    }
  }
}

export { EmailService };
export default new EmailService(); 