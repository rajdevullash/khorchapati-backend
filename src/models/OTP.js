const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['email-verification', 'password-reset'], default: 'email-verification' },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }, // Auto-delete after expiration
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Index for faster lookups
otpSchema.index({ email: 1, code: 1 });

module.exports = mongoose.model('OTP', otpSchema);

