const nodemailer = require('nodemailer');
const config = require('../config');

// Create a reusable transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"খরচখাতা" <${config.email.user}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// Send OTP email
exports.sendOTP = async (email, code) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">খরচখাতা</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Email Verification</h2>
          <p style="color: #666; font-size: 16px;">Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #10b981; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `;

    await sendEmail(email, 'Email Verification - খরচখাতা', html);
    
    // Always log OTP in console for debugging
    console.log(`📧 [OTP] Code for ${email}: ${code}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    // Always log OTP in console for debugging
    console.log(`📧 [FALLBACK] OTP for ${email}: ${code}`);
    console.log('⚠️ Email service unavailable. OTP logged above for manual verification.');
    
    // In development or if ALLOW_EMAIL_FAILURE is set, return success
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_EMAIL_FAILURE === 'true') {
      return { success: true, devMode: true, code };
    }
    
    // In production, throw error but log the OTP
    throw new Error(`Email sending failed: ${error.message}. OTP: ${code} (logged in console)`);
  }
};

// Send password reset OTP email
exports.sendPasswordResetOTP = async (email, code) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">খরচখাতা</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px;">You requested to reset your password. Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #10b981; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #ff3b30; font-size: 14px; font-weight: bold;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">For security reasons, never share this code with anyone.</p>
        </div>
      </div>
    `;

    await sendEmail(email, 'Password Reset - খরচখাতা', html);
    
    // Always log OTP in console for debugging
    console.log(`📧 [Password Reset OTP] Code for ${email}: ${code}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset OTP email:', error);
    
    // Always log OTP in console for debugging
    console.log(`📧 [FALLBACK] Password reset OTP for ${email}: ${code}`);
    console.log('⚠️ Email service unavailable. OTP logged above for manual verification.');
    
    // In development or if ALLOW_EMAIL_FAILURE is set, return success
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_EMAIL_FAILURE === 'true') {
      return { success: true, devMode: true, code };
    }
    
    // In production, throw error but log the OTP
    throw new Error(`Email sending failed: ${error.message}. OTP: ${code} (logged in console)`);
  }
};
