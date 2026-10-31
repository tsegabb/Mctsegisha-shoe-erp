/** Single source of truth for every enum the database CHECK constraints enforce (all lowercase_snake_case). */

export const ROLES = ['owner', 'admin', 'manager', 'cashier', 'staff', 'warehouse'] as const;
export type Role = (typeof ROLES)[number];

export const PRIVILEGED_ROLES: Role[] = ['owner', 'admin']; // unrestricted by branch, pass every role check
export const MANAGEMENT_ROLES: Role[] = ['owner', 'admin', 'manager'];
export const POS_ROLES: Role[] = ['owner', 'admin', 'manager', 'cashier', 'staff'];
export const STOCK_ROLES: Role[] = ['owner', 'admin', 'manager', 'warehouse'];

export const GENDERS = ['men', 'women', 'unisex', 'boys', 'girls', 'kids'] as const;
export const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'other', 'telebirr', 'cbe_birr'] as const;
export const SALE_STATUSES = ['completed', 'partially_returned', 'returned', 'refunded', 'cancelled', 'voided'] as const;
export const MOVEMENT_TYPES = ['in', 'out', 'transfer', 'adjustment', 'sale', 'return', 'purchase', 'damage'] as const;
export const ORDER_STATUSES = [
  'pending', 'approved', 'ordered', 'shipped', 'partially_received', 'received', 'completed', 'cancelled',
] as const;
export const CASH_ACTIVITY_TYPES = [
  'income', 'expense', 'deposit', 'withdrawal', 'sale', 'refund', 'opening', 'closing', 'adjustment',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type CashActivityType = (typeof CASH_ACTIVITY_TYPES)[number];

/** Allowed purchase-order status transitions. Terminal states have no exits. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved', 'ordered', 'shipped', 'received', 'cancelled'],
  approved: ['ordered', 'shipped', 'received', 'cancelled'],
  ordered: ['shipped', 'partially_received', 'received', 'cancelled'],
  shipped: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received'],
  received: ['completed'],
  completed: [],
  cancelled: [],
};

/** Direction of stock change for each movement type. `adjustment` is signed by the caller. */
export const MOVEMENT_DIRECTION: Record<MovementType, 'in' | 'out' | 'transfer' | 'signed'> = {
  in: 'in', purchase: 'in', return: 'in',
  out: 'out', sale: 'out', damage: 'out',
  transfer: 'transfer',
  adjustment: 'signed',
};

/** Legacy / UI spellings the frontend still sends, mapped to the DB vocabulary. */
export const ROLE_ALIASES: Record<string, Role> = {
  sales_staff: 'cashier',
  warehouse_staff: 'warehouse',
};
export const MOVEMENT_ALIASES: Record<string, MovementType> = { incoming: 'in', outgoing: 'out' };
export const PAYMENT_ALIASES: Record<string, PaymentMethod> = {
  telebirr: 'mobile_money', cbe_birr: 'mobile_money', cbebirr: 'mobile_money', mobile: 'mobile_money',
  mpesa: 'mobile_money', cbe: 'bank_transfer', bank: 'bank_transfer', transfer: 'bank_transfer',
  visa: 'card', mastercard: 'card',
};

export const toSnake = (v: string) => v.trim().toLowerCase().replace(/[\s-]+/g, '_');

/** Cost used when a product has no cost_price and a privileged user did not supply one. */
export const DEFAULT_COST_RATIO = 0.6;
