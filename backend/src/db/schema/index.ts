import { defaultUsers } from './users.schema.ts';
import { defaultBrands, defaultProducts } from './products.schema.ts';
import { defaultVariants } from './variants.schema.ts';
import { defaultWarehouses, defaultOrders, defaultOrderItems } from './inventory.schema.ts';
import { defaultSales } from './sales.schema.ts';
import { defaultMovements } from './stockMovements.schema.ts';
import { defaultSuppliers } from './suppliers.schema.ts';

export * from './users.schema.ts';
export * from './products.schema.ts';
export * from './variants.schema.ts';
export * from './inventory.schema.ts';
export * from './sales.schema.ts';
export * from './stockMovements.schema.ts';
export * from './suppliers.schema.ts';

export const mockData = {
  brands: defaultBrands.map(b => ({ ...b, createdAt: new Date().toISOString() })),
  products: defaultProducts.map(p => ({
    ...p,
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  })),
  variants: defaultVariants.map(v => ({ ...v, createdAt: new Date().toISOString() })),
  warehouses: defaultWarehouses.map(w => ({ ...w, createdAt: new Date().toISOString() })),
  suppliers: defaultSuppliers.map(s => ({ ...s, createdAt: new Date().toISOString() })),
  movements: defaultMovements.map((m, i) => ({
    ...m,
    createdAt: new Date(Date.now() - (5 - i) * 24 * 3600 * 1000).toISOString()
  })),
  orders: defaultOrders.map(o => ({
    ...o,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  })),
  orderItems: [...defaultOrderItems],
  sales: defaultSales.map((s, i) => ({
    ...s,
    createdAt: new Date(Date.now() - (2 - i) * 24 * 3600 * 1000).toISOString()
  })),
  users: [...defaultUsers]
};
