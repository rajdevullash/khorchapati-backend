const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // for transfers
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
  note: { type: String },
  date: { type: Date, default: Date.now },
  receiptUrl: { type: String }, // OCR receipt image URL
  receiptPublicId: { type: String }, // Cloudinary public ID for deletion
  receiptData: { // OCR extracted data
    merchant: String,
    items: [{ name: String, price: Number }],
    confidence: Number,
    rawText: String
  },
  isRecurring: { type: Boolean, default: false },
  recurringTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction' },
  
  // Group & Split Expense Fields
  familyGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyGroup' },
  splitWith: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    amount: Number 
  }],
  splitType: { 
    type: String, 
    enum: ['equal', 'custom', 'percentage'], 
    default: 'equal' 
  },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who actually paid
  isSettlement: { type: Boolean, default: false }, // settlement transaction
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who settled with whom
  
  // Additional fields
  attachments: [{ type: String }], // bill/receipt images
  location: { type: String },
  
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
