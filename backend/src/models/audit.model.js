import { isPostgres, query } from '../config/database.js';
import { QueryBuilder } from '../utils/sql.js';
import { clone, sameId, sequences, store } from './memory-store.js';

const map = (row) =>
  row && {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };

/**
 * Registra una acción administrativa (§52, §88.9).
 *
 * Guarda también el correo del actor: si la cuenta se elimina, la evidencia
 * de quién hizo qué debe seguir siendo legible.
 */
export async function record({ user, action, entityType = null, entityId = null, metadata = {} }) {
  if (!isPostgres) {
    const entry = {
      id: sequences.auditLogs.next(),
      userId: user ? Number(user.id) : null,
      userEmail: user?.email ?? null,
      action,
      entityType,
      entityId: entityId == null ? null : Number(entityId),
      metadata,
      createdAt: new Date().toISOString()
    };
    store.auditLogs.push(entry);
    return clone(entry);
  }

  const { rows } = await query(
    `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      user ? Number(user.id) : null,
      user?.email ?? null,
      action,
      entityType,
      entityId == null ? null : Number(entityId),
      JSON.stringify(metadata ?? {})
    ]
  );
  return map(rows[0]);
}

export async function list({ entityType, userId } = {}, pagination) {
  if (!isPostgres) {
    const matched = store.auditLogs
      .filter((entry) => !entityType || entry.entityType === entityType)
      .filter((entry) => !userId || sameId(entry.userId, userId))
      .sort((a, b) => b.id - a.id);

    const offset = (pagination.page - 1) * pagination.limit;
    return {
      data: clone(matched.slice(offset, offset + pagination.limit)),
      total: matched.length
    };
  }

  const builder = new QueryBuilder();
  builder.whereIfPresent('entity_type = ?', entityType);
  builder.whereIfPresent('user_id = ?', userId ? Number(userId) : undefined);

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total FROM audit_logs WHERE ${builder.clause}`,
    builder.values
  );
  const limitParam = builder.push(pagination.limit);
  const offsetParam = builder.push((pagination.page - 1) * pagination.limit);
  const { rows } = await query(
    `SELECT * FROM audit_logs WHERE ${builder.clause}
      ORDER BY created_at DESC, id DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
    builder.values
  );
  return { data: rows.map(map), total: countRows[0].total };
}
