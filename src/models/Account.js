const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // Cash, Bank, bKash, Card
  type: { type: String, enum: ['cash', 'bank', 'mobile_banking', 'card', 'other'], default: 'cash' },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'BDT' },
  icon: { type: String },
  color: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', accountSchema);
