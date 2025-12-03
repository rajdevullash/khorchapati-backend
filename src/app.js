const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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
const receiptsRoutes = require('./routes/receipts');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors());
app.use(express.json());

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

// basic health
app.get('/health', (req, res) => res.json({ ok: true }));

module.exports = app;
