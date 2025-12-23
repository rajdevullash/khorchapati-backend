const express = require('express');
const router = express.Router();
const auth = require('../utils/authMiddleware');
const requireRole = require('../utils/roleMiddleware');
const notificationsController = require('../controllers/notificationsController');

router.use(auth);

router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.get('/settings', notificationsController.getSettings);
router.put('/:id/read', notificationsController.markAsRead);
router.put('/read-all', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.deleteNotification);
router.post('/push-token', notificationsController.updatePushToken);
router.put('/settings', notificationsController.updateSettings);
router.post('/broadcast', requireRole(['admin', 'super_admin']), notificationsController.broadcastToAll);

module.exports = router;
