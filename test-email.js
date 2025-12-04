// Test email configuration
require('dotenv').config();
const emailService = require('./src/services/emailService');

async function testEmail() {
  console.log('📧 Testing email configuration...\n');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('ALLOW_EMAIL_FAILURE:', process.env.ALLOW_EMAIL_FAILURE || 'false');
  console.log('\n');
  
  // Test sending email
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  const testCode = '123456';
  
  try {
    console.log(`Sending test OTP to ${testEmail}...`);
    const result = await emailService.sendOTP(testEmail, testCode);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
      if (result.devMode) {
        console.log('⚠️ Running in dev mode - email may not have been sent');
      }
    }
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n💡 Tips:');
    console.log('1. For Gmail: Use App Password (not regular password)');
    console.log('2. Enable 2FA and create app password at: https://myaccount.google.com/apppasswords');
    console.log('3. For production: Use SendGrid or custom SMTP');
    console.log('4. Set ALLOW_EMAIL_FAILURE=true to log OTP in console');
  }
}

testEmail().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

