const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const User = require('../models/User');

const expo = new Expo();

class NotificationService {
  /**
   * Send push notification to a user
   * @param {string} userId - User ID
   * @param {object} notification - {type, title, message, data}
   */
  async sendNotification(userId, notification) {
    try {
      // Save notification to database
      const notif = await Notification.create({
        user: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        priority: notification.priority || 'medium',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Get user's push token
      const user = await User.findById(userId);
      if (!user || !user.pushToken || !user.notificationsEnabled) {
        console.log('User has no push token or notifications disabled');
        return notif;
      }

      // Check notification preferences
      const typeMap = {
        'expense_added': 'expenses',
        'member_added': 'members',
        'settlement_request': 'settlements',
        'settlement_done': 'settlements',
        'payment_reminder': 'reminders',
        'budget_alert': 'budgets'
      };
      
      const settingKey = typeMap[notification.type];
      if (settingKey && user.notificationSettings && user.notificationSettings[settingKey] === false) {
        console.log(`User has disabled ${notification.type} notifications (${settingKey})`);
        return notif;
      }

      // Check if token is valid Expo push token
      if (!Expo.isExpoPushToken(user.pushToken)) {
        console.error(`Push token ${user.pushToken} is not a valid Expo push token`);
        return notif;
      }

      // Prepare push message
      const message = {
        to: user.pushToken,
        sound: 'default',
        title: notification.title,
        body: notification.message,
        data: { 
          notificationId: notif._id.toString(),
          ...notification.data 
        },
        priority: notification.priority === 'high' ? 'high' : 'default',
        badge: await this.getUnreadCount(userId)
      };

      // Send push notification
      const chunks = expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      console.log('Push notification sent:', tickets);
      return notif;
    } catch (error) {
      console.error('Error in sendNotification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {array} userIds - Array of user IDs
   * @param {object} notification - Notification data
   */
  async sendBulkNotifications(userIds, notification) {
    const promises = userIds.map(userId => 
      this.sendNotification(userId, notification)
    );
    return Promise.allSettled(promises);
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ user: userId, read: false });
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   */
  async markAsRead(notificationId) {
    return Notification.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {number} limit - Limit
   */
  async getUserNotifications(userId, limit = 50) {
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   */
  async deleteNotification(notificationId) {
    return Notification.findByIdAndDelete(notificationId);
  }

  /**
   * Update user's push token
   * @param {string} userId - User ID
   * @param {string} pushToken - Expo push token
   */
  async updatePushToken(userId, pushToken) {
    return User.findByIdAndUpdate(
      userId,
      { pushToken },
      { new: true }
    );
  }

  // ============ Specific Notification Types ============

  /**
   * Notify group members of new expense
   */
  async notifyNewExpense(expense, groupId) {
    try {
      const FamilyGroup = require('../models/FamilyGroup');
      const group = await FamilyGroup.findById(groupId).populate('members owner');
      if (!group) return;

      const memberIds = [
        group.owner._id.toString(),
        ...group.members.map(m => m._id.toString())
      ].filter(id => id !== expense.user.toString());

      const notification = {
        type: 'expense_added',
        title: `New expense in ${group.name}`,
        message: `৳${expense.amount} - ${expense.note || 'Expense'}`,
        data: {
          groupId: groupId,
          transactionId: expense._id.toString(),
          type: 'expense'
        },
        priority: 'medium'
      };

      await this.sendBulkNotifications(memberIds, notification);
    } catch (error) {
      console.error('Error notifying new expense:', error);
    }
  }

  /**
   * Notify group members of new member
   */
  async notifyNewMember(groupId, newMemberName) {
    try {
      const FamilyGroup = require('../models/FamilyGroup');
      const group = await FamilyGroup.findById(groupId).populate('members owner');
      if (!group) return;

      const memberIds = [
        group.owner._id.toString(),
        ...group.members.map(m => m._id.toString())
      ];

      const notification = {
        type: 'member_added',
        title: `New member in ${group.name}`,
        message: `${newMemberName} joined the group`,
        data: {
          groupId: groupId,
          type: 'member'
        },
        priority: 'low'
      };

      await this.sendBulkNotifications(memberIds, notification);
    } catch (error) {
      console.error('Error notifying new member:', error);
    }
  }

  /**
   * Notify settlement completed
   */
  async notifySettlement(fromUserId, toUserId, amount, groupId) {
    try {
      const FamilyGroup = require('../models/FamilyGroup');
      const group = await FamilyGroup.findById(groupId);
      const fromUser = await User.findById(fromUserId);

      const notification = {
        type: 'settlement_done',
        title: `Settlement in ${group.name}`,
        message: `${fromUser.name} settled ৳${amount}`,
        data: {
          groupId: groupId,
          fromUserId,
          toUserId,
          amount,
          type: 'settlement'
        },
        priority: 'high'
      };

      await this.sendNotification(toUserId, notification);
    } catch (error) {
      console.error('Error notifying settlement:', error);
    }
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(userId, groupId, amount, toUserName) {
    try {
      const FamilyGroup = require('../models/FamilyGroup');
      const group = await FamilyGroup.findById(groupId);

      const notification = {
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message: `You owe ৳${amount} to ${toUserName} in ${group.name}`,
        data: {
          groupId: groupId,
          amount,
          type: 'reminder'
        },
        priority: 'high'
      };

      await this.sendNotification(userId, notification);
    } catch (error) {
      console.error('Error sending payment reminder:', error);
    }
  }

  /**
   * Notify user of their own transaction (for personal tracking)
   */
  async notifyOwnTransaction(transaction, userId) {
    try {
      const Category = require('../models/Category');
      const category = await Category.findById(transaction.category);
      const categoryName = category ? category.name : 'Transaction';
      
      const typeText = transaction.type === 'expense' ? 'খরচ' : 'আয়';
      const icon = transaction.type === 'expense' ? '💸' : '💰';
      
      const notification = {
        type: 'expense_added',
        title: `${icon} ${typeText} যোগ করা হয়েছে`,
        message: `৳${transaction.amount} - ${transaction.note || categoryName}`,
        data: {
          transactionId: transaction._id.toString(),
          type: transaction.type,
          amount: transaction.amount
        },
        priority: 'low'
      };

      console.log('📤 Creating notification for own transaction:', notification);
      await this.sendNotification(userId, notification);
    } catch (error) {
      console.error('Error notifying own transaction:', error);
    }
  }
}

module.exports = new NotificationService();
