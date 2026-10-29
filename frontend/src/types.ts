/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
}

export interface ProductUnit {
  id?: string;
  name: string; // e.g. "Box", "Strip", "Piece"
  quantity?: number;
  price?: number;
}

export interface MasterCatalogItem {
  id: string;
  name: string;
  genericName: string;
  category: string;
  form: string;
  strength: string;
  manufacturer: string;
  description?: string;
  defaultSellingPrice?: number;
  defaultCostPrice?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  brandId: string;
  category: string;
  gender: 'Men' | 'Women' | 'Unisex' | 'Kids';
  basePrice: number;
  warehouseIds?: string[];
  createdAt: string;
  updatedAt: string;
  brand?: Brand;
  variants?: Variant[];
  stock?: number;
  minStock?: number;
  expiryDate?: string;
  sellingPrice?: number;
  costPrice?: number;
  reorderLevel?: number;
  units?: ProductUnit[];
  genericName?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
}

export interface Variant {
  id: string;
  productId: string;
  size: string; // e.g. "9", "10", "42"
  color: string; // e.g. "Triple Black", "White/Red"
  sku: string;
  currentStock: number;
  barcode?: string;
  price: number; // variant price might differ from base price
  createdAt: string;
  productName?: string;
  productBrand?: string;
  category?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string; // e.g. "WH-EAST", "WH-WEST"
  location: string;
  capacity: number;
  createdAt: string;
  currentStock?: number; // aggregated from movements or variants
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'incoming' | 'outgoing' | 'transfer' | 'adjustment';

export interface Movement {
  id: string;
  variantId: string;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  quantity: number;
  type: MovementType;
  reason: string; // e.g., "Supplier Restock", "Customer Sale", "Stock Damage"
  createdBy: string;
  createdAt: string;
  variant?: Variant;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  productId?: string;
}

export type StockMovement = Movement;

export enum OrderStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  CANCELLED = 'cancelled'
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
  variant?: Variant;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderNumber: string;
  status: OrderStatus;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  supplierName?: string;
  items?: OrderItem[];
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard statistics interface
export interface DashboardStats {
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  lowStockVariants?: {
    id: string;
    productId: string;
    size: string;
    color: string;
    sku: string;
    currentStock: number;
    barcode?: string;
    price: number;
    productName?: string;
    productBrand?: string;
  }[];
  warehouseUtilization: { name: string; capacity: number; used: number }[];
  recentMovements: Movement[];
  brandDistribution: { name: string; value: number }[];
  totalSalesCount?: number;
  dailySalesCount?: number;
  totalRevenue?: number;
  dailyRevenue?: number;
  weeklyRevenue?: number;
  monthlyRevenue?: number;
  yearlyRevenue?: number;
  totalProfit: number;
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  yearlyProfit?: number;
  bestSellers: { name: string; brand: string; quantity: number; revenue: number; profit: number }[];
  revenueHistory: { date: string; revenue: number; profit: number }[];
  shopBreakdown?: ShopBreakdownItem[];
  topPerformingShop?: ShopBreakdownItem | null;
}

export interface ShopBreakdownItem {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  assignedEmployeeCount: number;
  totalSalesCount: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface Sale {
  id: string;
  variantId: string;
  warehouseId?: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  paymentMethod?: string;
  status?: string;
  returnedQty?: number;
  returnedAmount?: number;
  createdAt: string;
  variant?: Variant;
  totalAmount?: number;
  unitCost?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  shopId?: string | null;
  shopName?: string | null;
}

export interface UserSession {
  user: User;
  permissions: string[];
  token?: string;
  shopId?: string | null;
  shopName?: string | null;
}

