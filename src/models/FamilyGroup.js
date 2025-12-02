const mongoose = require('mongoose');

const familyGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { 
    type: String, 
    enum: ['family', 'friends', 'trip', 'roommate', 'other'], 
    default: 'other' 
  },
  avatar: { type: String, default: '' }, // Color code or icon name
  currency: { type: String, default: 'BDT' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
  settings: {
    allowMemberInvite: { type: Boolean, default: false },
    autoSplit: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false }
  },
  stats: {
    totalExpenses: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
familyGroupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FamilyGroup', familyGroupSchema);
