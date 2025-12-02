const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

exports.summary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const transactions = await Transaction.find(query);

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    res.json({ income, expense, balance, transactionCount: transactions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.categoryBreakdown = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const query = { user: req.user.id };

    if (type) query.type = type;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const breakdown = await Transaction.aggregate([
      { $match: query },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.json(breakdown);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.monthlyOverview = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const data = await Transaction.aggregate([
      {
        $match: {
          user: req.user.id,
          date: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Format into monthly array
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0
    }));

    data.forEach(item => {
      const monthIndex = item._id.month - 1;
      if (item._id.type === 'income') months[monthIndex].income = item.total;
      if (item._id.type === 'expense') months[monthIndex].expense = item.total;
    });

    res.json(months);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.accountsOverview = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.id });
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    res.json({ accounts, totalBalance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
