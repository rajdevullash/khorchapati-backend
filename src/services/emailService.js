const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP configuration
const createTransporter = () => {
  // Check if using custom SMTP (optional override)
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

  // Default: Gmail SMTP
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  if (!emailUser || !emailPass) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Email service will fail.');
    console.warn('💡 Gmail App Password setup: https://myaccount.google.com/apppasswords');
    console.warn('💡 Set ALLOW_EMAIL_FAILURE=true to log OTP in console instead.');
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass // Use App Password for Gmail (not regular password)
    },
    connectionTimeout: 60000, // 60 seconds (increased for background/cloud environments)
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    pool: true, // Enable connection pooling for better reliability
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    tls: {
      rejectUnauthorized: false, // Sometimes needed for certain networks
      minVersion: 'TLSv1.2',
      ciphers: 'SSLv3'
    },
    debug: false, // Set to true for debugging
    logger: false
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

    // Add timeout wrapper with retry mechanism (increased timeout for Gmail/background)
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const sendWithTimeout = Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email sending timeout')), 60000) // 60 seconds
          )
        ]);

        const info = await sendWithTimeout;
        console.log('✅ OTP email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (attemptError) {
        lastError = attemptError;
        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 2000; // 2s, 4s delays
          console.log(`⚠️ Email send attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw lastError;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    // Always log OTP in console for debugging (even in production)
    console.log('📧 [FALLBACK] OTP for', email, ':', code);
    console.log('⚠️ Email service unavailable. OTP logged above for manual verification.');
    console.log('💡 Tip: Set ALLOW_EMAIL_FAILURE=true to return OTP in API response');
    
    // In development or if ALLOW_EMAIL_FAILURE is set, return success with dev mode flag
    // This allows the frontend to receive the OTP code even if email fails
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_EMAIL_FAILURE === 'true') {
      console.log('✅ Returning OTP in response (dev mode)');
      return { success: true, devMode: true, code }; // Return code for testing
    }
    
    // In production without ALLOW_EMAIL_FAILURE, still throw error but log the OTP
    // The authController will catch this and return the OTP in the response anyway
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

    // Add timeout wrapper with retry mechanism (increased timeout for Gmail/background)
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const sendWithTimeout = Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email sending timeout')), 60000) // 60 seconds
          )
        ]);

        const info = await sendWithTimeout;
        console.log('✅ Password reset OTP email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (attemptError) {
        lastError = attemptError;
        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 2000; // 2s, 4s delays
          console.log(`⚠️ Password reset email send attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw lastError;
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

