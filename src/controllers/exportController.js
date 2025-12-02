const Transaction = require('../models/Transaction');
const { Parser } = require('json2csv');

exports.exportCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const transactions = await Transaction.find(query)
      .populate('category account paymentMethod')
      .sort({ date: -1 });

    const fields = ['date', 'type', 'amount', 'category.name', 'account.name', 'paymentMethod.name', 'note'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(transactions);

    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.exportJSON = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const transactions = await Transaction.find(query)
      .populate('category account paymentMethod')
      .sort({ date: -1 });

    res.header('Content-Type', 'application/json');
    res.attachment('transactions.json');
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.importTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions must be an array' });
    }

    const imported = await Promise.all(
      transactions.map(async (tx) => {
        return await Transaction.create({ ...tx, user: req.user.id });
      })
    );

    res.json({ imported: imported.length, transactions: imported });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
