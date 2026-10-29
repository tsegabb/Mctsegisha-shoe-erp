export interface MasterCatalogItem {
  id: string;
  name: string;
  genericName: string; // Model / Line / Silhouette
  category: string;    // Basketball, Running, Retro, Skateboarding, etc.
  form: string;        // Style / Cut (High Top, Low Top, Mid Cut, Slip-On)
  strength: string;    // Size Range & Tech (e.g. US 7-13 / Air Unit)
  manufacturer: string;// Brand / Manufacturer (Nike, Adidas, Jordan, etc.)
  description?: string;
  defaultSellingPrice?: number;
  defaultCostPrice?: number;
}

export const MASTER_CATALOG_ITEMS: MasterCatalogItem[] = [
  {
    id: 'mc-1',
    name: "Air Jordan 1 Retro High OG 'Chicago'",
    genericName: 'Air Jordan 1',
    category: 'Retro Basketball',
    form: 'High Top',
    strength: 'US 7-13 / Air Cushioning',
    manufacturer: 'Jordan Brand',
    defaultSellingPrice: 12500.00,
    defaultCostPrice: 8200.00
  },
  {
    id: 'mc-2',
    name: "Nike Dunk Low 'Panda'",
    genericName: 'Dunk Low',
    category: 'Skate / Lifestyle',
    form: 'Low Top',
    strength: 'US 6-13 / Rubber Cupsole',
    manufacturer: 'Nike',
    defaultSellingPrice: 6500.00,
    defaultCostPrice: 4200.00
  },
  {
    id: 'mc-3',
    name: "Yeezy Boost 350 V2 'Zebra'",
    genericName: 'Yeezy Boost 350',
    category: 'Lifestyle Running',
    form: 'Low Top / Sock-like',
    strength: 'US 6-12.5 / Boost Tech',
    manufacturer: 'Adidas',
    defaultSellingPrice: 14000.00,
    defaultCostPrice: 9500.00
  },
  {
    id: 'mc-4',
    name: "New Balance 2002R 'Protection Pack'",
    genericName: '2002R',
    category: 'Lifestyle / Running',
    form: 'Low Top',
    strength: 'US 7-12 / N-ergy Cushioning',
    manufacturer: 'New Balance',
    defaultSellingPrice: 9200.00,
    defaultCostPrice: 6000.00
  },
  {
    id: 'mc-5',
    name: "Adidas Ultraboost 1.0 'Triple White'",
    genericName: 'Ultraboost',
    category: 'Performance Running',
    form: 'Low Top',
    strength: 'US 6-13 / Boost Foam',
    manufacturer: 'Adidas',
    defaultSellingPrice: 8000.00,
    defaultCostPrice: 5000.00
  },
  {
    id: 'mc-6',
    name: "Nike Air Force 1 '07 Low White",
    genericName: 'Air Force 1',
    category: 'Classics / Lifestyle',
    form: 'Low Top',
    strength: 'US 5-14 / Encapsulated Air',
    manufacturer: 'Nike',
    defaultSellingPrice: 5800.00,
    defaultCostPrice: 3600.00
  },
  {
    id: 'mc-7',
    name: "Air Jordan 4 Retro 'Military Black'",
    genericName: 'Air Jordan 4',
    category: 'Retro Basketball',
    form: 'Mid Top',
    strength: 'US 7-13 / Visible Air Unit',
    manufacturer: 'Jordan Brand',
    defaultSellingPrice: 15500.00,
    defaultCostPrice: 10000.00
  },
  {
    id: 'mc-8',
    name: "Asics Gel-Kayano 14 'Silver Cream'",
    genericName: 'Gel-Kayano 14',
    category: 'Performance Running',
    form: 'Low Top',
    strength: 'US 7-12 / GEL Tech Cushioning',
    manufacturer: 'Asics',
    defaultSellingPrice: 8800.00,
    defaultCostPrice: 5500.00
  },
  {
    id: 'mc-9',
    name: 'Converse Chuck Taylor All-Star 70 High',
    genericName: 'Chuck 70',
    category: 'Classics / Canvas',
    form: 'High Top',
    strength: 'US 4-13 / Heavy Duty Canvas',
    manufacturer: 'Converse',
    defaultSellingPrice: 3800.00,
    defaultCostPrice: 2200.00
  },
  {
    id: 'mc-10',
    name: 'Nike ZoomX Vaporfly NEXT% 2',
    genericName: 'Vaporfly',
    category: 'Marathon Running',
    form: 'Low Top',
    strength: 'US 6-12 / Carbon Fiber Plate',
    manufacturer: 'Nike',
    defaultSellingPrice: 13500.00,
    defaultCostPrice: 9000.00
  },
  {
    id: 'mc-11',
    name: "Puma MB.01 'LaMelo Ball Red'",
    genericName: 'MB.01',
    category: 'Performance Basketball',
    form: 'Mid Top',
    strength: 'US 7-13 / Nitro Foam',
    manufacturer: 'Puma',
    defaultSellingPrice: 7500.00,
    defaultCostPrice: 4800.00
  },
  {
    id: 'mc-12',
    name: "Salomon XT-6 'Lab Black'",
    genericName: 'XT-6',
    category: 'Trail / Outdoor',
    form: 'Low Top',
    strength: 'US 6.5-12 / ACS Chassis',
    manufacturer: 'Salomon',
    defaultSellingPrice: 9800.00,
    defaultCostPrice: 6400.00
  },
  {
    id: 'mc-13',
    name: 'Vans Old Skool Core Classics',
    genericName: 'Old Skool',
    category: 'Skateboarding',
    form: 'Low Top',
    strength: 'US 5-13 / Waffle Rubber Sole',
    manufacturer: 'Vans',
    defaultSellingPrice: 3500.00,
    defaultCostPrice: 2000.00
  },
  {
    id: 'mc-14',
    name: "Air Jordan 11 Retro 'Concord'",
    genericName: 'Air Jordan 11',
    category: 'Retro Basketball',
    form: 'Mid Top',
    strength: 'US 7-14 / Carbon Fiber Shank',
    manufacturer: 'Jordan Brand',
    defaultSellingPrice: 16000.00,
    defaultCostPrice: 10500.00
  },
  {
    id: 'mc-15',
    name: "Nike Kobe 6 Protro 'Reverse Grinch'",
    genericName: 'Kobe 6 Protro',
    category: 'Performance Basketball',
    form: 'Low Top',
    strength: 'US 7-13 / Zoom Turbo Air',
    manufacturer: 'Nike',
    defaultSellingPrice: 18000.00,
    defaultCostPrice: 12000.00
  },
  {
    id: 'mc-16',
    name: "Adidas Samba OG 'Cloud White'",
    genericName: 'Samba',
    category: 'Terrace / Lifestyle',
    form: 'Low Top',
    strength: 'US 5-12.5 / Gum Outsole',
    manufacturer: 'Adidas',
    defaultSellingPrice: 5500.00,
    defaultCostPrice: 3500.00
  },
  {
    id: 'mc-17',
    name: "New Balance 550 'White Green'",
    genericName: '550',
    category: 'Retro Basketball',
    form: 'Low Top',
    strength: 'US 6-13 / Ortholite Cushioning',
    manufacturer: 'New Balance',
    defaultSellingPrice: 6800.00,
    defaultCostPrice: 4200.00
  },
  {
    id: 'mc-18',
    name: "Nike Air Max 90 'Infrared'",
    genericName: 'Air Max 90',
    category: 'Retro Running',
    form: 'Low Top',
    strength: 'US 6-13 / Max Air Cushion',
    manufacturer: 'Nike',
    defaultSellingPrice: 7200.00,
    defaultCostPrice: 4500.00
  },
  {
    id: 'mc-19',
    name: "On Running Cloudmonster 'All Black'",
    genericName: 'Cloudmonster',
    category: 'Performance Running',
    form: 'Low Top',
    strength: 'US 7-13 / CloudTec Cushioning',
    manufacturer: 'On Running',
    defaultSellingPrice: 9500.00,
    defaultCostPrice: 6200.00
  },
  {
    id: 'mc-20',
    name: 'Birkenstock Arizona Birko-Flor',
    genericName: 'Arizona',
    category: 'Sandals / Slide',
    form: 'Slip-On',
    strength: 'EU 36-46 / Cork-Latex Footbed',
    manufacturer: 'Birkenstock',
    defaultSellingPrice: 4500.00,
    defaultCostPrice: 2800.00
  }
];
