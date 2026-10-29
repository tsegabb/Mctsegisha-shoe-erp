import { mockData } from '../schema/index.ts';

export async function seedDatabase(client: any) {
  console.log('🌱 Starting database seeding...');
  
  try {
    // 1. Seed Brands
    for (const b of mockData.brands) {
      await client.query(
        `INSERT INTO brands (id, name, logo_url, description) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO UPDATE SET name = $2, logo_url = $3, description = $4`,
        [b.id, b.name, b.logoUrl, b.description]
      );
    }

    // 2. Seed Products
    for (const p of mockData.products) {
      const whIds = (p as any).warehouseIds ? (p as any).warehouseIds.join(',') : 'w1,w2';
      await client.query(
        `INSERT INTO products (id, name, description, brand_id, category, gender, base_price, warehouse_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, brand_id = $4, category = $5, gender = $6, base_price = $7, warehouse_ids = $8`,
        [p.id, p.name, p.description, p.brandId, p.category, p.gender, p.basePrice, whIds]
      );
    }

    // 3. Seed Variants
    for (const v of mockData.variants) {
      await client.query(
        `INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET product_id = $2, size = $3, color = $4, sku = $5, current_stock = $6, barcode = $7, price = $8`,
        [v.id, v.productId, v.size, v.color, v.sku, v.currentStock, v.barcode, v.price]
      );
    }

    // 4. Seed Warehouses
    for (const w of mockData.warehouses) {
      await client.query(
        `INSERT INTO warehouses (id, name, code, location, capacity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = $2, code = $3, location = $4, capacity = $5`,
        [w.id, w.name, w.code, w.location, w.capacity]
      );
    }

    // 5. Seed Suppliers
    for (const s of mockData.suppliers) {
      await client.query(
        `INSERT INTO suppliers (id, name, contact_person, email, phone, address)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = $2, contact_person = $3, email = $4, phone = $5, address = $6`,
        [s.id, s.name, s.contactPerson, s.email, s.phone, s.address]
      );
    }

    // 6. Seed Users
    for (const u of mockData.users) {
      await client.query(
        `INSERT INTO users (id, name, email, password, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, password = $4, role = $5`,
        [u.id, u.name, u.email, u.password, u.role]
      );
    }

    // 7. Seed Movements
    for (const m of mockData.movements) {
      await client.query(
        `INSERT INTO movements (id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, reason, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.variantId, m.fromWarehouseId, m.toWarehouseId, m.quantity, m.type, m.reason, m.createdBy, m.createdAt]
      );
    }

    // 8. Seed Sales
    for (const s of mockData.sales) {
      await client.query(
        `INSERT INTO sales (id, variant_id, warehouse_id, quantity, selling_price, cost_price, profit, payment_method, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.variantId, (s as any).warehouseId || 'w1', s.quantity, s.sellingPrice, s.costPrice, s.profit, (s as any).paymentMethod || 'cash', s.createdAt]
      );
    }

    // 9. Seed Orders & Order Items
    for (const o of mockData.orders) {
      await client.query(
        `INSERT INTO orders (id, supplier_id, order_number, status, total_cost, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.supplierId, o.orderNumber, o.status, o.totalCost, o.createdAt, o.updatedAt]
      );
    }

    for (const item of mockData.orderItems) {
      await client.query(
        `INSERT INTO order_items (id, order_id, variant_id, quantity, unit_cost)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.orderId, item.variantId, item.quantity, item.unitCost]
      );
    }

    console.log('✅ Database seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding database:', err);
  }
}

