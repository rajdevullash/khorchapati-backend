const { z } = require('zod');

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank', 'mobile_banking', 'card', 'other']).optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional()
});

const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'From account is required'),
  toAccountId: z.string().min(1, 'To account is required'),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().optional()
});

module.exports = { accountSchema, transferSchema };
