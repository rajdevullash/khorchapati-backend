const express = require('express');
const router = express.Router();
const auth = require('../utils/authMiddleware');
const requireRole = require('../utils/roleMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(auth);
router.use(requireRole(['admin', 'super_admin']));

// Summary dashboard (aggregated, privacy-safe)
router.get('/summary', adminController.summary);
router.get('/users', adminController.listUsers);
router.put('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/reset-data', adminController.resetUserData);

// Aggregated transactions
router.get('/transactions/summary', adminController.transactionsSummary);

// Notifications (send to selected users or broadcast)
router.post('/notifications/send', adminController.sendNotifications);
router.get('/notifications/stats', adminController.notificationsStats);
// Schedule endpoints
router.post('/notifications/schedule', adminController.sendNotifications);
router.get('/notifications/scheduled', async (req, res) => {
	try {
		const ScheduledNotification = require('../models/ScheduledNotification');
		const jobs = await ScheduledNotification.find().sort({ sendAt: -1 }).limit(200);
		res.json({ jobs });
	} catch (err) {
		console.error('List scheduled notifications error', err);
		res.status(500).json({ error: 'Server error' });
	}
});
// Get a scheduled notification details
router.get('/notifications/scheduled/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const ScheduledNotification = require('../models/ScheduledNotification');
		const job = await ScheduledNotification.findById(id);
		if (!job) return res.status(404).json({ error: 'Scheduled job not found' });
		res.json({ job });
	} catch (err) {
		console.error('Get scheduled notification error', err);
		res.status(500).json({ error: 'Server error' });
	}
});
// Cancel a scheduled notification
router.delete('/notifications/scheduled/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const ScheduledNotification = require('../models/ScheduledNotification');
		const job = await ScheduledNotification.findByIdAndDelete(id);
		if (!job) return res.status(404).json({ error: 'Scheduled job not found' });
		res.json({ success: true });
	} catch (err) {
		console.error('Cancel scheduled notification error', err);
		res.status(500).json({ error: 'Server error' });
	}
});

// Feature flags
router.get('/feature-flags', adminController.listFeatureFlags);
router.put('/feature-flags/:key', adminController.updateFeatureFlag);
router.get('/feature-flags/:key/evaluate', adminController.evaluateFeatureFlag);
// Evaluate all feature flags for a given user (returns map of key->boolean)
router.get('/feature-flags/evaluate-all', adminController.evaluateAllFeatureFlags);

// Smart suggestions
router.get('/suggestions', adminController.smartSuggestions);

// Admin settings (key/value)
router.get('/settings', adminController.listSettings);
router.put('/settings/:key', adminController.updateSetting);

// CMS
router.get('/cms', adminController.listCMS);
router.post('/cms', adminController.createCMS);
router.put('/cms/:id', adminController.updateCMS);
router.delete('/cms/:id', adminController.deleteCMS);

module.exports = router;
