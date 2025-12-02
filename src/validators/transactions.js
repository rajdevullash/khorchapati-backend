const { z } = require('zod');

const splitShareSchema = z.object({
  user: z.string(),
  amount: z.number().nonnegative()
});

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional(),
  category: z.string().optional(),
  account: z.string().optional(),
  toAccount: z.string().optional(),
  paymentMethod: z.string().optional(),
  note: z.string().optional(),
  date: z.preprocess((d) => (d ? new Date(d) : new Date()), z.date()),
  receiptUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  familyGroup: z.string().optional(),
  splitWith: z.array(splitShareSchema).optional()
}).refine(
  (data) => {
    if (data.splitWith && data.splitWith.length > 0) {
      // only for expense
      if (data.type !== 'expense') return false;
      const totalShare = data.splitWith.reduce((s, sh) => s + sh.amount, 0);
      // allow small floating tolerance
      return Math.abs(totalShare - data.amount) < 0.01;
    }
    return true;
  },
  { message: 'Split shares must sum to total amount and only for expense type' }
);

module.exports = { transactionSchema };
