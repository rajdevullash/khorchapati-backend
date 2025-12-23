const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema({
  type: { type: String, enum: ['tip', 'faq', 'article', 'help'], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  image: { type: String },
  published: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

cmsSchema.pre('save', function(next){
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CMSContent', cmsSchema);
