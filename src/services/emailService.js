const nodemailer = require('nodemailer');

// Create transporter with better configuration for production
const createTransporter = () => {
  // Check if using SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Check if using custom SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false // For self-signed certificates
      }
    });
  }

  // Default: Gmail SMTP with improved settings
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  if (!emailUser || !emailPass) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Email service will fail.');
    console.warn('💡 Set ALLOW_EMAIL_FAILURE=true to log OTP in console instead.');
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: emailUser || 'your-email@gmail.com',
      pass: emailPass || 'your-app-password' // Use App Password for Gmail
    },
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 15000,
    socketTimeout: 15000,
    pool: false, // Disable pooling for better reliability
    tls: {
      rejectUnauthorized: false, // Sometimes needed for certain networks
      ciphers: 'SSLv3'
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

    // Add timeout wrapper
    const sendWithTimeout = Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);

    const info = await sendWithTimeout;
    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    // Always log OTP in console for debugging (even in production)
    console.log('📧 [FALLBACK] OTP for', email, ':', code);
    console.log('⚠️ Email service unavailable. OTP logged above for manual verification.');
    
    // In development or if email fails, return success with dev mode flag
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_EMAIL_FAILURE === 'true') {
      return { success: true, devMode: true, code }; // Return code for testing
    }
    
    // In production, still throw error but log the OTP
    throw new Error(`Email sending failed: ${error.message}. OTP: ${code} (logged in console)`);
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

    // Add timeout wrapper
    const sendWithTimeout = Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);

    const info = await sendWithTimeout;
    console.log('✅ Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset OTP email:', error);
    
    // Always log OTP in console for debugging (even in production)
    console.log('📧 [FALLBACK] Password reset OTP for', email, ':', code);
    console.log('⚠️ Email service unavailable. OTP logged above for manual verification.');
    
    // In development or if email fails, return success with dev mode flag
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_EMAIL_FAILURE === 'true') {
      return { success: true, devMode: true, code }; // Return code for testing
    }
    
    // In production, still throw error but log the OTP
    throw new Error(`Email sending failed: ${error.message}. OTP: ${code} (logged in console)`);
  }
};

