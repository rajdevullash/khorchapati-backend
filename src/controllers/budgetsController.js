const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { budgetSchema } = require('../validators/budget');

exports.list = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id }).populate('category');
    res.json(budgets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const parsed = budgetSchema.parse(req.body);
    const budget = await Budget.create({ ...parsed, user: req.user.id });
    res.json(budget);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = budgetSchema.parse(req.body);
    const budget = await Budget.findOneAndUpdate(
      { _id: id, user: req.user.id },
      parsed,
      { new: true }
    );
    if (!budget) return res.status(404).json({ error: 'Not found' });
    res.json(budget);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findOneAndDelete({ _id: id, user: req.user.id });
    if (!budget) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get budget status with spent amount
exports.status = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id }).populate('category');
    
    const budgetStatus = await Promise.all(budgets.map(async (budget) => {
      const now = new Date();
      const startDate = budget.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = budget.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const query = {
        user: req.user.id,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate }
      };

      if (budget.category) query.category = budget.category;

      const transactions = await Transaction.find(query);
      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const percentage = (spent / budget.amount) * 100;

      return {
        ...budget.toObject(),
        spent,
        remaining: budget.amount - spent,
        percentage: Math.round(percentage),
        isOverBudget: spent > budget.amount,
        shouldAlert: percentage >= budget.alertThreshold
      };
    }));

    res.json(budgetStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
