const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Account = require('../models/Account');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

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

/**
 * Export transactions as PDF
 */
exports.exportPDF = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const query = { user: req.user.id };

    if (type) query.type = type;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const transactions = await Transaction.find(query)
      .populate('category account paymentMethod')
      .sort({ date: -1 });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Transaction Statement', { align: 'center' });
    if (startDate && endDate) {
      doc.fontSize(12).text(
        `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        { align: 'center' }
      );
    }
    doc.moveDown();

    // Summary
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Income: ৳${income.toLocaleString()}`);
    doc.text(`Total Expense: ৳${expense.toLocaleString()}`);
    doc.text(`Balance: ৳${balance.toLocaleString()}`);
    doc.moveDown();

    // Transactions table
    doc.fontSize(14).text('Transactions', { underline: true });
    doc.moveDown(0.5);

    let y = doc.y;
    doc.fontSize(10);
    
    // Table header
    doc.text('Date', 50, y);
    doc.text('Type', 120, y);
    doc.text('Category', 180, y);
    doc.text('Amount', 280, y);
    doc.text('Note', 350, y);
    y += 20;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Table rows
    transactions.forEach((tx) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const date = new Date(tx.date).toLocaleDateString();
      const type = tx.type === 'income' ? 'Income' : 'Expense';
      const category = tx.category?.name || 'N/A';
      const amount = `৳${tx.amount.toLocaleString()}`;
      const note = tx.note || '-';

      doc.text(date, 50, y);
      doc.text(type, 120, y);
      doc.text(category, 180, y);
      doc.text(amount, 280, y);
      doc.text(note.substring(0, 30), 350, y);
      y += 15;
    });

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Export transactions as Excel
 */
exports.exportExcel = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const query = { user: req.user.id };

    if (type) query.type = type;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const transactions = await Transaction.find(query)
      .populate('category account paymentMethod')
      .sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Header row
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Account', key: 'account', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Note', key: 'note', width: 40 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    transactions.forEach(tx => {
      worksheet.addRow({
        date: new Date(tx.date).toLocaleDateString(),
        type: tx.type === 'income' ? 'Income' : 'Expense',
        category: tx.category?.name || 'N/A',
        account: tx.account?.name || 'N/A',
        paymentMethod: tx.paymentMethod?.name || 'N/A',
        amount: tx.amount,
        note: tx.note || ''
      });
    });

    // Summary row
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    worksheet.addRow({});
    const summaryRow1 = worksheet.addRow({ date: 'Total Income', amount: income });
    const summaryRow2 = worksheet.addRow({ date: 'Total Expense', amount: expense });
    const summaryRow3 = worksheet.addRow({ date: 'Balance', amount: balance });
    summaryRow3.getCell(1).font = { bold: true };
    summaryRow3.getCell(2).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Export monthly statement as PDF
 */
exports.exportMonthlyStatement = async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const transactions = await Transaction.find({
      user: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    })
      .populate('category account paymentMethod')
      .sort({ date: -1 });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_statement_${y}_${m}.pdf`);
    doc.pipe(res);

    // Header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    doc.fontSize(20).text(`Monthly Statement - ${monthNames[m - 1]} ${y}`, { align: 'center' });
    doc.moveDown();

    // Summary
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Income: ৳${income.toLocaleString()}`);
    doc.text(`Total Expense: ৳${expense.toLocaleString()}`);
    doc.text(`Balance: ৳${balance.toLocaleString()}`);
    doc.text(`Total Transactions: ${transactions.length}`);
    doc.moveDown();

    // Category breakdown
    const categoryBreakdown = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const catName = t.category?.name || 'Other';
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
    });

    if (Object.keys(categoryBreakdown).length > 0) {
      doc.fontSize(14).text('Category Breakdown (Expenses)', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, amount]) => {
          doc.text(`${cat}: ৳${amount.toLocaleString()}`);
        });
      doc.moveDown();
    }

    // Transactions
    doc.fontSize(14).text('All Transactions', { underline: true });
    doc.moveDown(0.5);

    let yPos = doc.y;
    doc.fontSize(10);
    
    // Table header
    doc.text('Date', 50, yPos);
    doc.text('Type', 120, yPos);
    doc.text('Category', 180, yPos);
    doc.text('Amount', 280, yPos);
    doc.text('Note', 350, yPos);
    yPos += 20;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;

    transactions.forEach((tx) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      const date = new Date(tx.date).toLocaleDateString();
      const type = tx.type === 'income' ? 'Income' : 'Expense';
      const category = tx.category?.name || 'N/A';
      const amount = `৳${tx.amount.toLocaleString()}`;
      const note = tx.note || '-';

      doc.text(date, 50, yPos);
      doc.text(type, 120, yPos);
      doc.text(category, 180, yPos);
      doc.text(amount, 280, yPos);
      doc.text(note.substring(0, 30), 350, yPos);
      yPos += 15;
    });

    doc.end();
  } catch (err) {
    console.error('Monthly statement export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Export category-wise report as PDF
 */
exports.exportCategoryReport = async (req, res) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;
    const query = { user: req.user.id, type };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const transactions = await Transaction.find(query)
      .populate('category')
      .sort({ date: -1 });

    // Category breakdown
    const categoryMap = {};
    transactions.forEach(tx => {
      const catName = tx.category?.name || 'Other';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { amount: 0, count: 0, transactions: [] };
      }
      categoryMap[catName].amount += tx.amount;
      categoryMap[catName].count += 1;
      categoryMap[catName].transactions.push(tx);
    });

    const categories = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const total = categories.reduce((sum, cat) => sum + cat.amount, 0);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=category_report_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text(`${type === 'expense' ? 'Expense' : 'Income'} Category Report`, { align: 'center' });
    if (startDate && endDate) {
      doc.fontSize(12).text(
        `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        { align: 'center' }
      );
    }
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total ${type === 'expense' ? 'Expense' : 'Income'}: ৳${total.toLocaleString()}`);
    doc.text(`Number of Categories: ${categories.length}`);
    doc.text(`Total Transactions: ${transactions.length}`);
    doc.moveDown();

    // Category breakdown
    doc.fontSize(14).text('Category Breakdown', { underline: true });
    doc.moveDown(0.5);

    let yPos = doc.y;
    doc.fontSize(10);
    
    // Table header
    doc.text('Category', 50, yPos);
    doc.text('Amount', 200, yPos);
    doc.text('Percentage', 300, yPos);
    doc.text('Count', 400, yPos);
    yPos += 20;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;

    categories.forEach((cat) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      const percentage = ((cat.amount / total) * 100).toFixed(1);
      doc.text(cat.name, 50, yPos);
      doc.text(`৳${cat.amount.toLocaleString()}`, 200, yPos);
      doc.text(`${percentage}%`, 300, yPos);
      doc.text(cat.count.toString(), 400, yPos);
      yPos += 15;
    });

    doc.end();
  } catch (err) {
    console.error('Category report export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
