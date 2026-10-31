# Backend audit & v2 migration notes

Everything here was verified against your `neon_schema_v2_full.sql` loaded into a real PostgreSQL 16
(59-step end-to-end test: auth, RBAC, branch scoping, sales, returns, transfers, oversell, orders, cash, reports, backup/restore).

## 1. Critical findings in the code you sent (fixed)

| # | Finding | Where | Fix |
|---|---|---|---|
| 1 | **Authentication was a header anyone can forge.** `x-user-id: <any user id>` = logged in as that user. No JWT existed. | `auth.middleware.ts`, `auth.controller.me` | HS256 JWT (algorithm pinned, issuer/audience checked), user re-loaded from DB each request so deactivation/role changes apply instantly |
| 2 | **Passwords stored and compared in plaintext** in SQL (`u.password = $2`); default password `user123`; seed users `owner123`/`sales123` | `auth.service.ts`, `seed.ts` | bcrypt (cost 12), constant-time login, no default password, password policy from settings, `scripts/hash-legacy-passwords.ts` |
| 3 | **Startup DDL would destroy your v2 schema**: `initializeDatabase()` ran `CREATE TABLE IF NOT EXISTS` with old types, **dropped every foreign key**, and converted every uuid column to `varchar` | `config/db.ts` | removed. Runtime DDL is gone; startup only *checks* that the v2 objects exist and refuses to boot otherwise |
| 4 | **Telegram bot token committed** in `notifications.ts` defaults *and* `data/notification_settings.json` (plus your personal email) | `notifications.ts` | removed from code; secrets come from env vars and are masked in every API response. **Revoke the token in @BotFather (`/revoke`) now and purge it from git history** |
| 5 | `POST /api/status/reconnect` and `/api/status` were unauthenticated and leaked the DB URL (masked), error text, and let anyone trigger reconnects | `routes/index.ts` | replaced by a bare `/health` |
| 6 | `/products`, `/brands`, `/categories`, `/products/master-catalog` were public, and `getProducts` read `req.user` on a route with no auth middleware, so **branch restrictions never applied** | `products.routes.ts` | all routes authenticated, scoping enforced in the service layer |
| 7 | Restore backup: filename went straight into `path.join` (**path traversal**), column names from the JSON file were concatenated into SQL (**SQL injection**), `TRUNCATE … CASCADE` | `settings.service.ts`, `settings_store.ts` | strict filename regex, owner-only + typed confirmation, safety backup first, columns read from the catalog, `jsonb_populate_recordset`, single transaction (tested) |
| 8 | Client-controlled money: `costPrice`, `sellingPrice`, `totalReturnAmount`, `createdBy`, `userName` all trusted from the request body → profit inflation, refund fraud, audit spoofing | sales/cash/movements | cost comes from the product; only managers may override; discount floor from settings; refund computed server-side in integer cents; actor name always from the session |
| 9 | Silent data invention: unknown variant/supplier ids were **auto-created or swapped for a random existing row**; `processReturn` without `saleId` returned success and did nothing; stock `UPDATE … SET current_stock` after `SELECT … FOR UPDATE` on a different table | sales/inventory services | 404/422 errors instead; stock changes only via `adjust_stock()` in the same transaction as the movement row |
| 10 | Dangerous server defaults: `PORT = 3000` hard-coded (Render injects `PORT`), `cors()` wide open, no helmet, no rate limiting, `.env.example` was read as a fallback source of `DATABASE_URL`, `rejectUnauthorized:false` TLS | `server.ts`, `env.ts`, `db.ts` | env-validated config (fails fast), helmet, CORS allow-list, login limiter (10 / 15 min) + global limiter, proper TLS verification, graceful shutdown |
| 11 | `/settings/general` returned `chapaSecretKey` and Telegram token to **any** logged-in user; `saveGeneralSettings` merged arbitrary keys | settings | secrets masked; keys whitelisted per section by type; sensitive sections admin-only |
| 12 | Stored XSS / HTML injection: product names were interpolated unescaped into the alert e-mail and Telegram HTML | `notifications.ts` | escaped |
| 13 | Role check lowercased and **always let `admin` through**, but roles were free text (`'Sales Staff'`) | `roleGuard` | roles are the DB enum; `requireExactRole('owner')` for destructive actions |
| 14 | `warehouse_ids` stored as a comma-separated string and matched with `LIKE '%id%'` | products | gone; availability derives from `warehouse_stock` |
| 15 | Dead/duplicate code: two `db.ts` files (one imports from `../../frontend`), in-memory "demo mode" mirroring every query (~40 % of the code, and the source of the silent-fallback bugs), mock data, `generateSku` using `Math.random()`, pharmacy leftovers (`genericName/strength`) | everywhere | demo mode removed. Delete `backend/db/`, `src/db/`, `src/config` old files, `data/notification_settings.json` |

