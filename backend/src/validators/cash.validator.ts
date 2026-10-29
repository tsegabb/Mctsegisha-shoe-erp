import { z } from 'zod';

export const cashDropSchema = z.object({
  body: z.object({
    amount: z.number({ message: 'Amount is required' }).positive({ message: 'Amount must be greater than 0' }),
    note: z.string().optional(),
    shopId: z.string().optional(),
    userName: z.string().optional()
  })
});

export const openingFloatSchema = z.object({
  body: z.object({
    amount: z.number({ message: 'Amount is required' }).nonnegative({ message: 'Amount cannot be negative' }),
    note: z.string().optional(),
    shopId: z.string().optional(),
    userName: z.string().optional()
  })
});

export const cashActivitySchema = z.object({
  body: z.object({
    type: z.string({ message: 'Activity type is required' }).min(1),
    amount: z.number({ message: 'Amount is required' }),
    method: z.string().optional().default('Cash'),
    note: z.string().optional(),
    shopId: z.string().optional(),
    userName: z.string().optional()
  })
});
