const notificationService = require('../services/notificationService');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await notificationService.getUserNotifications(req.user.id, limit);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ notification, unreadCount });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update push token
exports.updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    
    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    
    await notificationService.updatePushToken(req.user.id, pushToken);
    res.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update notification settings
exports.updateSettings = async (req, res) => {
  try {
    const User = require('../models/User');
    const { notificationsEnabled, notificationSettings } = req.body;
    
    const updateData = {};
    if (notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = notificationsEnabled;
    }
    if (notificationSettings) {
      updateData.notificationSettings = notificationSettings;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    );
    
    res.json({ user });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get notification settings
exports.getSettings = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('notificationSettings');
    
    res.json({ 
      settings: user?.notificationSettings || {
        expenses: true,
        settlements: true,
        members: true,
        reminders: true,
        budgets: true
      }
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Broadcast notification to all users (Admin only)
exports.broadcastToAll = async (req, res) => {
  try {
    const { title, message, type = 'info', data = {} } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = {
      type: type || 'info',
      title,
      message,
      data,
      priority: 'high'
    };

    const result = await notificationService.broadcastToAllUsers(notification);
    
    res.json({
      success: true,
      message: `Notification sent to ${result.sent} users`,
      ...result
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
