const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String }, // optional for Google auth users
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  currency: { type: String, default: 'BDT' },
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  notificationsEnabled: { type: Boolean, default: true },
  pushToken: { type: String }, // Expo push notification token
  notificationSettings: {
    expenses: { type: Boolean, default: true },
    settlements: { type: Boolean, default: true },
    members: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    budgets: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
