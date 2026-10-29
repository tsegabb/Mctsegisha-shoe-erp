export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  brandId?: string;
  category: string;
  gender: string;
  basePrice: number;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultBrands: Brand[] = [
  { id: 'b1', name: 'Nike', logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop', description: 'Just Do It' },
  { id: 'b2', name: 'Adidas', logoUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=80&h=80&fit=crop', description: 'Impossible Is Nothing' },
  { id: 'b3', name: 'Puma', logoUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=80&h=80&fit=crop', description: 'Forever Faster' },
  { id: 'b4', name: 'Nike / Jordan', logoUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=80&h=80&fit=crop', description: 'Air Jordan Collection' },
  { id: 'b5', name: 'Clarks', logoUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=80&h=80&fit=crop', description: 'Classic Comfort Footwear' },
  { id: 'b6', name: 'Timberland', logoUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=80&h=80&fit=crop', description: 'Outdoor Work & Style Boots' },
  { id: 'b7', name: 'Converse', logoUrl: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=80&h=80&fit=crop', description: 'Chuck Taylor All Star' },
  { id: 'b8', name: 'Vans', logoUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=80&h=80&fit=crop', description: 'Off The Wall Skateware' },
  { id: 'b9', name: 'Dr. Martens', logoUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=80&h=80&fit=crop', description: 'AirWair Leather Boots' },
  { id: 'b10', name: 'Birkenstock', logoUrl: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=80&h=80&fit=crop', description: 'German Comfort Sandals' },
  { id: 'b11', name: 'Ethio Leather', logoUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=80&h=80&fit=crop', description: 'Premium Ethiopian Handcrafted Leather' },
  { id: 'b12', name: 'Asics', logoUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=80&h=80&fit=crop', description: 'Sound Mind Sound Body' },
  { id: 'b13', name: 'New Balance', logoUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=80&h=80&fit=crop', description: 'Fearlessly Independent' },
  { id: 'b14', name: 'Reebok', logoUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=80&h=80&fit=crop', description: 'Life is Not a Spectator Sport' },
  { id: 'b15', name: 'Salomon', logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop', description: 'Tomorrow is Yours' },
  { id: 'b16', name: 'Skechers', logoUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=80&h=80&fit=crop', description: 'The Comfort Technology Company' },
  { id: 'b17', name: 'Crocs', logoUrl: 'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=80&h=80&fit=crop', description: 'Come As You Are' },
  { id: 'b18', name: 'Peacock Shoe', logoUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=80&h=80&fit=crop', description: 'Ethiopian Heritage Craftsmanship' }
];

export const defaultProducts: Product[] = [
  { id: 'p1', name: 'Nike Pegasus 39', description: 'Classic responsive running shoe with React foam', brandId: 'b1', category: 'Running Shoes', gender: 'Unisex', basePrice: 4200 },
  { id: 'p2', name: 'Nike Air Max 270', description: 'Lifestyle shoe featuring large Max Air heel unit', brandId: 'b1', category: 'Sneakers', gender: 'Men', basePrice: 4800 },
  { id: 'p3', name: 'Adidas Ultraboost 22', description: 'High-performance running shoe with responsive boost midsole', brandId: 'b2', category: 'Running Shoes', gender: 'Men', basePrice: 5200 },
  { id: 'p4', name: 'Jordan 1 Retro High', description: 'Iconic basketball sneaker with premium leather upper', brandId: 'b4', category: 'Sneakers', gender: 'Unisex', basePrice: 6500 },
  { id: 'p5', name: 'Clarks Leather Loafer', description: 'Sophisticated dress loafer built with Cushion Plus technology', brandId: 'b5', category: 'Loafers', gender: 'Men', basePrice: 3800 },
  { id: 'p6', name: 'Timberland 6-Inch Boot', description: 'Waterproof direct-attach construction wheat leather boot', brandId: 'b6', category: 'Boots', gender: 'Men', basePrice: 7200 },
  { id: 'p7', name: 'Puma Velocity Nitro 2', description: 'Lightweight and responsive all-in-one running sneaker', brandId: 'b3', category: 'Running Shoes', gender: 'Unisex', basePrice: 3400 },
  { id: 'p8', name: 'Converse Chuck Taylor', description: 'Timeless high-top canvas sneaker', brandId: 'b7', category: 'Casual Shoes', gender: 'Unisex', basePrice: 2200 },
  { id: 'p9', name: 'Vans Old Skool Classic', description: 'Low top side-stripe skate shoe with waffle outsole', brandId: 'b8', category: 'Casual Shoes', gender: 'Unisex', basePrice: 2400 },
  { id: 'p10', name: 'Dr. Martens 1460 Boot', description: '8-eye smooth leather boot with yellow welt stitching', brandId: 'b9', category: 'Boots', gender: 'Unisex', basePrice: 6800 },
  { id: 'p11', name: 'Birkenstock Arizona', description: 'Two-strap cork footbed sandal', brandId: 'b10', category: 'Sandals & Slides', gender: 'Unisex', basePrice: 2900 },
  { id: 'p12', name: 'Oxford Formal Leather', description: 'Handmade Ethiopian genuine leather formal shoe', brandId: 'b11', category: 'Formal Shoes', gender: 'Men', basePrice: 3500 },
  { id: 'p13', name: 'Asics Gel-Kayano 29', description: 'Maximum stability long-distance running sneaker', brandId: 'b12', category: 'Running Shoes', gender: 'Men', basePrice: 5400 },
  { id: 'p14', name: 'New Balance 574 Core', description: 'Classic lifestyle sneaker with ENCAP midsole cushioning', brandId: 'b13', category: 'Sneakers', gender: 'Unisex', basePrice: 3900 },
  { id: 'p15', name: 'Reebok Classic Leather', description: 'Soft garment leather upper heritage everyday sneaker', brandId: 'b14', category: 'Casual Shoes', gender: 'Unisex', basePrice: 2800 },
  { id: 'p16', name: 'Salomon Speedcross 5', description: 'Aggressive grip trail running footwear', brandId: 'b15', category: 'Sports & Athletic', gender: 'Men', basePrice: 5800 },
  { id: 'p17', name: 'Skechers Arch Fit', description: 'Podiatrist-certified arch support walking shoe', brandId: 'b16', category: 'Casual Shoes', gender: 'Unisex', basePrice: 3100 },
  { id: 'p18', name: 'Crocs Classic Clog', description: 'Lightweight Croslite foam clog with ventilation ports', brandId: 'b17', category: 'Sandals & Slides', gender: 'Unisex', basePrice: 1800 },
  { id: 'p19', name: 'Yeezy Boost 350 V2', description: 'Primeknit upper with full-length boost sole unit', brandId: 'b2', category: 'Sneakers', gender: 'Unisex', basePrice: 8500 },
  { id: 'p20', name: 'Chelsea Leather Boot', description: 'Handcrafted Ethiopian leather elastic side-panel Chelsea boot', brandId: 'b18', category: 'Boots', gender: 'Men', basePrice: 4200 }
];
