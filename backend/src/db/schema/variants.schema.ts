export interface Variant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  currentStock: number;
  barcode?: string;
  price: number;
  createdAt?: string;
}

export const defaultVariants: Variant[] = [
  { id: 'v1', productId: 'p1', size: 'EU 40', color: 'Black/White', sku: 'NK-PEG39-40', currentStock: 25, barcode: '190283012391', price: 4200 },
  { id: 'v2', productId: 'p2', size: 'EU 42', color: 'Triple White', sku: 'NK-AM270-42', currentStock: 18, barcode: '190283012392', price: 4800 },
  { id: 'v3', productId: 'p3', size: 'EU 43', color: 'Core Black', sku: 'AD-UB22-43', currentStock: 30, barcode: '400129381023', price: 5200 },
  { id: 'v4', productId: 'p4', size: 'EU 41', color: 'Bred Red/Black', sku: 'JD-J1RETRO-41', currentStock: 12, barcode: '400129381024', price: 6500 },
  { id: 'v5', productId: 'p5', size: 'EU 42', color: 'Brown Leather', sku: 'CL-LOAFER-42', currentStock: 20, barcode: '300182739102', price: 3800 },
  { id: 'v6', productId: 'p6', size: 'EU 44', color: 'Wheat Nubuck', sku: 'TB-BOOT6IN-44', currentStock: 15, barcode: '500123940129', price: 7200 },
  { id: 'v7', productId: 'p7', size: 'EU 42', color: 'Sunset Red', sku: 'PM-NITRO2-42', currentStock: 22, barcode: '600123940130', price: 3400 },
  { id: 'v8', productId: 'p8', size: 'EU 40', color: 'Black High-Top', sku: 'CV-CHUCK-40', currentStock: 40, barcode: '700123940131', price: 2200 },
  { id: 'v9', productId: 'p9', size: 'EU 41', color: 'Black/White Checker', sku: 'VN-OLDSKOOL-41', currentStock: 35, barcode: '800123940132', price: 2400 },
  { id: 'v10', productId: 'p10', size: 'EU 43', color: 'Cherry Red', sku: 'DM-1460-43', currentStock: 10, barcode: '900123940133', price: 6800 },
  { id: 'v11', productId: 'p11', size: 'EU 41', color: 'Mocha Suede', sku: 'BS-ARIZONA-41', currentStock: 28, barcode: '111123940134', price: 2900 },
  { id: 'v12', productId: 'p12', size: 'EU 42', color: 'Black Calfskin', sku: 'EL-OXFORD-42', currentStock: 16, barcode: '222123940135', price: 3500 },
  { id: 'v13', productId: 'p13', size: 'EU 43', color: 'Deep Ocean Blue', sku: 'AS-GELKAY-43', currentStock: 14, barcode: '333123940136', price: 5400 },
  { id: 'v14', productId: 'p14', size: 'EU 42', color: 'Grey/Navy', sku: 'NB-574-42', currentStock: 25, barcode: '444123940137', price: 3900 },
  { id: 'v15', productId: 'p15', size: 'EU 41', color: 'Chalk White', sku: 'RB-CLASSIC-41', currentStock: 30, barcode: '555123940138', price: 2800 },
  { id: 'v16', productId: 'p16', size: 'EU 43', color: 'Sulfur Green', sku: 'SL-SPEED5-43', currentStock: 12, barcode: '666123940139', price: 5800 },
  { id: 'v17', productId: 'p17', size: 'EU 41', color: 'Navy Mesh', sku: 'SK-ARCHFIT-41', currentStock: 20, barcode: '777123940140', price: 3100 },
  { id: 'v18', productId: 'p18', size: 'EU 42', color: 'Graphite', sku: 'CR-CLOG-42', currentStock: 50, barcode: '888123940141', price: 1800 },
  { id: 'v19', productId: 'p19', size: 'EU 43', color: 'Zebra White/Black', sku: 'AD-YZ350-43', currentStock: 8, barcode: '999123940142', price: 8500 },
  { id: 'v20', productId: 'p20', size: 'EU 42', color: 'Tan Leather', sku: 'PS-CHELSEA-42', currentStock: 15, barcode: '101123940143', price: 4200 }
];
