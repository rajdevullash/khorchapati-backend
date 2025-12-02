const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const Category = require('./src/models/Category');
const PaymentMethod = require('./src/models/PaymentMethod');
const User = require('./src/models/User');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aybay';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

const defaultCategories = [
  { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#ff9800', isDefault: true },
  { name: 'Transport', type: 'expense', icon: '🚗', color: '#2196f3', isDefault: true },
  { name: 'Shopping', type: 'expense', icon: '🛒', color: '#e91e63', isDefault: true },
  { name: 'Utility Bills', type: 'expense', icon: '💡', color: '#9c27b0', isDefault: true },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#f44336', isDefault: true },
  { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#4caf50', isDefault: true },
  { name: 'Education', type: 'expense', icon: '📚', color: '#3f51b5', isDefault: true },
  { name: 'Rent', type: 'expense', icon: '🏠', color: '#795548', isDefault: true },
  { name: 'Salary', type: 'income', icon: '💰', color: '#4caf50', isDefault: true },
  { name: 'Freelance', type: 'income', icon: '💼', color: '#00bcd4', isDefault: true },
  { name: 'Investment', type: 'income', icon: '📈', color: '#8bc34a', isDefault: true },
  { name: 'Gift', type: 'both', icon: '🎁', color: '#ff5722', isDefault: true },
  { name: 'Other', type: 'both', icon: '📦', color: '#607d8b', isDefault: true }
];

const defaultPaymentMethods = [
  { name: 'Cash', type: 'cash', icon: '💵', color: '#4caf50', isDefault: true },
  { name: 'bKash', type: 'mobile_banking', icon: '📱', color: '#e91e63', isDefault: true },
  { name: 'Nagad', type: 'mobile_banking', icon: '📱', color: '#ff9800', isDefault: true },
  { name: 'Bank Card', type: 'card', icon: '💳', color: '#2196f3', isDefault: true },
  { name: 'Bank Transfer', type: 'bank', icon: '🏦', color: '#3f51b5', isDefault: true },
  { name: 'Rocket', type: 'mobile_banking', icon: '🚀', color: '#9c27b0', isDefault: true }
];

async function seed() {
  try {
    // Clear existing default data
    await Category.deleteMany({ isDefault: true });
    await PaymentMethod.deleteMany({ isDefault: true });

    // Create demo user
    const existingDemoUser = await User.findOne({ email: 'demo@aybay.com' });
    if (!existingDemoUser) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      const demoUser = await User.create({
        name: 'Demo User',
        email: 'demo@aybay.com',
        passwordHash: hashedPassword,
        currency: 'BDT',
        theme: 'dark',
        notificationsEnabled: true
      });
      console.log(`✅ Created demo user: ${demoUser.email}`);
    } else {
      console.log(`ℹ️  Demo user already exists: ${existingDemoUser.email}`);
    }

    // Insert default categories (without user reference for default items)
    const categories = await Category.insertMany(
      defaultCategories.map(c => ({ ...c, user: null }))
    );
    console.log(`✅ Inserted ${categories.length} default categories`);

    // Insert default payment methods
    const paymentMethods = await PaymentMethod.insertMany(
      defaultPaymentMethods.map(pm => ({ ...pm, user: null }))
    );
    console.log(`✅ Inserted ${paymentMethods.length} default payment methods`);

    console.log('🎉 Seed completed successfully!');
    console.log('\n📋 Demo Login Credentials:');
    console.log('   Email: demo@aybay.com');
    console.log('   Password: 123456');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