## 2. Schema alignment (what you asked for)

* `variants.current_stock` → `variants_with_stock` view (or a scoped equivalent when a branch filter applies). One helper, `variantStockSource()`, in `utils/sql.ts`.
* Every stock change → `SELECT adjust_stock($1,$2,$3)` inside the caller's transaction (`stock.service.ts › adjustStock`). SQLSTATE `23514` → **409 "Insufficient stock"**. Transfers lock in deterministic warehouse order; deadlocks are retried.
* `warehouse_stock` has no `id`; the only writer is `adjust_stock()` (which does the `ON CONFLICT (warehouse_id, variant_id)` upsert for you).
* Products use `category_id` (+ joined `category` name in responses; legacy `category` *name* still accepted on write). `selling_price`, `barcode`, `warehouse_ids` removed from product code.
* `image_urls` / `audit_logs.details` written with `JSON.stringify(...)::jsonb`, read natively. Audit rows are now written for users, prices, stock, orders, cash, backups, settings.
* `sales.profit` is **never** written. Reports read it / derive net-of-returns profit.
* All enums are lowercase_snake_case on the way to the DB. Legacy spellings (`Sales Staff`, `incoming`, `Telebirr`, `Unisex`) are accepted on input and normalised.

## 3. Things you must do / decide

1. **Run `db/migrations/001_link_warehouses_to_shops.sql`** and set `warehouses.shop_id`. v2 links users/cash/receipts to `shops` and stock/sales to `warehouses` with nothing connecting them, so "a cashier sees only their branch" was impossible to enforce. The server refuses to start without this column.
2. **Hash existing passwords**: `npx tsx backend/scripts/hash-legacy-passwords.ts` (or create users with `scripts/create-user.ts`).
3. Set the env vars in `.env.example` on Render (`JWT_SECRET` ≥ 32 chars is mandatory). Use the `app_rw` role from the schema file for `DATABASE_URL`.
4. Telebirr vs CBE Birr: the v2 CHECK only allows `mobile_money` / `bank_transfer`. They are mapped (Telebirr→mobile_money, CBE→bank_transfer) so the legacy report keys still fill, but the distinction is lost. The migration file has an optional block to widen the CHECK.
5. Render's disk is ephemeral: `backend/data/*.json` (settings, backups, e-mail log) is wiped on every deploy. Move settings into a table and rely on Neon branching / `pg_dump` for real backups.

## 4. Frontend contract changes

* Send `Authorization: Bearer <token>` (login returns `{ token, user, permissions }`); stop sending `x-user-id`. Role names are now `owner|admin|manager|cashier|staff|warehouse`.
* Variant `PUT` no longer accepts `currentStock` – use `POST /movements`. `adjustment` quantity is **signed** (the old code guessed direction from words in `reason`).
* `POST /movements` / `/sales` / `/cash/*` ignore `createdBy` / `userName` from the body.
* `POST /sales`: single-item body still works; `items: [...]` is supported and creates one receipt (`receiptNumber` returned). `warehouseId` optional (best-stocked in-scope warehouse is used).
* `POST /sales/return`: `saleId` required; `totalReturnQty/Amount` still accepted as aliases.
* `PUT /orders/:id/status` accepts all 8 DB statuses; `received` needs `warehouseId` (or a warehouse coded `WH-MAIN`).
* Responses are camelCase everywhere (warehouses/suppliers used to be raw snake_case rows on Postgres). Cash `type`/`method` are snake_case; `typeLabel`/`methodLabel` carry display text.
* Cash register: now computed for the *current business day* (Africa/Addis_Ababa), starting from today's `opening` entry (no hard-coded 5,000 default; old code subtracted all-time drops from today's sales). Revenue/profit in reports are net of returns.
* New: `POST /auth/change-password`, `POST /users/:id/reset-password`, users can be deactivated (`isActive`); deleting a user with receipts returns 409.
* List endpoints return a plain array (capped at 1000) unless `page`/`limit` is sent, then the `{data,total,page,limit,totalPages}` envelope – same as before.

## 5. Known limits

* No token revocation list (tokens die at `JWT_EXPIRES_IN`; deactivating the user cuts them off immediately anyway). No refresh tokens.
* `partially_received` orders are a label only: `order_items` has no received-quantity column, so stock is posted once, on `received`.
* No idempotency key on `POST /sales` (a retried request double-sells).
* Settings JSON files and the e-mail log are not multi-instance safe.
