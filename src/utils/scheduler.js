const subscriptionReminderService = require('../services/subscriptionReminderService');
const scheduledNotificationService = require('../services/scheduledNotificationService');

/**
 * Start scheduled tasks for subscription reminders
 * Runs every day at 9 AM to check for upcoming payments
 */
function startScheduler() {
  console.log('⏰ Starting subscription reminder scheduler...');

  // Run immediately on startup
  subscriptionReminderService.checkAndSendReminders().catch(console.error);

  // Calculate time until next 9 AM
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(9, 0, 0, 0);
  
  // If it's already past 9 AM today, schedule for tomorrow
  if (now >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const msUntilNextRun = nextRun - now;
  console.log(`⏰ Next reminder check scheduled for: ${nextRun.toLocaleString()}`);

  // Schedule first run
  setTimeout(() => {
    subscriptionReminderService.checkAndSendReminders().catch(console.error);
    
    // Then run every 24 hours
    setInterval(() => {
      subscriptionReminderService.checkAndSendReminders().catch(console.error);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilNextRun);

  // Also start scheduled notification checker (runs every 60 seconds)
  setInterval(() => {
    scheduledNotificationService.checkAndSendDueNotifications().catch(console.error);
  }, 60 * 1000);
}

module.exports = {
  startScheduler
};

