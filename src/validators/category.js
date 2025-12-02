const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense', 'both']).optional(),
  icon: z.string().optional(),
  color: z.string().optional()
});

module.exports = { categorySchema };
