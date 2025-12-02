const Transaction = require('../models/Transaction');

// Helper to build date range
function monthRange(year, month) { // month 1-12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

exports.getReport = async (req, res) => {
  try {
    const { period = 'monthly', year, month, startDate, endDate } = req.query;
    const userId = req.user.id;

    let rangeStart, rangeEnd;
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : (now.getMonth() + 1);

    if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
    } else if (period === 'daily' || period === 'weekly') {
      const { start, end } = monthRange(y, m);
      rangeStart = start;
      rangeEnd = end;
    } else if (period === 'monthly') {
      // whole year
      rangeStart = new Date(y, 0, 1);
      rangeEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    } else if (period === 'yearly') {
      // last 5 years including current
      rangeStart = new Date(y - 4, 0, 1);
      rangeEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const matchQuery = {
      user: userId,
      date: { $gte: rangeStart, $lte: rangeEnd }
    };

    const transactions = await Transaction.find(matchQuery).populate('category');

    // Totals
    let incomeTotal = 0, expenseTotal = 0;
    transactions.forEach(t => {
      if (t.type === 'income') incomeTotal += t.amount;
      if (t.type === 'expense') expenseTotal += t.amount;
    });

    // Build data array based on period
    let data = [];
    if (period === 'daily') {
      const daysInMonth = new Date(y, m, 0).getDate();
      const map = Array.from({ length: daysInMonth }, (_, i) => ({ label: (i + 1).toString(), income: 0, expense: 0 }));
      transactions.forEach(t => {
        const d = t.date.getDate();
        const idx = d - 1;
        if (t.type === 'income') map[idx].income += t.amount; else if (t.type === 'expense') map[idx].expense += t.amount;
      });
      data = map;
    } else if (period === 'weekly') {
      // Weeks 1-5 (some months spill into 5th week)
      const weeks = [1,2,3,4,5].map(w => ({ label: `${w}য়`, income: 0, expense: 0 }));
      transactions.forEach(t => {
        const day = t.date.getDate();
        let weekIndex = Math.floor((day - 1) / 7); // 0-based
        if (weekIndex > 4) weekIndex = 4;
        if (t.type === 'income') weeks[weekIndex].income += t.amount; else if (t.type === 'expense') weeks[weekIndex].expense += t.amount;
      });
      // Remove trailing empty week if no data
      while (weeks.length && weeks[weeks.length - 1].income === 0 && weeks[weeks.length - 1].expense === 0 && weeks.length > 4) {
        weeks.pop();
      }
      data = weeks;
    } else if (period === 'monthly') {
      const months = Array.from({ length: 12 }, (_, i) => ({ label: (i + 1).toString(), income: 0, expense: 0 }));
      transactions.forEach(t => {
        const mi = t.date.getMonth();
        if (t.type === 'income') months[mi].income += t.amount; else if (t.type === 'expense') months[mi].expense += t.amount;
      });
      data = months;
    } else if (period === 'yearly') {
      const startYear = y - 4;
      const years = Array.from({ length: 5 }, (_, i) => ({ label: (startYear + i).toString(), income: 0, expense: 0 }));
      transactions.forEach(t => {
        const ty = t.date.getFullYear();
        if (ty < startYear || ty > y) return;
        const idx = ty - startYear;
        if (t.type === 'income') years[idx].income += t.amount; else if (t.type === 'expense') years[idx].expense += t.amount;
      });
      data = years;
    }

    // Expense category breakdown
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    let breakdown = [];
    if (totalExpense > 0) {
      const map = {};
      expenseTransactions.forEach(t => {
        const key = t.category ? t.category._id.toString() : 'other';
        if (!map[key]) map[key] = { categoryId: key, name: t.category?.name || 'অন্যান্য', amount: 0 };
        map[key].amount += t.amount;
      });
      breakdown = Object.values(map)
        .map(b => ({ ...b, percentage: (b.amount / totalExpense) * 100 }))
        .sort((a,b) => b.amount - a.amount);
    }

    res.json({
      period,
      range: { start: rangeStart, end: rangeEnd },
      totals: { income: incomeTotal, expense: expenseTotal, savings: incomeTotal - expenseTotal },
      data,
      breakdown
    });
  } catch (err) {
    console.error('Report error', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
