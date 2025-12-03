const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../utils/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
