const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('./config/passport');
const config = require('./config');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoriesRoutes = require('./routes/categories');
const paymentMethodsRoutes = require('./routes/paymentMethods');
const accountsRoutes = require('./routes/accounts');
const budgetsRoutes = require('./routes/budgets');
const recurringRoutes = require('./routes/recurring');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const reportsRoutes = require('./routes/reports');
const groupsRoutes = require('./routes/groups');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const receiptsRoutes = require('./routes/receipts');
const uploadRoutes = require('./routes/upload');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.DASHBOARD_FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// basic health
app.get('/health', (req, res) => res.json({ ok: true }));

// Public config endpoint (for frontend to get Google Client ID)
app.get('/api/config', require('./controllers/configController').getConfig);

// Start subscription reminder scheduler
if (process.env.NODE_ENV !== 'test') {
  const { startScheduler } = require('./utils/scheduler');
  startScheduler();
}

module.exports = app;
