export interface Movement {
  id: string;
  variantId: string;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  quantity: number;
  type: 'Incoming' | 'Outgoing' | 'Transfer' | 'Adjustment' | 'Sale' | 'Return';
  reason?: string;
  createdBy?: string;
  createdAt?: string;
}

export const defaultMovements: Movement[] = [
  { id: 'm1', variantId: 'v1', fromWarehouseId: null, toWarehouseId: 'w1', quantity: 20, type: 'Incoming', reason: 'Initial Supplier Restock', createdBy: 'Admin' },
  { id: 'm2', variantId: 'v2', fromWarehouseId: null, toWarehouseId: 'w1', quantity: 10, type: 'Incoming', reason: 'Initial Supplier Restock', createdBy: 'Admin' },
  { id: 'm3', variantId: 'v1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5, type: 'Transfer', reason: 'Shop Allocation', createdBy: 'Admin' },
  { id: 'm4', variantId: 'v2', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 6, type: 'Transfer', reason: 'Shop Allocation', createdBy: 'Admin' }
];
