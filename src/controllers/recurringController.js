const RecurringTransaction = require('../models/RecurringTransaction');
const { recurringTransactionSchema } = require('../validators/recurringTransaction');
const subscriptionReminderService = require('../services/subscriptionReminderService');

exports.list = async (req, res) => {
  try {
    const recurring = await RecurringTransaction.find({ user: req.user.id })
      .populate('category account paymentMethod')
      .sort({ nextRunDate: 1 });
    res.json(recurring);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const parsed = recurringTransactionSchema.parse(req.body);
    const recurring = await RecurringTransaction.create({ 
      ...parsed, 
      user: req.user.id,
      nextRunDate: parsed.startDate || new Date()
    });
    res.json(recurring);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = recurringTransactionSchema.parse(req.body);
    const recurring = await RecurringTransaction.findOneAndUpdate(
      { _id: id, user: req.user.id },
      parsed,
      { new: true }
    );
    if (!recurring) return res.status(404).json({ error: 'Not found' });
    res.json(recurring);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const recurring = await RecurringTransaction.findOneAndDelete({ _id: id, user: req.user.id });
    if (!recurring) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const recurring = await RecurringTransaction.findOne({ _id: id, user: req.user.id });
    if (!recurring) return res.status(404).json({ error: 'Not found' });
    
    recurring.isActive = !recurring.isActive;
    await recurring.save();
    res.json(recurring);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get upcoming subscriptions (for reminder dashboard)
 */
exports.getUpcoming = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const upcoming = await subscriptionReminderService.getUpcomingSubscriptions(req.user.id, days);
    res.json(upcoming);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Mark subscription as paid and update next run date
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidDate } = req.body;
    
    const subscription = await subscriptionReminderService.markAsPaid(
      id,
      req.user.id,
      paidDate ? new Date(paidDate) : new Date()
    );
    
    res.json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
