export interface Sale {
  id: string;
  variantId: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  createdAt?: string;
}

export const defaultSales: Sale[] = [
  { id: 'sl1', variantId: 'v1', quantity: 2, sellingPrice: 120, costPrice: 72, profit: 96 },
  { id: 'sl2', variantId: 'v2', quantity: 2, sellingPrice: 125, costPrice: 75, profit: 100 }
];
