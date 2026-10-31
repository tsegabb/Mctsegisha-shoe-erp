import bcrypt from 'bcryptjs';
import { closePool, pool } from '../src/config/db.ts';
import { env } from '../src/config/env.ts';

async function seed() {
  console.log('🌱 Starting database initial seeding...');

  // 1. Categories
  const categories = [
    ['Sneakers', 'Everyday lifestyle and casual sneakers'],
    ['Running Shoes', 'Performance and trail running shoes'],
    ['Formal Shoes', 'Dress shoes, Oxfords, and leather formals'],
    ['Boots', 'Leather boots, Chelsea boots, and work boots'],
    ['Sandals & Slides', 'Casual slides, clogs, and sandals'],
    ['Loafers', 'Comfort slip-on loafers']
  ];

  for (const [name, desc] of categories) {
    await pool.query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [name, desc]
    );
  }
  console.log('✅ Categories seeded.');

  // 2. Shops Helper
  async function getOrCreateShop(name: string): Promise<string> {
    const existing = await pool.query(`SELECT id FROM shops WHERE name = $1`, [name]);
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    const created = await pool.query(`INSERT INTO shops (name) VALUES ($1) RETURNING id`, [name]);
    return created.rows[0].id;
  }

  const mainShopId = await getOrCreateShop('Main Branch');
  const boleShopId = await getOrCreateShop('Bole Branch');
  console.log(`✅ Shops verified: Main (${mainShopId}), Bole (${boleShopId})`);

  // 3. Warehouses
  await pool.query(`
    INSERT INTO warehouses (name, code, location, shop_id, is_active, capacity)
    VALUES ('Main Warehouse', 'WH-MAIN', 'Addis Ababa - Central', $1, true, 10000)
    ON CONFLICT (code) DO UPDATE SET shop_id = EXCLUDED.shop_id, is_active = true
  `, [mainShopId]);

  await pool.query(`
    INSERT INTO warehouses (name, code, location, shop_id, is_active, capacity)
    VALUES ('Bole Store Stock', 'WH-BOLE', 'Bole Medhanialem', $1, true, 5000)
    ON CONFLICT (code) DO UPDATE SET shop_id = EXCLUDED.shop_id, is_active = true
  `, [boleShopId]);
  console.log('✅ Warehouses seeded and linked to shops.');

  // 4. Default Seed Users
  // Owner account
  const ownerEmail = 'owner@soleflow.com';
  const ownerPassword = process.env.NEW_USER_PASSWORD || 'SoleFlow#Admin2026!';
  const ownerHash = await bcrypt.hash(ownerPassword, env.BCRYPT_ROUNDS);

  await pool.query(`
    INSERT INTO users (name, email, password, role, shop_id, is_active)
    VALUES ('SoleFlow Owner', $1, $2, 'owner', $3, true)
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'owner', is_active = true
  `, [ownerEmail, ownerHash, mainShopId]);

  // Cashier account
  const cashierEmail = 'cashier@soleflow.com';
  const cashierPassword = process.env.CASHIER_PASSWORD || 'SoleFlow#Cashier2026!';
  const cashierHash = await bcrypt.hash(cashierPassword, env.BCRYPT_ROUNDS);

  await pool.query(`
    INSERT INTO users (name, email, password, role, shop_id, is_active)
    VALUES ('Bole Cashier', $1, $2, 'cashier', $3, true)
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'cashier', is_active = true
  `, [cashierEmail, cashierHash, boleShopId]);

  console.log(`✅ Seed users verified:`);
  console.log(`   - Owner: ${ownerEmail} (password: ${ownerPassword})`);
  console.log(`   - Cashier: ${cashierEmail} (password: ${cashierPassword})`);

  await closePool();
  console.log('🎉 Seeding completed successfully!');
}

seed().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
