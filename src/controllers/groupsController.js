const FamilyGroup = require('../models/FamilyGroup');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const crypto = require('crypto');
const notificationService = require('../services/notificationService');

exports.create = async (req, res) => {
  try {
    const { name, description, category, avatar, currency } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const inviteCode = crypto.randomBytes(4).toString('hex');
    const group = await FamilyGroup.create({ 
      name, 
      description: description || '',
      category: category || 'other',
      avatar: avatar || '',
      currency: currency || 'BDT',
      owner: req.user.id, 
      members: [], // Don't add owner to members array - owner is separate
      inviteCode 
    });
    const populated = await FamilyGroup.findById(group._id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const groups = await FamilyGroup.find({ $or: [{ owner: req.user.id }, { members: req.user.id }] })
      .populate('owner', 'name email')
      .populate('members', 'name email');
    res.json(groups);
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.get = async (req, res) => {
  try {
    const group = await FamilyGroup.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    if (!group) return res.status(404).json({ error: 'Not found' });
    if (!group.owner._id.equals(req.user.id) && !group.members.some(m => m._id.equals(req.user.id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(group);
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.joinByCode = async (req, res) => {
  try {
    const { code } = req.body;
    const group = await FamilyGroup.findOne({ inviteCode: code });
    if (!group) return res.status(404).json({ error: 'Invalid code' });
    if (!group.members.find(m => m.toString() === req.user.id) && group.owner.toString() !== req.user.id) {
      group.members.push(req.user.id);
      await group.save();
    }
    const populated = await FamilyGroup.findById(group._id).populate('owner', 'name email').populate('members', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addMemberByEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    if (group.owner.toString() !== req.user.id) return res.status(403).json({ error: 'Only owner can add members' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!group.members.find(m => m.toString() === user._id.toString())) {
      group.members.push(user._id);
      await group.save();
      
      // Send notification to new member and existing members
      notificationService.notifyNewMember(id, user.name).catch(console.error);
    }
    const populated = await FamilyGroup.findById(id).populate('owner', 'name email').populate('members', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { id } = req.params; // group id
    const { userId } = req.body;
    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    if (group.owner.toString() !== req.user.id) return res.status(403).json({ error: 'Only owner can remove members' });
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();
    const populated = await FamilyGroup.findById(id).populate('owner', 'name email').populate('members', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getBalances = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    if (group.owner.toString() !== req.user.id && !group.members.find(m => m.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const txs = await Transaction.find({ familyGroup: id, type: 'expense' }).populate('user', 'name email').populate('splitWith.user', 'name email');

    // Ledger[userId] = net amount owed (+ you should receive, - you owe)
    const ledger = {};

    txs.forEach(tx => {
      const payerId = tx.user._id.toString();
      ledger[payerId] = ledger[payerId] || 0;
      (tx.splitWith || []).forEach(share => {
        const uid = share.user._id ? share.user._id.toString() : share.user.toString();
        if (uid === payerId) return; // skip self
        ledger[payerId] += share.amount;
        ledger[uid] = (ledger[uid] || 0) - share.amount;
      });
    });

    res.json({ ledger });
  } catch (err) {
    console.error('Get balances error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update group details
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, avatar, currency, settings } = req.body;
    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    if (group.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can update group' });
    }
    
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (category) group.category = category;
    if (avatar !== undefined) group.avatar = avatar;
    if (currency) group.currency = currency;
    if (settings) group.settings = { ...group.settings, ...settings };
    
    await group.save();
    const populated = await FamilyGroup.findById(id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get group transactions
exports.getTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    if (group.owner.toString() !== req.user.id && !group.members.find(m => m.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const transactions = await Transaction.find({ familyGroup: id })
      .populate('user', 'name email')
      .populate('paidBy', 'name email')
      .populate('splitWith.user', 'name email')
      .populate('category', 'name icon color')
      .sort({ date: -1 });

    res.json(transactions);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Settlement - Create a settlement transaction
exports.settle = async (req, res) => {
  try {
    const { id } = req.params; // group id
    const { toUserId, amount } = req.body;
    
    if (!toUserId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid settlement data' });
    }

    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    
    // Check if user is member
    const isMember = group.owner.toString() === req.user.id || 
                     group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    // Create a settlement transaction
    const settlement = await Transaction.create({
      user: req.user.id,
      type: 'expense',
      amount: amount,
      familyGroup: id,
      isSettlement: true,
      settledBy: toUserId,
      paidBy: req.user.id,
      note: `Settlement payment`,
      date: new Date(),
      splitWith: [
        { user: req.user.id, amount: -amount }, // negative because paying
        { user: toUserId, amount: amount }      // positive because receiving
      ]
    });

    // Update group stats
    group.stats.lastActivity = new Date();
    await group.save();

    const populated = await Transaction.findById(settlement._id)
      .populate('user', 'name email')
      .populate('paidBy', 'name email')
      .populate('settledBy', 'name email')
      .populate('splitWith.user', 'name email');

    // Send notification
    notificationService.notifySettlement(req.user.id, toUserId, amount, id).catch(console.error);

    res.json(populated);
  } catch (err) {
    console.error('Settlement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get settlement suggestions (optimize who owes whom)
exports.getSettlementSuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await FamilyGroup.findById(id);
    if (!group) return res.status(404).json({ error: 'Not found' });
    
    const isMember = group.owner.toString() === req.user.id || 
                     group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    const txs = await Transaction.find({ familyGroup: id, type: 'expense' })
      .populate('splitWith.user', 'name email');

    // Calculate balances
    const balances = {};
    txs.forEach(tx => {
      const payerId = tx.user.toString();
      balances[payerId] = balances[payerId] || 0;
      (tx.splitWith || []).forEach(share => {
        const uid = share.user._id ? share.user._id.toString() : share.user.toString();
        if (uid === payerId) return;
        balances[payerId] += share.amount;
        balances[uid] = (balances[uid] || 0) - share.amount;
      });
    });

    // Optimize settlements using greedy algorithm
    const debtors = [];
    const creditors = [];
    
    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance < -0.01) debtors.push({ userId, amount: -balance });
      if (balance > 0.01) creditors.push({ userId, amount: balance });
    });

    const suggestions = [];
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);
      
      suggestions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount * 100) / 100
      });
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    // Populate user details
    const User = require('../models/User');
    const populated = await Promise.all(
      suggestions.map(async (s) => {
        const [from, to] = await Promise.all([
          User.findById(s.from, 'name email'),
          User.findById(s.to, 'name email')
        ]);
        return { ...s, fromUser: from, toUser: to };
      })
    );

    res.json({ suggestions: populated });
  } catch (err) {
    console.error('Get settlement suggestions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
