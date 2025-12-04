const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const auth = require('../utils/authMiddleware');
const jwt = require('jsonwebtoken');
const config = require('../config');

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/register', authController.register);
router.post('/forgot-password', authController.sendPasswordResetOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/login', authController.login);

// Google Token-based authentication route
router.post(
  '/google/token',
  passport.authenticate('google-token', { session: false }),
  (req, res) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed' });
      }

      // Generate JWT token
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
      console.error('Google token authentication error:', error);
      res.status(500).json({ error: 'Server error during authentication' });
    }
  }
);

// Protected routes
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
