const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const User = require('../models/User');

const expo = new Expo();

// Firebase Admin SDK (optional - only initialize if credentials exist)
let admin = null;
try {
  // Try to load Firebase Admin config
  const path = require('path');
  const adminPath = path.join(__dirname, '../config/firebase-admin.js');
  const fs = require('fs');
  
  if (fs.existsSync(adminPath)) {
    const adminModule = require('../config/firebase-admin');
    // Check if admin is actually initialized (has at least one app)
    if (adminModule && adminModule.apps && adminModule.apps.length > 0) {
      admin = adminModule;
      console.log('✅ Firebase Admin SDK initialized for FCM support');
    } else {
      console.log('⚠️ Firebase Admin SDK config file exists but not properly initialized.');
      console.log('   Add service-account-key.json or set environment variables. See backend/FIREBASE_QUICK_SETUP.md');
    }
  } else {
    console.log('⚠️ Firebase Admin SDK not configured. FCM notifications will be skipped.');
    console.log('   To enable FCM: See backend/FIREBASE_QUICK_SETUP.md');
  }
} catch (error) {
  console.log('⚠️ Firebase Admin SDK initialization failed:', error.message);
  console.log('   Expo push notifications will still work. See backend/FIREBASE_QUICK_SETUP.md for FCM setup');
}

// Helper functions to detect token type
function isExpoToken(token) {
  return token && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken'));
}

function isFCMToken(token) {
  return token && token.length > 100 && !isExpoToken(token);
}

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
        'subscription_reminder': 'reminders',
        'budget_alert': 'budgets'
      };
      
      const settingKey = typeMap[notification.type];
      if (settingKey && user.notificationSettings && user.notificationSettings[settingKey] === false) {
        console.log(`User has disabled ${notification.type} notifications (${settingKey})`);
        return notif;
      }

      // Detect token type and send accordingly
      if (isExpoToken(user.pushToken)) {
        // Send via Expo (for React Native apps)
        if (!Expo.isExpoPushToken(user.pushToken)) {
          console.error(`Invalid Expo push token: ${user.pushToken}`);
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
            console.error('Error sending Expo push notification chunk:', error);
          }
        }

        console.log('✅ Expo push notification sent:', tickets);
        
      } else if (isFCMToken(user.pushToken)) {
        // Send via FCM (for Flutter apps)
        if (!admin || !admin.apps || admin.apps.length === 0) {
          console.log('⚠️ FCM token detected but Firebase Admin SDK not configured. Skipping push notification.');
          if (admin && admin.apps) {
            console.log(`   Admin module loaded but not initialized. Apps count: ${admin.apps.length}`);
          }
          return notif;
        }

        try {
          const fcmMessage = {
            notification: {
              title: notification.title,
              body: notification.message,
            },
            data: {
              notificationId: notif._id.toString(),
              type: notification.type || '',
              ...Object.fromEntries(
                Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)])
              )
            },
            token: user.pushToken,
            android: {
              priority: notification.priority === 'high' ? 'high' : 'normal',
              notification: {
                sound: 'default',
                channelId: 'high_importance_channel'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: await this.getUnreadCount(userId)
                }
              }
            }
          };

          const response = await admin.messaging().send(fcmMessage);
          console.log('✅ FCM push notification sent successfully:', response);
        } catch (error) {
          console.error('❌ Error sending FCM push notification:', error);
          
          // If token is invalid, remove it from user
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            console.log('⚠️ Removing invalid FCM token from user');
            user.pushToken = null;
            await user.save();
          }
        }
      } else {
        console.error(`⚠️ Unknown token format: ${user.pushToken?.substring(0, 50)}...`);
        return notif;
      }
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
   * Send notification to ALL users (broadcast)
   * @param {object} notification - Notification data
   */
  async broadcastToAllUsers(notification) {
    try {
      const User = require('../models/User');
      
      // Get all users who have notifications enabled
      const users = await User.find({ 
        notificationsEnabled: true,
        pushToken: { $exists: true, $ne: null }
      }).select('_id');

      const userIds = users.map(user => user._id.toString());
      console.log(`📢 Broadcasting to ${userIds.length} users`);

      if (userIds.length === 0) {
        console.log('⚠️ No users found with notifications enabled');
        return { sent: 0, failed: 0 };
      }

      // Send to all users
      const results = await this.sendBulkNotifications(userIds, notification);
      
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Broadcast complete: ${sent} sent, ${failed} failed`);
      return { sent, failed, total: userIds.length };
    } catch (error) {
      console.error('Error broadcasting to all users:', error);
      throw error;
    }
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

