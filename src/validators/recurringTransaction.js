const { z } = require('zod');

const recurringTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().optional(),
  account: z.string().optional(),
  paymentMethod: z.string().optional(),
  note: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  startDate: z.preprocess((d) => (d ? new Date(d) : new Date()), z.date()),
  endDate: z.preprocess((d) => (d ? new Date(d) : undefined), z.date().optional()),
  subscriptionType: z.enum(['bill', 'emi', 'rent', 'subscription', 'other']).optional(),
  reminderDays: z.array(z.number()).optional(),
  autoPay: z.boolean().optional()
});

module.exports = { recurringTransactionSchema };
