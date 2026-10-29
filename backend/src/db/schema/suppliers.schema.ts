export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
}

export const defaultSuppliers: Supplier[] = [
  { id: 's1', name: 'Global Footwear Distributors', contactPerson: 'John Doe', email: 'orders@globalfootwear.com', phone: '+1-555-0199', address: '123 Logistics Way, New York, NY' },
  { id: 's2', name: 'Apex Sports Supplies', contactPerson: 'Jane Smith', email: 'sales@apexsports.com', phone: '+1-555-0188', address: '456 Athletic Blvd, Boston, MA' }
];
