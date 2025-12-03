const RecurringTransaction = require('../models/RecurringTransaction');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');

/**
 * Check for upcoming subscriptions/EMIs and send reminders
 */
async function checkAndSendReminders() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find all active recurring transactions
    const activeSubscriptions = await RecurringTransaction.find({
      isActive: true,
      nextRunDate: { $exists: true, $ne: null }
    }).populate('user category');

    console.log(`🔔 Checking ${activeSubscriptions.length} active subscriptions for reminders...`);

    for (const subscription of activeSubscriptions) {
      if (!subscription.user || !subscription.nextRunDate) continue;

      const dueDate = new Date(subscription.nextRunDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      // Check if reminder should be sent
      const reminderDays = subscription.reminderDays || [3, 1, 0];
      const shouldRemind = reminderDays.includes(daysUntilDue);
      
      // Check if we already sent a reminder for this day
      const lastReminder = subscription.lastReminderSent 
        ? new Date(subscription.lastReminderSent)
        : null;
      const lastReminderDay = lastReminder 
        ? Math.floor((dueDate - new Date(lastReminder.getFullYear(), lastReminder.getMonth(), lastReminder.getDate())) / (1000 * 60 * 60 * 24))
        : null;
      
      if (shouldRemind && lastReminderDay !== daysUntilDue) {
        // Send reminder notification
        const categoryName = subscription.category?.name || 'Subscription';
        const typeText = subscription.type === 'expense' ? 'খরচ' : 'আয়';
        const subscriptionTypeText = {
          'bill': 'বিল',
          'emi': 'EMI',
          'rent': 'ভাড়া',
          'subscription': 'সাবস্ক্রিপশন',
          'other': 'পুনরাবৃত্ত'
        }[subscription.subscriptionType] || 'পুনরাবৃত্ত';

        let title, message;
        if (daysUntilDue === 0) {
          title = `💰 ${subscriptionTypeText} আজ পরিশোধ করতে হবে`;
          message = `${categoryName}: ৳${subscription.amount} - ${subscription.note || ''}`;
        } else if (daysUntilDue === 1) {
          title = `⏰ ${subscriptionTypeText} আগামীকাল পরিশোধ করতে হবে`;
          message = `${categoryName}: ৳${subscription.amount} - ${subscription.note || ''}`;
        } else {
          title = `📅 ${subscriptionTypeText} ${daysUntilDue} দিন পর পরিশোধ করতে হবে`;
          message = `${categoryName}: ৳${subscription.amount} - ${subscription.note || ''}`;
        }

        // Create notification
        const notification = await Notification.create({
          user: subscription.user._id || subscription.user,
          type: 'subscription_reminder',
          title,
          message,
          data: {
            subscriptionId: subscription._id.toString(),
            dueDate: dueDate.toISOString(),
            amount: subscription.amount,
            daysUntilDue
          },
          read: false
        });

        // Send push notification
        try {
          await notificationService.sendNotification(subscription.user._id || subscription.user, {
            type: 'subscription_reminder',
            title,
            message,
            data: {
              subscriptionId: subscription._id.toString(),
              dueDate: dueDate.toISOString(),
              amount: subscription.amount,
              daysUntilDue,
              screen: 'Recurring'
            },
            priority: daysUntilDue === 0 ? 'high' : 'normal'
          });
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
        }

        // Update last reminder sent
        subscription.lastReminderSent = now;
        await subscription.save();

        console.log(`✅ Sent reminder for subscription ${subscription._id} (${daysUntilDue} days until due)`);
      }
    }

    console.log('✅ Reminder check completed');
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

/**
 * Get upcoming subscriptions for a user
 */
async function getUpcomingSubscriptions(userId, days = 7) {
  try {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    const subscriptions = await RecurringTransaction.find({
      user: userId,
      isActive: true,
      nextRunDate: {
        $gte: now,
        $lte: futureDate
      }
    })
      .populate('category account paymentMethod')
      .sort({ nextRunDate: 1 });

    return subscriptions.map(sub => {
      const dueDate = new Date(sub.nextRunDate);
      const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...sub.toObject(),
        daysUntilDue,
        isDueToday: daysUntilDue === 0,
        isOverdue: daysUntilDue < 0
      };
    });
  } catch (error) {
    console.error('Error getting upcoming subscriptions:', error);
    return [];
  }
}

/**
 * Mark subscription as paid and update next run date
 */
async function markAsPaid(subscriptionId, userId, paidDate = new Date()) {
  try {
    const subscription = await RecurringTransaction.findOne({
      _id: subscriptionId,
      user: userId
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Calculate next run date based on frequency
    const nextDate = new Date(paidDate);
    switch (subscription.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    subscription.lastPaidDate = paidDate;
    subscription.nextRunDate = nextDate;
    subscription.lastReminderSent = null; // Reset reminder
    await subscription.save();

    return subscription;
  } catch (error) {
    console.error('Error marking subscription as paid:', error);
    throw error;
  }
}

module.exports = {
  checkAndSendReminders,
  getUpcomingSubscriptions,
  markAsPaid
};

