const { z } = require('zod');

const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'mobile_banking', 'card', 'bank']).optional(),
  icon: z.string().optional(),
  color: z.string().optional()
});

module.exports = { paymentMethodSchema };
