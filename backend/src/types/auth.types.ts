import type { Role } from '../constants/domain.ts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  shopId: string | null;
  shopName: string | null;
  isActive: boolean;
}
