#!/usr/bin/env node

/**
 * 🔧 **EMAIL SERVICE DIAGNOSTIC & FIX SCRIPT**
 * Helps diagnose and fix email service configuration issues
 */

import 'dotenv/config';
import { EmailService } from './src/utils/email.js';

console.log('🔧 **EMAIL SERVICE DIAGNOSTIC**\n');

// Check current environment
console.log('📋 **ENVIRONMENT CHECK**');
console.log(`BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL ? '✅ SET' : '❌ NOT SET'}`);
console.log(`BREVO_SENDER_NAME: ${process.env.BREVO_SENDER_NAME ? '✅ SET' : '❌ NOT SET'}`);
console.log(`SMTP_HOST: ${process.env.SMTP_HOST ? '✅ SET' : '❌ NOT SET'}`);
console.log(`SMTP_USER: ${process.env.SMTP_USER ? '✅ SET' : '❌ NOT SET'}`);
console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET'}`);

// Test email service initialization
console.log('\n🧪 **EMAIL SERVICE TEST**');
try {
  const emailService = new EmailService();
  console.log(`✅ Email service initialized successfully`);
  console.log(`📧 Provider detected: ${emailService.emailProvider}`);
  
  if (emailService.emailProvider === 'demo') {
    console.log('⚠️  Running in DEMO mode - emails will not be sent');
  }
  
} catch (error) {
  console.error('❌ Email service initialization failed:', error.message);
}

// Provide solutions
console.log('\n💡 **SOLUTIONS**');

if (!process.env.BREVO_API_KEY) {
  console.log('\n🔑 **BREVO API KEY SETUP**');
  console.log('1. Go to https://brevo.com and create account');
  console.log('2. Navigate to SMTP & API > API Keys');
  console.log('3. Create new API key');
  console.log('4. Add to .env file:');
  console.log('   BREVO_API_KEY=your-api-key-here');
  console.log('   BREVO_SENDER_EMAIL=noreply@yourdomain.com');
  console.log('   BREVO_SENDER_NAME=Your Company Name');
}

if (!process.env.SMTP_HOST && !process.env.BREVO_API_KEY) {
  console.log('\n📧 **SMTP SETUP (Alternative)**');
  console.log('1. Add to .env file:');
  console.log('   SMTP_HOST=smtp.gmail.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_USER=your-email@gmail.com');
  console.log('   SMTP_PASS=your-app-password');
  console.log('   SMTP_FROM_EMAIL=noreply@yourdomain.com');
  console.log('   SMTP_FROM_NAME=Your Company Name');
}

console.log('\n📝 **QUICK SETUP COMMANDS**');
console.log('# Copy environment template:');
console.log('cp backend/env.example backend/.env');
console.log('');
console.log('# Edit with your credentials:');
console.log('nano backend/.env');
console.log('');
console.log('# Test email service:');
console.log('node backend/fix-email-service.js');

console.log('\n🎯 **NEXT STEPS**');
console.log('1. Set up Brevo account or configure SMTP');
console.log('2. Update .env file with credentials');
console.log('3. Restart your backend server');
console.log('4. Test user invitation again');
console.log('5. Check logs for successful email sending');
