const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for default categories
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense', 'both'], default: 'expense' },
  icon: { type: String }, // icon name or emoji
  color: { type: String }, // hex color
  isDefault: { type: Boolean, default: false }, // system default categories
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', categorySchema);
