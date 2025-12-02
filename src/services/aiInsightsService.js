const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

/**
 * AI Insights Service
 * Analyzes transaction patterns and generates intelligent insights
 */

/**
 * Get AI-powered insights for user's spending patterns
 */
exports.getInsights = async (userId, language = 'bn') => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Get current month and last month transactions
    const [currentMonthTx, lastMonthTx] = await Promise.all([
      Transaction.find({
        user: userId,
        date: { $gte: currentMonthStart },
        type: 'expense'
      }).populate('category'),
      Transaction.find({
        user: userId,
        date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        type: 'expense'
      }).populate('category')
    ]);

    const insights = [];

    // Category-wise comparison
    const categoryComparison = await compareCategoryExpenses(
      currentMonthTx,
      lastMonthTx,
      language
    );
    insights.push(...categoryComparison);

    // Total spending comparison
    const totalComparison = compareTotalSpending(
      currentMonthTx,
      lastMonthTx,
      language
    );
    if (totalComparison) insights.push(totalComparison);

    // Unusual spending detection
    const unusualSpending = await detectUnusualSpending(
      userId,
      currentMonthTx,
      language
    );
    insights.push(...unusualSpending);

    // Budget alerts
    const budgetAlerts = await checkBudgetAlerts(userId, language);
    insights.push(...budgetAlerts);

    // Sort by priority (type: 'warning' > 'alert' > 'info')
    const priorityMap = { warning: 3, alert: 2, info: 1, success: 0 };
    insights.sort((a, b) => priorityMap[b.type] - priorityMap[a.type]);

    // Return top 5 insights
    return insights.slice(0, 5);
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
};

/**
 * Compare category-wise expenses between current and last month
 */
async function compareCategoryExpenses(currentMonthTx, lastMonthTx, language) {
  const insights = [];

  // Group by category
  const currentByCategory = groupByCategory(currentMonthTx);
  const lastByCategory = groupByCategory(lastMonthTx);

  for (const [categoryId, currentAmount] of Object.entries(currentByCategory)) {
    const lastAmount = lastByCategory[categoryId] || 0;
    
    if (lastAmount === 0 && currentAmount > 0) {
      // New spending category
      const category = currentMonthTx.find(tx => tx.category?._id.toString() === categoryId)?.category;
      if (category) {
        insights.push({
          type: 'info',
          category: categoryId,
          message: language === 'bn' 
            ? `${category.name} খাতে নতুন খরচ শুরু হয়েছে`
            : `New spending started in ${category.name}`,
          amount: currentAmount,
          icon: 'alert-circle-outline'
        });
      }
    } else if (lastAmount > 0) {
      const percentChange = ((currentAmount - lastAmount) / lastAmount) * 100;
      
      if (Math.abs(percentChange) >= 15) {
        const category = currentMonthTx.find(tx => tx.category?._id.toString() === categoryId)?.category;
        if (category) {
          const isIncrease = percentChange > 0;
          insights.push({
            type: isIncrease ? 'warning' : 'success',
            category: categoryId,
            message: language === 'bn'
              ? `${category.name} খরচ গত মাসের তুলনায় ${Math.abs(percentChange).toFixed(0)}% ${isIncrease ? 'বেড়েছে' : 'কমেছে'}`
              : `${category.name} expense ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(0)}% from last month`,
            percentChange: percentChange,
            currentAmount,
            lastAmount,
            icon: isIncrease ? 'trending-up' : 'trending-down'
          });
        }
      }
    }
  }

  return insights;
}

/**
 * Compare total spending
 */
function compareTotalSpending(currentMonthTx, lastMonthTx, language) {
  const currentTotal = currentMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
  const lastTotal = lastMonthTx.reduce((sum, tx) => sum + tx.amount, 0);

  if (lastTotal === 0) return null;

  const percentChange = ((currentTotal - lastTotal) / lastTotal) * 100;

  if (Math.abs(percentChange) >= 10) {
    const isIncrease = percentChange > 0;
    return {
      type: isIncrease ? 'alert' : 'success',
      message: language === 'bn'
        ? `মোট খরচ গত মাসের তুলনায় ${Math.abs(percentChange).toFixed(0)}% ${isIncrease ? 'বেড়েছে' : 'কমেছে'}`
        : `Total spending ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(0)}% from last month`,
      percentChange,
      currentAmount: currentTotal,
      lastAmount: lastTotal,
      icon: isIncrease ? 'arrow-up-circle' : 'arrow-down-circle'
    };
  }

  return null;
}

/**
 * Detect unusual spending patterns
 */
