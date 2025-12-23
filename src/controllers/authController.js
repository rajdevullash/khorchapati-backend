const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { registerSchema, loginSchema } = require('../validators/auth');
const config = require('../config');
const emailService = require('../services/emailService');

// Initialize Google OAuth2 client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    // Send OTP email in background (non-blocking). We still return success immediately.
    // In development (or when allowEmailFailure is enabled) include the OTP in the response for easier testing.
    emailService.sendOTP(email, code)
      .then((result) => {
        if (result && result.devMode) {
          console.warn(`Email service reported devMode while sending OTP to ${email}`);
        } else {
          console.log(`Background email sent to ${email}`);
        }
      })
      .catch((emailError) => {
        console.error('Background email sending error:', emailError && emailError.message ? emailError.message : emailError);
      });

    if (config.allowEmailFailure) {
      // Return the code in response for local/dev convenience
      res.json({ 
        message: 'OTP generated (email sent in background or logged)', 
        email, 
        devCode: code,
        warning: 'Email may be delivered asynchronously or logged in server console.'
      });
    } else {
      res.json({ message: 'OTP generated and will be sent to your email shortly', email });
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

    // Send password reset OTP email in background (non-blocking)
    emailService.sendPasswordResetOTP(email, code)
      .then((result) => {
        if (result && result.devMode) {
          console.warn(`Password reset email service reported devMode for ${email}`);
        } else {
          console.log(`Background password reset email sent to ${email}`);
        }
      })
      .catch((emailError) => {
        console.error('Background password reset email error:', emailError && emailError.message ? emailError.message : emailError);
      });

    if (config.allowEmailFailure) {
      res.json({ 
        message: 'If email exists, OTP has been generated (email may be sent in background)', 
        devCode: code,
        warning: 'Email may be delivered asynchronously or logged in server console.'
      });
    } else {
      res.json({ message: 'If email exists, OTP will be sent to your email shortly' });
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


exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      currency: user.currency,
      theme: user.theme,
      notificationsEnabled: user.notificationsEnabled,
      notificationSettings: user.notificationSettings
    });
  } catch (err) {
    console.error('Get profile error:', err);
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

// Google Sign-In with ID Token (for @react-native-google-signin/google-signin)
exports.googleSignInWithIdToken = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Verify the ID token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('ID token verification failed:', error);
      return res.status(401).json({ error: 'Invalid ID token' });
    }

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    const picture = payload['picture'];

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId });

    if (user) {
      // User exists, return user
      const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    }

    // Check if user exists with this email (but no Google ID)
    user = await User.findOne({ email });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleId;
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      await user.save();

      const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    }

    // Create new user
    user = await User.create({
      googleId,
      name,
      email,
      avatar: picture || null,
    });

    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
};
