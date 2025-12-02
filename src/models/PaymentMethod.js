const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for default payment methods
  name: { type: String, required: true }, // Cash, Bkash, Nagad, Card, Bank
  type: { type: String, enum: ['cash', 'mobile_banking', 'card', 'bank'], default: 'cash' },
  icon: { type: String },
  color: { type: String },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
