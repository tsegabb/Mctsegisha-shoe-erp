import pg from 'pg';
import { env } from './env.ts';
import { mockData } from '../db/schema/index.ts';
import { seedDatabase } from '../db/seed/seed.ts';

export let isPostgresConnected = false;
export let dbError: string | null = null;
export let dbInstance: any = null;

// Active memory DB state
export const inMemoryDb = JSON.parse(JSON.stringify(mockData));

export async function initializeDatabase() {
  const DATABASE_URL = env.DATABASE_URL;
  if (DATABASE_URL) {
    console.log('Connecting to PostgreSQL Database...');
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    });

    try {
      // Test connection
      await pool.query('SELECT NOW()');
      console.log('Successfully connected to PostgreSQL!');
      isPostgresConnected = true;
      dbError = null;

      // Define standard DDL to create tables automatically
      await pool.query(`
        CREATE TABLE IF NOT EXISTS brands (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          logo_url TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          brand_id VARCHAR(255) REFERENCES brands(id) ON DELETE SET NULL,
          category VARCHAR(255) DEFAULT 'Casual',
          gender VARCHAR(255) DEFAULT 'Unisex',
          base_price DECIMAL(10, 2) NOT NULL,
          warehouse_ids TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS variants (
          id VARCHAR(255) PRIMARY KEY,
          product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          size VARCHAR(50) NOT NULL,
          color VARCHAR(255) NOT NULL,
          sku VARCHAR(255) UNIQUE NOT NULL,
          current_stock INT NOT NULL DEFAULT 0,
          barcode VARCHAR(255),
          price DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS warehouses (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(255) UNIQUE NOT NULL,
          location TEXT,
          capacity INT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS suppliers (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          contact_person VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(255),
          address TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS movements (
          id VARCHAR(255) PRIMARY KEY,
          variant_id VARCHAR(255) REFERENCES variants(id) ON DELETE CASCADE,
          from_warehouse_id VARCHAR(255) REFERENCES warehouses(id) ON DELETE SET NULL,
          to_warehouse_id VARCHAR(255) REFERENCES warehouses(id) ON DELETE SET NULL,
          quantity INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          reason TEXT,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sales (
          id VARCHAR(255) PRIMARY KEY,
          variant_id VARCHAR(255) REFERENCES variants(id) ON DELETE CASCADE,
          warehouse_id VARCHAR(255) REFERENCES warehouses(id) ON DELETE SET NULL,
          quantity INT NOT NULL,
          selling_price DECIMAL(10, 2) NOT NULL,
          cost_price DECIMAL(10, 2) NOT NULL,
          profit DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50) DEFAULT 'cash',
          status VARCHAR(50) DEFAULT 'Completed',
          returned_qty INT DEFAULT 0,
          returned_amount DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(255) PRIMARY KEY,
          supplier_id VARCHAR(255) REFERENCES suppliers(id) ON DELETE SET NULL,
          order_number VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          total_cost DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id VARCHAR(255) PRIMARY KEY,
          order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
          variant_id VARCHAR(255) REFERENCES variants(id) ON DELETE SET NULL,
          quantity INT NOT NULL,
          unit_cost DECIMAL(10, 2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          shop_id VARCHAR(255) REFERENCES warehouses(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS cash_activities (
          id VARCHAR(255) PRIMARY KEY,
          shop_id VARCHAR(255),
          type VARCHAR(100) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          method VARCHAR(50) NOT NULL DEFAULT 'Cash',
          note TEXT,
          user_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Database migrations
      try { await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_ids TEXT'); } catch (e: any) { console.warn('Migration warning (products.warehouse_ids):', e.message); }
      try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255)'); } catch (e: any) { console.warn('Migration warning (users.shop_id):', e.message); }
      try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)'); } catch (e: any) { console.warn('Migration warning (users.phone):', e.message); }
      try { await pool.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(255)'); } catch (e: any) { console.warn('Migration warning (sales.warehouse_id):', e.message); }
      try { await pool.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash'"); } catch (e: any) { console.warn('Migration warning (sales.payment_method):', e.message); }
      try { await pool.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed'"); } catch (e: any) { console.warn('Migration warning (sales.status):', e.message); }
      try { await pool.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS returned_qty INT DEFAULT 0"); } catch (e: any) { console.warn('Migration warning (sales.returned_qty):', e.message); }
      try { await pool.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS returned_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e: any) { console.warn('Migration warning (sales.returned_amount):', e.message); }

      // Drop all foreign key constraints so UUID columns can be converted to VARCHAR(255) safely
      try {
        await pool.query(`
          DO $$
          DECLARE
              r RECORD;
          BEGIN
              FOR r IN (
                  SELECT table_name, constraint_name
                  FROM information_schema.table_constraints
                  WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
              ) LOOP
                  EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
              END LOOP;
          END $$;
        `);
      } catch (e: any) {
        console.warn('FK constraint drop warning:', e.message);
      }

      const alterCols = [
        ['brands', 'id'],
        ['products', 'id'],
        ['products', 'brand_id'],
        ['variants', 'id'],
        ['variants', 'product_id'],
        ['warehouses', 'id'],
        ['suppliers', 'id'],
        ['movements', 'id'],
        ['movements', 'variant_id'],
        ['movements', 'from_warehouse_id'],
        ['movements', 'to_warehouse_id'],
        ['sales', 'id'],
        ['sales', 'variant_id'],
        ['sales', 'warehouse_id'],
        ['orders', 'id'],
        ['orders', 'supplier_id'],
        ['order_items', 'id'],
        ['order_items', 'order_id'],
        ['order_items', 'variant_id'],
        ['users', 'id'],
        ['users', 'shop_id'],
        ['cash_activities', 'id'],
        ['cash_activities', 'shop_id'],
      ];

      for (const [tbl, col] of alterCols) {
        try {
          await pool.query(`ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE VARCHAR(255) USING ${col}::text`);
        } catch (e: any) {
          console.warn(`Column alter warning (${tbl}.${col}):`, e.message);
        }
      }

      // Seed initial database data if variants or users table is empty
      const varCountRes = await pool.query('SELECT COUNT(*) FROM variants');
      if (parseInt(varCountRes.rows[0].count) === 0) {
        console.log('Database tables empty. Seeding initial data...');
        await seedDatabase(pool);
      } else {
        // Ensure users are seeded if missing
        const userCountRes = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCountRes.rows[0].count) === 0) {
          for (const u of mockData.users) {
            await pool.query('INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [u.id, u.name, u.email, u.password, u.role]);
          }
        }
      }

      dbInstance = {
        session: {
          client: pool
        }
      };

    } catch (err: any) {
      console.warn('⚠️ Could not connect to PostgreSQL database:', err.message);
      console.warn('⚠️ Falling back to In-Memory Demo Storage Mode.');
      isPostgresConnected = false;
      dbError = err.message;
      dbInstance = null;
    }
  } else {
    console.log('ℹ️ No DATABASE_URL set. Running in In-Memory Demo Storage Mode.');
    isPostgresConnected = false;
    dbInstance = null;
    dbError = 'DATABASE_URL environment variable is missing';
  }
}
export function setPostgresConnected(status: boolean) {
  isPostgresConnected = status;
}
export function setDbError(err: string | null) {
  dbError = err;
}
export function setDbInstance(instance: any) {
  dbInstance = instance;
}
