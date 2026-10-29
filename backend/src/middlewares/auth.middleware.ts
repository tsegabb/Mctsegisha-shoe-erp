import { Request, Response, NextFunction } from 'express';
import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import { UserSession } from '../types/auth.types.ts';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return apiResponse.error(res, 'Not authenticated', 401);
  }

  let user: UserSession | null = null;

  if (isPostgresConnected && dbInstance) {
    const pool = dbInstance.session.client;
    try {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.role, u.shop_id, w.name as shop_name
        FROM users u
        LEFT JOIN warehouses w ON u.shop_id = w.id
        WHERE u.id = $1
      `, [userId]);
      if (userRes.rows.length > 0) {
        const row = userRes.rows[0];
        user = { 
          id: row.id, 
          name: row.name, 
          email: row.email, 
          role: row.role, 
          shopId: row.shop_id || null, 
          shopName: row.shop_name || null 
        };
      }
    } catch (e: any) {
      console.error('Database query error in authMiddleware:', e);
    }
  } else {
    // InMemory fallback
    const found = inMemoryDb.users.find((u: any) => u.id === userId);
    if (found) {
      const shop = inMemoryDb.warehouses.find((w: any) => w.id === found.shopId);
      user = { 
        id: found.id, 
        name: found.name, 
        email: found.email, 
        role: found.role, 
        shopId: found.shopId || null, 
        shopName: shop ? shop.name : null 
      };
    }
  }

  if (!user) {
    return apiResponse.error(res, 'User not found or invalid session', 401);
  }

  req.user = user;
  next();
}
