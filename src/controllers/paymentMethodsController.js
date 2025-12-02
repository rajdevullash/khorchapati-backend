const PaymentMethod = require('../models/PaymentMethod');
const { paymentMethodSchema } = require('../validators/paymentMethod');

exports.list = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ 
      $or: [{ user: req.user.id }, { isDefault: true }] 
    }).sort({ name: 1 });
    res.json(methods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const parsed = paymentMethodSchema.parse(req.body);
    const method = await PaymentMethod.create({ ...parsed, user: req.user.id });
    res.json(method);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = paymentMethodSchema.parse(req.body);
    const method = await PaymentMethod.findOneAndUpdate(
      { _id: id, user: req.user.id },
      parsed,
      { new: true }
    );
    if (!method) return res.status(404).json({ error: 'Not found' });
    res.json(method);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findOneAndDelete({ _id: id, user: req.user.id });
    if (!method) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
