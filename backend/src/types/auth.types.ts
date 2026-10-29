export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales Staff' | 'Warehouse Staff' | 'Manager';
  shopId?: string | null;
  shopName?: string | null;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  token?: string;
  error?: string;
}
