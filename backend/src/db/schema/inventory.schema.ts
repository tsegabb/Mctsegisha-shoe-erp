export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location?: string;
  capacity: number;
  createdAt?: string;
}

export interface Order {
  id: string;
  supplierId: string;
  orderNumber: string;
  status: 'pending' | 'received' | 'cancelled';
  totalCost: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
}

export const defaultWarehouses: Warehouse[] = [
  { id: 'w1', name: 'Main Distribution Center', code: 'WH-MAIN', location: 'Addis Ababa', capacity: 1000 },
  { id: 'w2', name: 'Bole Boutique Shop', code: 'WH-BOLE', location: 'Bole, Addis Ababa', capacity: 200 }
];

export const defaultOrders: Order[] = [
  { id: 'o1', supplierId: 's1', orderNumber: 'PO-10001', status: 'received', totalCost: 2400 }
];

export const defaultOrderItems: OrderItem[] = [
  { id: 'oi1', orderId: 'o1', variantId: 'v1', quantity: 20, unitCost: 72 },
  { id: 'oi2', orderId: 'o1', variantId: 'v2', quantity: 10, unitCost: 75 }
];
