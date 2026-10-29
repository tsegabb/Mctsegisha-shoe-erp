import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { getGeneralSettings } from '../../settings_store.ts';
import { UserSession } from '../types/auth.types.ts';

export const authService = {
  async login(email: string, password: string): Promise<{ user: UserSession; permissions: string[] } | null> {
    let user: any = null;
    
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      try {
        const userRes = await pool.query(`
          SELECT u.id, u.name, u.email, u.role, u.shop_id, w.name as shop_name
          FROM users u
          LEFT JOIN warehouses w ON u.shop_id = w.id
          WHERE LOWER(u.email) = LOWER($1) AND u.password = $2
        `, [email, password]);
        if (userRes.rows.length > 0) {
          const row = userRes.rows[0];
          user = { id: row.id, name: row.name, email: row.email, role: row.role, shopId: row.shop_id || null, shopName: row.shop_name || null };
        }
      } catch (e: any) {
        console.error('Database login query error:', e);
      }
    } else {
      const found = inMemoryDb.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (found) {
        const shop = inMemoryDb.warehouses.find((w: any) => w.id === found.shopId);
        user = { id: found.id, name: found.name, email: found.email, role: found.role, shopId: found.shopId || null, shopName: shop ? shop.name : null };
      }
    }

    if (!user) return null;

    const settings = getGeneralSettings();
    const roleObj = settings.usersPermissions?.roles?.find((r: any) => r.name === user.role);
    const permissions = roleObj ? roleObj.permissions : [];

    return { user, permissions };
  },

  async getUserById(userId: string): Promise<{ user: UserSession; permissions: string[] } | null> {
    let user: any = null;
    
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
          user = { id: row.id, name: row.name, email: row.email, role: row.role, shopId: row.shop_id || null, shopName: row.shop_name || null };
        }
      } catch (e: any) {
        console.error('Database user check error:', e);
      }
    } else {
      const found = inMemoryDb.users.find((u: any) => u.id === userId);
      if (found) {
        const shop = inMemoryDb.warehouses.find((w: any) => w.id === found.shopId);
        user = { id: found.id, name: found.name, email: found.email, role: found.role, shopId: found.shopId || null, shopName: shop ? shop.name : null };
      }
    }

    if (!user) return null;

    const settings = getGeneralSettings();
    const roleObj = settings.usersPermissions?.roles?.find((r: any) => r.name === user.role);
    const permissions = roleObj ? roleObj.permissions : [];

    return { user, permissions };
  },

  async getAllUsers(): Promise<any[]> {
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const res = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.shop_id, w.name as shop_name, u.created_at
        FROM users u
        LEFT JOIN warehouses w ON u.shop_id = w.id
        ORDER BY u.name ASC
      `);
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        role: row.role,
        shopId: row.shop_id || null,
        shopName: row.shop_name || null,
        createdAt: row.created_at
      }));
    } else {
      return inMemoryDb.users.map((u: any) => {
        const shop = inMemoryDb.warehouses.find((w: any) => w.id === u.shopId);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          shopId: u.shopId || null,
          shopName: shop ? shop.name : null,
          createdAt: u.createdAt || new Date().toISOString()
        };
      });
    }
  },

  async createUser(userData: { id: string; name: string; email: string; phone?: string; password?: string; role: string; shopId?: string | null }): Promise<any> {
    const shopId = userData.shopId || null;
    const phone = userData.phone || '';
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const res = await pool.query(
        'INSERT INTO users (id, name, email, phone, password, role, shop_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, phone, role, shop_id, created_at',
        [userData.id, userData.name, userData.email, phone, userData.password || 'user123', userData.role, shopId]
      );
      const row = res.rows[0];
      let shopName = null;
      if (row.shop_id) {
        const wRes = await pool.query('SELECT name FROM warehouses WHERE id = $1', [row.shop_id]);
        if (wRes.rows.length > 0) shopName = wRes.rows[0].name;
      }
      return { id: row.id, name: row.name, email: row.email, phone: row.phone || '', role: row.role, shopId: row.shop_id, shopName, createdAt: row.created_at };
    } else {
      const shop = inMemoryDb.warehouses.find((w: any) => w.id === shopId);
      const newUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: phone,
        password: userData.password || 'user123',
        role: userData.role,
        shopId: shopId,
        createdAt: new Date().toISOString()
      };
      inMemoryDb.users.push(newUser);
      return { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role, shopId: newUser.shopId, shopName: shop ? shop.name : null, createdAt: newUser.createdAt };
    }
  },

  async updateUser(id: string, updates: { name?: string; email?: string; role?: string; shopId?: string | null }): Promise<any> {
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const setClauses: string[] = [];
      const values: any[] = [];
      let valIdx = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${valIdx++}`);
        values.push(updates.name);
      }
      if (updates.email !== undefined) {
        setClauses.push(`email = $${valIdx++}`);
        values.push(updates.email);
      }
      if (updates.role !== undefined) {
        setClauses.push(`role = $${valIdx++}`);
        values.push(updates.role);
      }
      if (updates.shopId !== undefined) {
        setClauses.push(`shop_id = $${valIdx++}`);
        values.push(updates.shopId || null);
      }

      if (setClauses.length === 0) return null;

      values.push(id);
      const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${valIdx} RETURNING id, name, email, role, shop_id, created_at`;
      const res = await pool.query(query, values);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      let shopName = null;
      if (row.shop_id) {
        const wRes = await pool.query('SELECT name FROM warehouses WHERE id = $1', [row.shop_id]);
        if (wRes.rows.length > 0) shopName = wRes.rows[0].name;
      }
      return { id: row.id, name: row.name, email: row.email, role: row.role, shopId: row.shop_id, shopName, createdAt: row.created_at };
    } else {
      const user = inMemoryDb.users.find((u: any) => u.id === id);
      if (!user) return null;
      if (updates.name !== undefined) user.name = updates.name;
      if (updates.email !== undefined) user.email = updates.email;
      if (updates.role !== undefined) user.role = updates.role;
      if (updates.shopId !== undefined) user.shopId = updates.shopId || null;
      const shop = inMemoryDb.warehouses.find((w: any) => w.id === user.shopId);
      return { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shopId, shopName: shop ? shop.name : null, createdAt: user.createdAt };
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const res = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return res.rows.length > 0;
    } else {
      const idx = inMemoryDb.users.findIndex((u: any) => u.id === id);
      if (idx !== -1) {
        inMemoryDb.users.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
};
