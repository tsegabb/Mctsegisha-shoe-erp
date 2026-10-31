import { query, type Queryable } from '../config/db.ts';
import type { AuthUser } from '../types/auth.types.ts';

/** Append-only audit trail. `details` is jsonb: stringify on write, node-pg returns objects on read. */
export async function audit(db: Queryable, action: string, details: Record<string, unknown>, actor?: Pick<AuthUser, 'id' | 'name'> | null) {
  await query(
    'INSERT INTO audit_logs (action, details, created_by) VALUES ($1, $2::jsonb, $3)',
    [action, JSON.stringify({ ...details, actorId: actor?.id ?? null }), actor?.name ?? 'System'],
    db,
  );
}

export async function listAuditLogs(limit = 100) {
  const { rows } = await query('SELECT id, action, details, created_by, created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1', [Math.min(limit, 500)]);
  return rows.map((r) => ({ id: r.id, action: r.action, details: r.details, createdBy: r.created_by, createdAt: r.created_at }));
}