async function detectUnusualSpending(userId, currentMonthTx, language) {
  const insights = [];

  // Get last 3 months average for comparison
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const historicalTx = await Transaction.find({
    user: userId,
    date: { $gte: threeMonthsAgo },
    type: 'expense'
  }).populate('category');

  // Group by category for historical average
  const categoryAverages = {};
  const historicalByCategory = groupByCategory(historicalTx);

  for (const [categoryId, totalAmount] of Object.entries(historicalByCategory)) {
    categoryAverages[categoryId] = totalAmount / 3; // Average over 3 months
  }

  // Compare current month with averages
  const currentByCategory = groupByCategory(currentMonthTx);

  for (const [categoryId, currentAmount] of Object.entries(currentByCategory)) {
    const avgAmount = categoryAverages[categoryId] || 0;
    
    if (avgAmount > 0 && currentAmount > avgAmount * 1.5) {
      // 50% more than average
      const category = currentMonthTx.find(tx => tx.category?._id.toString() === categoryId)?.category;
      if (category) {
        insights.push({
          type: 'warning',
          category: categoryId,
          message: language === 'bn'
            ? `${category.name} খরচ স্বাভাবিকের চেয়ে বেশি`
            : `${category.name} spending is higher than usual`,
          currentAmount,
          averageAmount: avgAmount,
          icon: 'warning-outline'
        });
      }
    }
  }

  return insights;
}

/**
 * Check budget alerts
 */
async function checkBudgetAlerts(userId, language) {
  const Budget = require('../models/Budget');
  const insights = [];

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get active budgets
  const budgets = await Budget.find({
    user: userId,
    period: 'monthly',
    isActive: true
  }).populate('category');

  for (const budget of budgets) {
    const query = {
      user: userId,
      date: { $gte: currentMonthStart },
      type: 'expense'
    };

    if (budget.category) {
      query.category = budget.category._id;
    }

    const transactions = await Transaction.find(query);
    const spent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const percentage = (spent / budget.amount) * 100;

    if (percentage >= budget.alertThreshold) {
      const categoryName = budget.category?.name || (language === 'bn' ? 'সামগ্রিক' : 'Overall');
      
      insights.push({
        type: percentage >= 100 ? 'alert' : 'warning',
        category: budget.category?._id,
        message: language === 'bn'
          ? `${categoryName} বাজেটের ${percentage.toFixed(0)}% ব্যয় হয়েছে`
          : `${percentage.toFixed(0)}% of ${categoryName} budget spent`,
        spent,
        budget: budget.amount,
        percentage,
        icon: percentage >= 100 ? 'close-circle' : 'alert-circle'
      });
    }
  }

  return insights;
}

/**
 * Helper: Group transactions by category
 */
function groupByCategory(transactions) {
  return transactions.reduce((acc, tx) => {
    if (tx.category) {
      const catId = tx.category._id.toString();
      acc[catId] = (acc[catId] || 0) + tx.amount;
    }
    return acc;
  }, {});
}

/**
 * Predict category based on transaction note and amount
 * Uses simple keyword matching and historical patterns
 */
exports.predictCategory = async (userId, note, amount, type) => {
  try {
    // Get user's historical transactions
    const historicalTx = await Transaction.find({
      user: userId,
      type,
      note: { $exists: true, $ne: '' }
    })
      .populate('category')
      .limit(500)
      .sort({ date: -1 });

    if (historicalTx.length === 0) {
      return null;
    }

    const noteLower = note.toLowerCase();
    const keywords = noteLower.split(/\s+/).filter(w => w.length > 2);

    // Score each category based on keyword matches
    const categoryScores = {};

    for (const tx of historicalTx) {
      if (!tx.category || !tx.note) continue;

      const txNoteLower = tx.note.toLowerCase();
      const categoryId = tx.category._id.toString();

      if (!categoryScores[categoryId]) {
        categoryScores[categoryId] = {
          category: tx.category,
          score: 0,
          count: 0,
          avgAmount: 0,
          totalAmount: 0
        };
      }

      // Exact match bonus
      if (txNoteLower === noteLower) {
        categoryScores[categoryId].score += 10;
      }

      // Keyword matching
      keywords.forEach(keyword => {
        if (txNoteLower.includes(keyword)) {
          categoryScores[categoryId].score += 2;
        }
      });

      // Amount similarity (within 20%)
      if (amount && Math.abs(tx.amount - amount) / amount < 0.2) {
        categoryScores[categoryId].score += 1;
      }

      categoryScores[categoryId].count++;
      categoryScores[categoryId].totalAmount += tx.amount;
    }

    // Calculate average amounts and frequency bonus
    for (const catId in categoryScores) {
      const data = categoryScores[catId];
      data.avgAmount = data.totalAmount / data.count;
      
      // Frequency bonus (more frequent = higher score)
      data.score += Math.log(data.count + 1);
    }

    // Find highest scoring category
    let bestMatch = null;
    let highestScore = 0;

    for (const catId in categoryScores) {
      if (categoryScores[catId].score > highestScore) {
        highestScore = categoryScores[catId].score;
        bestMatch = categoryScores[catId].category;
      }
    }

    // Only return if score is significant
    if (highestScore > 2) {
      return {
        category: bestMatch,
        confidence: Math.min(highestScore / 10, 1) // 0-1 scale
      };
    }

    return null;
  } catch (error) {
    console.error('Error predicting category:', error);
    return null;
  }
};
