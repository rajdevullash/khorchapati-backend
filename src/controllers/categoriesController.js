const Category = require('../models/Category');
const { categorySchema } = require('../validators/category');

exports.list = async (req, res) => {
  try {
    const categories = await Category.find({ 
      $or: [{ user: req.user.id }, { isDefault: true }] 
    }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const parsed = categorySchema.parse(req.body);
    const category = await Category.create({ ...parsed, user: req.user.id });
    res.json(category);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = categorySchema.parse(req.body);
    const category = await Category.findOneAndUpdate(
      { _id: id, user: req.user.id },
      parsed,
      { new: true }
    );
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json(category);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOneAndDelete({ _id: id, user: req.user.id });
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
