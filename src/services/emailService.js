const nodemailer = require('nodemailer');

// Create transporter - using Gmail SMTP (you can configure with your email service)
const createTransporter = () => {
  // For development, you can use Gmail or any SMTP service
  // For production, use a service like SendGrid, Mailgun, or AWS SES
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password' // Use App Password for Gmail
    }
  });
};

// Send OTP email
exports.sendOTP = async (email, code) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@aybay.com',
      to: email,
      subject: 'Email Verification - খরচখাতা',
      html: `
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
      `,
      text: `Your verification code is: ${code}. This code will expire in 10 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    // In development, log the OTP instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV MODE] OTP for', email, ':', code);
      return { success: true, devMode: true };
    }
    throw error;
  }
};

// Send password reset OTP email
exports.sendPasswordResetOTP = async (email, code) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@aybay.com',
      to: email,
      subject: 'Password Reset - খরচখাতা',
      html: `
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
      `,
      text: `Your password reset code is: ${code}. This code will expire in 10 minutes. If you didn't request this, please ignore this email.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset OTP email:', error);
    // In development, log the OTP instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV MODE] Password reset OTP for', email, ':', code);
      return { success: true, devMode: true };
    }
    throw error;
  }
};

