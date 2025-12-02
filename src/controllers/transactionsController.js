const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { transactionSchema } = require('../validators/transactions');
const aiInsightsService = require('../services/aiInsightsService');
const notificationService = require('../services/notificationService');

exports.create = async (req, res) => {
  try {
    console.log('📥 Received transaction data:', req.body);
    const parsed = transactionSchema.parse(req.body);
    console.log('✅ Validated data:', parsed);
    
    const tx = await Transaction.create({ ...parsed, user: req.user.id });

    // Update account balance if account is specified
    if (parsed.account) {
      const account = await Account.findById(parsed.account);
      if (account) {
        if (parsed.type === 'income') account.balance += parsed.amount;
        if (parsed.type === 'expense') account.balance -= parsed.amount;
        await account.save();
      }
    }

    const populated = await Transaction.findById(tx._id)
      .populate('category account paymentMethod');
    console.log('✅ Transaction created:', populated);
    
    // Send notification for group expense to group members
    if (parsed.familyGroup && !parsed.isSettlement) {
      notificationService.notifyNewExpense(populated, parsed.familyGroup).catch(console.error);
    }
    
    // Send notification to user for their own transaction (for tracking)
    if (!parsed.isSettlement) {
      notificationService.notifyOwnTransaction(populated, req.user.id).catch(console.error);
    }
    
    res.json(populated);
  } catch (err) {
    if (err.name === 'ZodError') {
      console.error('❌ Validation error:', err.errors);
      return res.status(400).json({ error: err.errors });
    }
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      category, 
      type, 
      paymentMethod, 
      account,
      sortBy = 'date',
      order = 'desc',
      limit = 100,
      skip = 0
    } = req.query;

    const query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category) query.category = category;
    if (type) query.type = type;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (account) query.account = account;

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const items = await Transaction.find(query)
      .populate('category account paymentMethod toAccount')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Transaction.countDocuments(query);

    res.json({ transactions: items, total, limit: parseInt(limit), skip: parseInt(skip) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await Transaction.findOne({ _id: id, user: req.user.id })
      .populate('category account paymentMethod toAccount');
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = transactionSchema.parse(req.body);
    const tx = await Transaction.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { ...parsed, updatedAt: new Date() },
      { new: true }
    ).populate('category account paymentMethod');
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.json(tx);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await Transaction.findOneAndDelete({ _id: id, user: req.user.id });
    if (!tx) return res.status(404).json({ error: 'Not found' });

    // Reverse account balance update
    if (tx.account) {
      const account = await Account.findById(tx.account);
      if (account) {
        if (tx.type === 'income') account.balance -= tx.amount;
        if (tx.type === 'expense') account.balance += tx.amount;
        await account.save();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get AI-powered insights
 */
exports.getInsights = async (req, res) => {
  try {
    const { language = 'bn' } = req.query;
    const insights = await aiInsightsService.getInsights(req.user.id, language);
    res.json({ insights });
  } catch (err) {
    console.error('Error getting insights:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Predict category based on note and amount
 */
exports.predictCategory = async (req, res) => {
  try {
    const { note, amount, type = 'expense' } = req.body;
    
    if (!note || note.trim().length < 2) {
      return res.json({ prediction: null });
    }

    const prediction = await aiInsightsService.predictCategory(
      req.user.id,
      note.trim(),
      amount,
      type
    );

    res.json({ prediction });
  } catch (err) {
    console.error('Error predicting category:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

