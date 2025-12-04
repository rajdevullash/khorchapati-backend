const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { registerSchema, loginSchema } = require('../validators/auth');
const config = require('../config');
const emailService = require('../services/emailService');

// Send OTP for email verification
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if email is already registered
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this email (email verification type)
    await OTP.deleteMany({ email, type: 'email-verification' });

    // Create new OTP (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({ email, code, expiresAt, type: 'email-verification' });

    // Send OTP email
    try {
      const result = await emailService.sendOTP(email, code);
      
      // If email failed but we have dev mode or fallback, return success with code
      if (result.devMode && result.code) {
        res.json({ 
          message: 'OTP generated (email service unavailable, check server logs)', 
          email, 
          devCode: result.code,
          warning: 'Email service is not working. OTP is logged in server console.'
        });
      } else {
        res.json({ message: 'OTP sent to your email', email });
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Extract OTP from error message if available
      const otpMatch = emailError.message?.match(/OTP: (\d+)/);
      const loggedCode = otpMatch ? otpMatch[1] : code;
      
      // Always return success with OTP in response for manual verification
      // This ensures the app doesn't break even if email fails
      res.json({ 
        message: 'OTP generated (email service unavailable)', 
        email, 
        devCode: loggedCode,
        warning: 'Email service is not working. Please check server logs for OTP or configure email service properly.'
      });
    }
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    // Find OTP
    const otp = await OTP.findOne({ email, code, verified: false });

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Check if expired
    if (new Date() > otp.expiresAt) {
      await OTP.deleteOne({ _id: otp._id });
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Mark as verified
    otp.verified = true;
    await otp.save();

    res.json({ message: 'Email verified successfully', email });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const { name, email, password } = parsed;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    // Check if email is verified
    const verifiedOTP = await OTP.findOne({ email, verified: true, type: 'email-verification' });
    if (!verifiedOTP) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    // Delete verified OTP after successful registration
    await OTP.deleteOne({ _id: verifiedOTP._id });

    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }, token });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const { email, password } = parsed;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Support for Google auth users (no password)

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }, token });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send OTP for password reset
exports.sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: 'If email exists, OTP has been sent' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing password reset OTPs for this email
    await OTP.deleteMany({ email, type: 'password-reset' });

    // Create new OTP (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({ email, code, expiresAt, type: 'password-reset' });

    // Send password reset OTP email
    try {
      const result = await emailService.sendPasswordResetOTP(email, code);
      
      // If email failed but we have dev mode or fallback, return success with code
      if (result.devMode && result.code) {
        res.json({ 
          message: 'If email exists, OTP has been generated (email service unavailable, check server logs)', 
          devCode: result.code,
          warning: 'Email service is not working. OTP is logged in server console.'
        });
      } else {
        res.json({ message: 'If email exists, OTP has been sent' });
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Extract OTP from error message if available
      const otpMatch = emailError.message?.match(/OTP: (\d+)/);
      const loggedCode = otpMatch ? otpMatch[1] : code;
      
      // Always return success with OTP in response for manual verification
      // This ensures the app doesn't break even if email fails
      res.json({ 
        message: 'If email exists, OTP has been generated (email service unavailable)', 
        devCode: loggedCode,
        warning: 'Email service is not working. Please check server logs for OTP or configure email service properly.'
      });
    }
  } catch (err) {
    console.error('Send password reset OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify OTP and reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find OTP
    const otp = await OTP.findOne({ email, code, type: 'password-reset', verified: false });

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Check if expired
    if (new Date() > otp.expiresAt) {
      await OTP.deleteOne({ _id: otp._id });
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { passwordHash });

    // Delete OTP after successful reset
    await OTP.deleteOne({ _id: otp._id });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, avatar } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
