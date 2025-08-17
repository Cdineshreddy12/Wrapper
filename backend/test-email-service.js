#!/usr/bin/env node

/**
 * 🧪 **EMAIL SERVICE TEST SCRIPT**
 * Tests the actual email sending functionality
 */

import 'dotenv/config';
import { EmailService } from './src/utils/email.js';

async function testEmailService() {
  console.log('🧪 **TESTING EMAIL SERVICE**\n');
  
  try {
    // Initialize email service
    const emailService = new EmailService();
    console.log(`✅ Email service initialized with provider: ${emailService.emailProvider}`);
    
    if (emailService.emailProvider === 'demo') {
      console.log('⚠️  Running in demo mode - emails will not be sent');
      return;
    }
    
    // Test email data
    const testEmail = {
      recipients: [{ email: 'test@example.com', name: 'Test User' }],
      subject: 'Test Email from Wrapper',
      htmlContent: `
        <h1>Test Email</h1>
        <p>This is a test email to verify the email service is working.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      textContent: 'This is a test email to verify the email service is working.'
    };
    
    console.log('\n📧 **SENDING TEST EMAIL**');
    console.log('Recipient:', testEmail.recipients[0].email);
    console.log('Subject:', testEmail.subject);
    
    // Try to send email
    const result = await emailService.sendEmail(testEmail);
    
    console.log('\n✅ **EMAIL SENT SUCCESSFULLY**');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('\n❌ **EMAIL SENDING FAILED**');
    console.error('Error:', error.message);
    
    // Provide specific solutions based on error
    if (error.message.includes('401')) {
      console.log('\n🔑 **401 UNAUTHORIZED ERROR - SOLUTIONS:**');
      console.log('1. Check if Brevo API key is valid');
      console.log('2. Verify API key has correct permissions');
      console.log('3. Check if your IP is whitelisted in Brevo');
      console.log('4. Verify sender email is verified in Brevo');
      
      console.log('\n🌐 **IP WHITELISTING:**');
      console.log('1. Go to: https://app.brevo.com/security/authorised_ips');
      console.log('2. Add your current IP address');
      console.log('3. Or use IP range for your network');
      
    } else if (error.message.includes('Brevo API')) {
      console.log('\n📧 **BREVO API ERROR - SOLUTIONS:**');
      console.log('1. Verify API key format (should start with xkeysib-)');
      console.log('2. Check Brevo account status and limits');
      console.log('3. Verify sender email domain is verified');
      
    } else if (error.message.includes('timeout')) {
      console.log('\n⏰ **TIMEOUT ERROR - SOLUTIONS:**');
      console.log('1. Check network connectivity');
      console.log('2. Verify Brevo API endpoint is accessible');
      console.log('3. Try increasing timeout in email service');
    }
    
    console.log('\n🔧 **IMMEDIATE ACTIONS:**');
    console.log('1. Test Brevo API key manually');
    console.log('2. Check Brevo dashboard for errors');
    console.log('3. Verify sender email verification');
    console.log('4. Test with a different API key if available');
  }
}

// Run the test
testEmailService();
