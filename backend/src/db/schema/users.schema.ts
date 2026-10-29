export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Sales Staff' | 'Warehouse Staff' | 'Manager';
  shopId?: string | null;
  createdAt?: string;
}

export const defaultUsers: User[] = [
  { id: 'usr1', name: 'Platform Owner', email: 'owner@shoetracker.com', password: 'owner123', role: 'Admin', shopId: null },
  { id: 'usr2', name: 'Sales Associate', email: 'sales@shoetracker.com', password: 'sales123', role: 'Sales Staff', shopId: 'wh1' }
];
