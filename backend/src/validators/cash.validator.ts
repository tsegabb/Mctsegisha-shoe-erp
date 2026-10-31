import { z } from 'zod';
import { optionalFilterUuid, paymentMethodField, positiveMoney, money, snakeEnum, uuid } from './common.validator.ts';
import { CASH_ACTIVITY_TYPES } from '../constants/domain.ts';

const note = z.string().trim().max(500).optional();

export const cashSummarySchema = z.object({ query: z.object({ shopId: optionalFilterUuid, warehouseId: optionalFilterUuid }) });

export const cashDropSchema = z.object({ body: z.object({ amount: positiveMoney, note, shopId: uuid.optional() }) });
export const openingFloatSchema = z.object({ body: z.object({ amount: money, note, shopId: uuid.optional() }) });

export const cashActivitySchema = z.object({
  body: z.object({
    type: snakeEnum(CASH_ACTIVITY_TYPES),
    amount: z.number().finite().min(-999_999_999.99).max(999_999_999.99),
    method: paymentMethodField.default('cash'),
    note,
    shopId: uuid.optional(),
  }).refine((b) => b.type === 'adjustment' || b.amount > 0, { message: 'Amount must be positive (direction is implied by type)', path: ['amount'] }),
});

export type CashActivityInput = z.infer<typeof cashActivitySchema>['body'];
