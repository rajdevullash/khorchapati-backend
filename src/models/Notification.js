const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'expense_added',      // New expense in group
      'income_added',       // New income in group
      'member_added',       // New member joined group
      'settlement_request', // Someone wants to settle
      'settlement_done',    // Settlement completed
      'payment_reminder',   // Payment due reminder
      'budget_alert',       // Budget exceeded
      'group_invite'        // Invited to group
    ],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // Additional data (groupId, transactionId, etc)
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // Auto-delete old notifications
});

// Index for faster queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
