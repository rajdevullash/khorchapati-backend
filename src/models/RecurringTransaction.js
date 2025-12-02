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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
