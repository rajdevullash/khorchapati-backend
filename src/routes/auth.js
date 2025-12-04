const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const auth = require('../utils/authMiddleware');

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/register', authController.register);
router.post('/forgot-password', authController.sendPasswordResetOTP);
router.post('/reset-password', authController.resetPassword);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Store redirect_uri in session for callback
  if (req.query.redirect_uri) {
    req.session.redirect_uri = req.query.redirect_uri;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', 
  (req, res, next) => {
    // Restore redirect_uri from session
    if (req.session.redirect_uri) {
      req.query.redirect_uri = req.session.redirect_uri;
      delete req.session.redirect_uri;
    }
    passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' })(req, res, next);
  },
  authController.googleCallback
);
router.get('/google/failure', authController.googleFailure);
router.post('/login', authController.login);

// Protected routes
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
