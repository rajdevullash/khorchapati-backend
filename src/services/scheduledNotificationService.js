const ScheduledNotification = require('../models/ScheduledNotification');
const notificationService = require('./notificationService');
const User = require('../models/User');

async function checkAndSendDueNotifications() {
  try {
    const now = new Date();
    const due = await ScheduledNotification.find({ sendAt: { $lte: now }, sent: false });
    if (!due || due.length === 0) return;

    for (const job of due) {
      try {
        let userIds = [];

        if (job.userIds && job.userIds.length > 0) {
          userIds = job.userIds.map(id => id.toString());
        } else if (job.segment && job.segment.type === 'inactive') {
          // find users who haven't had transactions in the last N days
          const days = job.segment.days || 7;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);

          // Users with no transactions after cutoff
          const Transaction = require('../models/Transaction');
          const activeUsers = await Transaction.aggregate([
            { $match: { date: { $gte: cutoff } } },
            { $group: { _id: '$user' } }
          ]);
          const activeIds = activeUsers.map(a => a._id.toString());

          const users = await User.find({ _id: { $nin: activeIds }, notificationsEnabled: true, isActive: true }).select('_id');
          userIds = users.map(u => u._id.toString());
        } else if (job.segment && job.segment.type === 'premium') {
          const users = await User.find({ isPremium: true, notificationsEnabled: true, isActive: true }).select('_id');
          userIds = users.map(u => u._id.toString());
        } else if (job.segment && job.segment.type === 'churn_risk') {
          // churn risk: had activity 31-90 days ago but none in last 30 days
          const now = new Date();
          const last30 = new Date(); last30.setDate(now.getDate() - 30);
          const from31 = new Date(); from31.setDate(now.getDate() - 90);

          const Transaction = require('../models/Transaction');
          const recentActive = await Transaction.aggregate([
            { $match: { date: { $gte: last30 } } },
            { $group: { _id: '$user' } }
          ]);
          const recentIds = recentActive.map(a => a._id.toString());

          const olderActive = await Transaction.aggregate([
            { $match: { date: { $gte: from31, $lt: last30 } } },
            { $group: { _id: '$user' } }
          ]);
          const olderIds = olderActive.map(a => a._id.toString());

          const candidates = await User.find({ _id: { $in: olderIds.filter(id => !recentIds.includes(id)) }, notificationsEnabled: true, isActive: true }).select('_id');
          userIds = candidates.map(u => u._id.toString());
        } else {
          // default: broadcast to all with tokens
          const users = await User.find({ notificationsEnabled: true, pushToken: { $exists: true, $ne: null } }).select('_id');
          userIds = users.map(u => u._id.toString());
        }

        if (userIds.length > 0) {
          await notificationService.sendBulkNotifications(userIds, { type: job.type || 'info', title: job.title, message: job.message, data: job.data || {}, priority: 'high' });
        }

        job.sent = true;
        await job.save();
        console.log(`Scheduled notification sent: ${job._id} to ${userIds.length} users`);
      } catch (err) {
        console.error('Error processing scheduled job', job._id, err);
      }
    }
  } catch (err) {
    console.error('ScheduledNotificationService error', err);
  }
}

module.exports = {
  checkAndSendDueNotifications
};
