const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { accountSchema, transferSchema } = require('../validators/account');

exports.list = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.id }).sort({ name: 1 });
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const parsed = accountSchema.parse(req.body);
    const account = await Account.create({ ...parsed, user: req.user.id });
    res.json(account);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = accountSchema.parse(req.body);
    const account = await Account.findOneAndUpdate(
      { _id: id, user: req.user.id },
      parsed,
      { new: true }
    );
    if (!account) return res.status(404).json({ error: 'Not found' });
    res.json(account);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findOneAndDelete({ _id: id, user: req.user.id });
    if (!account) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Transfer between accounts
exports.transfer = async (req, res) => {
  try {
    const parsed = transferSchema.parse(req.body);
    const { fromAccountId, toAccountId, amount, note } = parsed;

    const fromAccount = await Account.findOne({ _id: fromAccountId, user: req.user.id });
    const toAccount = await Account.findOne({ _id: toAccountId, user: req.user.id });

    if (!fromAccount || !toAccount) return res.status(404).json({ error: 'Account not found' });
    if (fromAccount.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    fromAccount.balance -= amount;
    toAccount.balance += amount;

    await fromAccount.save();
    await toAccount.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'transfer',
      amount,
      account: fromAccountId,
      toAccount: toAccountId,
      note,
      date: new Date()
    });

    res.json({ transaction, fromAccount, toAccount });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
