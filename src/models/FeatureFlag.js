const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  rolloutPercentage: { type: Number, default: 0 }, // 0-100
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

featureFlagSchema.pre('save', function(next){
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
