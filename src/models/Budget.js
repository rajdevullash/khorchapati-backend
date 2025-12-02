const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // null means overall budget
  amount: { type: Number, required: true },
  period: { type: String, enum: ['monthly', 'weekly', 'yearly'], default: 'monthly' },
  startDate: { type: Date },
  endDate: { type: Date },
  alertThreshold: { type: Number, default: 80 }, // percentage (e.g., 80% = alert when 80% spent)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Budget', budgetSchema);
