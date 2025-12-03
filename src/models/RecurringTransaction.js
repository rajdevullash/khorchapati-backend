const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
  note: { type: String },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date }, // optional, null = indefinite
  nextRunDate: { type: Date },
  isActive: { type: Boolean, default: true },
  
  // Subscription/EMI specific fields
  subscriptionType: { 
    type: String, 
    enum: ['bill', 'emi', 'rent', 'subscription', 'other'], 
    default: 'other' 
  },
  reminderDays: { 
    type: [Number], 
    default: [3, 1, 0] // Remind 3 days before, 1 day before, and on due date
  },
  lastReminderSent: { type: Date },
  lastPaidDate: { type: Date },
  autoPay: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
