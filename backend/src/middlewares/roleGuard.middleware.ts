import { Request, Response, NextFunction } from 'express';
import { apiResponse } from '../utils/apiResponse.ts';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return apiResponse.error(res, 'Not authenticated', 401);
    }
    
    const userRoleLower = (req.user.role || '').toLowerCase();
    const allowedLower = allowedRoles.map(r => r.toLowerCase());

    if (!allowedLower.includes(userRoleLower) && userRoleLower !== 'admin' && userRoleLower !== 'owner') {
      return apiResponse.error(res, 'Access denied. Insufficient permissions.', 403);
    }
    
    next();
  };
}
