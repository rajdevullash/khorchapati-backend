const mongoose = require('mongoose');

const scheduledNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  data: { type: mongoose.Schema.Types.Mixed },
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  segment: { type: mongoose.Schema.Types.Mixed }, // e.g. { type: 'inactive', days: 7 }
  sendAt: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduledNotification', scheduledNotificationSchema);
