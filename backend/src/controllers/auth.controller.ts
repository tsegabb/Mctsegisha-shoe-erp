import { Request, Response } from 'express';
import { authService } from '../services/auth.service.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import crypto from 'crypto';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return apiResponse.error(res, 'Email and password are required', 400);
      }
      
      const result = await authService.login(email, password);
      if (!result) {
        return apiResponse.error(res, 'Invalid email or password', 401);
      }
      
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async me(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return apiResponse.error(res, 'Not authenticated', 401);
      }
      
      const result = await authService.getUserById(userId);
      if (!result) {
        return apiResponse.error(res, 'User not found', 404);
      }
      
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async listUsers(req: Request, res: Response) {
    try {
      const users = await authService.getAllUsers();
      return apiResponse.success(res, users);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const { name, email, phone, password, role, shopId } = req.body;
      if (!name || !role) {
        return apiResponse.error(res, 'Name and role are required', 400);
      }
      
      const cleanPhone = (phone || '').trim();
      const finalEmail = (email || '').trim() || (cleanPhone ? `${cleanPhone.replace(/\s+/g, '')}@store.com` : `${name.toLowerCase().replace(/\s+/g, '')}@store.com`);

      const id = generateId();
      const user = await authService.createUser({ 
        id, 
        name, 
        email: finalEmail, 
        phone: cleanPhone, 
        password: password || 'user123', 
        role, 
        shopId: shopId || null 
      });
      return apiResponse.success(res, user, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, role, shopId } = req.body;
      const updated = await authService.updateUser(id, { name, email, role, shopId });
      if (!updated) {
        return apiResponse.error(res, 'User not found', 404);
      }
      return apiResponse.success(res, updated);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (req.user && req.user.id === id) {
        return apiResponse.error(res, 'Action forbidden: You cannot delete your own active administrator account.', 400);
      }
      const success = await authService.deleteUser(id);
      if (!success) {
        return apiResponse.error(res, 'User not found', 404);
      }
      return apiResponse.success(res, { success: true, deletedId: id });
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  }

};
