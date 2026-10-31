-- Required by the rewritten backend.
-- v2 ties users/cash/receipts to `shops` but stock/sales to `warehouses`, with no link between them,
-- so "a cashier may only see their own branch" cannot be enforced. This adds the missing link.
BEGIN;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES shops (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS warehouses_shop_id_idx ON warehouses (shop_id) WHERE shop_id IS NOT NULL;
COMMIT;

-- After running it, assign each warehouse to its shop, e.g.:
--   UPDATE warehouses SET shop_id = '<shop uuid>' WHERE code = 'WH-MAIN';

-- OPTIONAL: default categories (the old code seeded these on the first GET /categories).
-- INSERT INTO categories (name, description) VALUES
--   ('Sneakers','Everyday lifestyle and casual sneakers'), ('Running Shoes','Performance and trail running shoes'),
--   ('Formal Shoes','Dress shoes, Oxfords, and leather formals'), ('Boots','Leather boots, Chelsea boots, and work boots'),
--   ('Sandals & Slides','Casual slides, clogs, and sandals'), ('Loafers','Comfort slip-on loafers')
-- ON CONFLICT (name) DO NOTHING;

-- OPTIONAL: keep Telebirr / CBE Birr distinguishable in reports (the v2 CHECKs only allow generic methods).
-- ALTER TABLE sales DROP CONSTRAINT sales_payment_method_check;
-- ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check CHECK (payment_method IN
--   ('cash','card','mobile_money','bank_transfer','credit','other','telebirr','cbe_birr'));
-- (repeat for cash_activities.method, then add the two values to PAYMENT_METHODS in src/constants/domain.ts)
