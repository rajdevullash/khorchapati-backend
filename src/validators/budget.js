const { z } = require('zod');

const budgetSchema = z.object({
  category: z.string().optional(), // category ID or null for overall
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['monthly', 'weekly', 'yearly']).optional(),
  startDate: z.preprocess((d) => (d ? new Date(d) : undefined), z.date().optional()),
  endDate: z.preprocess((d) => (d ? new Date(d) : undefined), z.date().optional()),
  alertThreshold: z.number().min(0).max(100).optional()
});

module.exports = { budgetSchema };
