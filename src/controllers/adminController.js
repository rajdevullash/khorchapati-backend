const User = require('../models/User');
const Transaction = require('../models/Transaction');
const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const FeatureFlag = require('../models/FeatureFlag');
const CMSContent = require('../models/CMSContent');
const AdminSetting = require('../models/AdminSetting');

// Return privacy-safe aggregated summary
exports.summary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    // DAU/MAU simple implementations (based on Transaction dates)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dau = await Transaction.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$user', last: { $max: '$date' } } },
      { $count: 'count' }
    ]);

    // Monthly active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const mau = await Transaction.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$user' } },
      { $count: 'count' }
    ]);

    // Average expense per user (over last 30 days)
    const avgExpenseAgg = await Transaction.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo }, type: 'expense' } },
      { $group: { _id: '$user', total: { $sum: '$amount' } } },
      { $group: { _id: null, avg: { $avg: '$total' } } }
    ]);

    const avgExpensePerUser = (avgExpenseAgg[0] && avgExpenseAgg[0].avg) || 0;

    res.json({ totalUsers, activeUsers, inactiveUsers, dau: (dau[0] && dau[0].count) || 0, mau: (mau[0] && mau[0].count) || 0, avgExpensePerUser });
  } catch (err) {
    console.error('Admin summary error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Paginated user list (privacy-safe)
exports.listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const users = await User.find({}, 'name email createdAt isActive role').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await User.countDocuments();

    res.json({ users, total, page, limit });
  } catch (err) {
    console.error('List users error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Suspend/Unsuspend user
exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'suspend' or 'unsuspend'
    const isActive = action === 'unsuspend' ? true : false;

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('id name email isActive');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    console.error('Suspend user error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset user data (delete transactions/receipts etc.) - minimal implementation
exports.resetUserData = async (req, res) => {
  try {
    const { id } = req.params;
    // For safety, only remove user transactions and receipts in this simple helper
    await Transaction.deleteMany({ user: id });
    // TODO: delete receipts and other user data when models/files are available

    res.json({ success: true, message: 'User transactional data removed (transactions). Other data removal may need manual steps.' });
  } catch (err) {
    console.error('Reset user data error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Aggregated transactions summary (privacy-safe)
exports.transactionsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { };
    if (startDate && endDate) {
      match.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const totalCountAgg = await Transaction.aggregate([
      { $match: match },
      { $count: 'count' }
    ]);

    const avgAgg = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, avgAmount: { $avg: '$amount' } } }
    ]);

    const categoryDist = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 20 }
    ]);

    res.json({ totalCount: (totalCountAgg[0] && totalCountAgg[0].count) || 0, avgAmount: (avgAgg[0] && avgAgg[0].avgAmount) || 0, categoryDist });
  } catch (err) {
    console.error('Transactions summary error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send notification to selected users or segment
// Send notification immediately or schedule it
exports.sendNotifications = async (req, res) => {
  try {
    const { userIds, segment, type = 'info', title, message, data = {}, scheduleAt } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

    // If scheduleAt provided, create scheduled job
    if (scheduleAt) {
      const ScheduledNotification = require('../models/ScheduledNotification');
      const sendAt = new Date(scheduleAt);
      if (isNaN(sendAt)) return res.status(400).json({ error: 'Invalid scheduleAt' });

      const job = await ScheduledNotification.create({ title, message, type, data, userIds: userIds || [], segment: segment || null, sendAt, createdBy: req.user.id });
      return res.json({ success: true, scheduled: true, jobId: job._id });
    }

    // Immediate send
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const results = await notificationService.sendBulkNotifications(userIds, { type, title, message, data, priority: 'high' });
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return res.json({ success: true, sent, failed });
    }

    // If segment provided, support 'inactive' segment type (last N days)
    if (segment && segment.type === 'inactive') {
      const days = segment.days || 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const Transaction = require('../models/Transaction');
      const activeUsers = await Transaction.aggregate([
        { $match: { date: { $gte: cutoff } } },
        { $group: { _id: '$user' } }
      ]);
      const activeIds = activeUsers.map(a => a._id.toString());
      const users = await User.find({ _id: { $nin: activeIds }, notificationsEnabled: true, isActive: true }).select('_id');
      const ids = users.map(u => u._id.toString());

      const results = await notificationService.sendBulkNotifications(ids, { type, title, message, data, priority: 'high' });
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return res.json({ success: true, sent, failed });
    }

    // Default: broadcast to all
    const result = await notificationService.broadcastToAllUsers({ type, title, message, data, priority: 'high' });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Send notifications error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Notification delivery stats (sent vs read)
exports.notificationsStats = async (req, res) => {
  try {
    const total = await Notification.countDocuments();
    const read = await Notification.countDocuments({ read: true });
    const unread = total - read;
    res.json({ total, read, unread });
  } catch (err) {
    console.error('Notifications stats error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Feature flags
exports.listFeatureFlags = async (req, res) => {
  try {
    const flags = await FeatureFlag.find().sort({ key: 1 });
    res.json({ flags });
  } catch (err) {
    console.error('List feature flags error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateFeatureFlag = async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, rolloutPercentage, description } = req.body;
    const flag = await FeatureFlag.findOneAndUpdate(
      { key },
      { $set: { enabled: !!enabled, rolloutPercentage: Math.max(0, Math.min(100, rolloutPercentage || 0)), description } },
      { upsert: true, new: true }
    );
    res.json({ flag });
  } catch (err) {
    console.error('Update feature flag error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// CMS CRUD
exports.listCMS = async (req, res) => {
  try {
    const items = await CMSContent.find().sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    console.error('List CMS error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createCMS = async (req, res) => {
  try {
    const { type, title, body, image, published } = req.body;
    if (!type || !title || !body) return res.status(400).json({ error: 'type, title and body are required' });
    const item = await CMSContent.create({ type, title, body, image, published: !!published });
    res.json({ item });
  } catch (err) {
    console.error('Create CMS error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateCMS = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const item = await CMSContent.findByIdAndUpdate(id, update, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  } catch (err) {
    console.error('Update CMS error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteCMS = async (req, res) => {
  try {
    const { id } = req.params;
    await CMSContent.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete CMS error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Smart suggestions based on analytics (e.g., detect inactive users and recommend actions)
exports.smartSuggestions = async (req, res) => {
  try {
    // Configurable params: prefer admin settings stored in DB
    let days = parseInt(req.query.days) || 7;
    let thresholdPercent = parseInt(req.query.threshold) || 10; // when inactive % >= threshold, recommend action
    try {
      const daysSetting = await AdminSetting.findOne({ key: 'suggestions.days' });
      const thresholdSetting = await AdminSetting.findOne({ key: 'suggestions.thresholdPercent' });
      if (daysSetting && Number.isInteger(daysSetting.value)) days = daysSetting.value;
      if (thresholdSetting && Number.isInteger(thresholdSetting.value)) thresholdPercent = thresholdSetting.value;
    } catch (e) {
      // ignore and use query/defaults
    }
    const totalUsers = await User.countDocuments({});

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const Transaction = require('../models/Transaction');
    const activeUsers = await Transaction.aggregate([
      { $match: { date: { $gte: cutoff } } },
      { $group: { _id: '$user' } }
    ]);
    const activeIds = activeUsers.map(a => a._id.toString());
    const inactiveCount = await User.countDocuments({ _id: { $nin: activeIds }, isActive: true });

    const inactivePercent = totalUsers === 0 ? 0 : Math.round((inactiveCount / totalUsers) * 100);

    const suggestions = [];
    if (inactivePercent >= thresholdPercent) {
      suggestions.push({
        id: 'reminder-inactive',
        title: `Inactive users: ${inactivePercent}%`,
        message: `There are ${inactiveCount} users (${inactivePercent}%) with no activity in the last ${days} days. Consider sending a re-engagement notification.`,
        action: { type: 'send_notification', segment: { type: 'inactive', days } }
      });
    }

    // Churn risk suggestion: if churn risk > 5% suggest targeted campaign
    // Determine churn risk users (activity 31-90 days ago, none in last 30)
    const now = new Date();
    const last30 = new Date(); last30.setDate(now.getDate() - 30);
    const from31 = new Date(); from31.setDate(now.getDate() - 90);
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
    const churnCandidatesCount = await User.countDocuments({ _id: { $in: olderIds.filter(id => !recentIds.includes(id)) }, isActive: true });
    const churnPercent = totalUsers === 0 ? 0 : Math.round((churnCandidatesCount / totalUsers) * 100);
    if (churnPercent >= 5) {
      suggestions.push({
        id: 'churn-risk',
        title: `Churn risk: ${churnPercent}%`,
        message: `There are ${churnCandidatesCount} users (${churnPercent}%) showing churn-risk behavior. Consider a re-engagement campaign.`,
        action: { type: 'send_notification', segment: { type: 'churn_risk' } }
      });
    }

    // Premium upsell suggestion if premium users are growing
    const premiumCount = await User.countDocuments({ isPremium: true });
    const premiumPercent = totalUsers === 0 ? 0 : Math.round((premiumCount / totalUsers) * 100);
    if (premiumPercent >= 1) {
      suggestions.push({
        id: 'premium-check',
        title: `Premium users: ${premiumPercent}%`,
        message: `There are ${premiumCount} premium users (${premiumPercent}%). Consider targeted premium campaigns or feature flags.`,
        action: { type: 'open_feature_flags' }
      });
    }

    res.json({ totalUsers, inactiveCount, inactivePercent, churnCandidatesCount, churnPercent, premiumCount, premiumPercent, suggestions });
  } catch (err) {
    console.error('Smart suggestions error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Evaluate feature flag for a given user
exports.evaluateFeatureFlag = async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.query.userId;
    const featureService = require('../services/featureFlagService');
    const enabled = await featureService.isFeatureEnabledForUser(key, userId);
    res.json({ key, userId, enabled });
  } catch (err) {
    console.error('Evaluate feature flag error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Evaluate all flags for a user
exports.evaluateAllFeatureFlags = async (req, res) => {
  try {
    const userId = req.query.userId;
    const featureService = require('../services/featureFlagService');
    const flags = await FeatureFlag.find();
    const result = {};
    for (const f of flags) {
      result[f.key] = await featureService.isFeatureEnabledForUser(f.key, userId);
    }
    res.json({ userId, flags: result });
  } catch (err) {
    console.error('Evaluate all feature flags error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin settings
exports.listSettings = async (req, res) => {
  try {
    const settings = await AdminSetting.find().sort({ key: 1 });
    const map = {};
    settings.forEach(s => map[s.key] = s.value);
    res.json({ settings: map });
  } catch (err) {
    console.error('List settings error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const setting = await AdminSetting.findOneAndUpdate({ key }, { $set: { value } }, { upsert: true, new: true });
    res.json({ setting });
  } catch (err) {
    console.error('Update setting error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
