import { isPostgres, query, queryOne } from '../config/database.js';
import { QueryBuilder } from '../utils/sql.js';
import {
  cascadeDeleteUser,
  clone,
  includesText,
  sameId,
  sequences,
  store
} from './memory-store.js';

const SELECT_USER = `
  SELECT u.*, r.name AS role
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

const map = (row) =>
  row && {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    passwordHash: row.password_hash,
    phone: row.phone,
    address: row.address,
    city: row.city,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.email_verified_at ?? null,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    privacyAcceptedAt: row.privacy_accepted_at ?? null,
    legalVersion: row.legal_version ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

export async function findById(id) {
  if (!isPostgres) return clone(store.users.find((user) => sameId(user.id, id)));
  return map(await queryOne(`${SELECT_USER} WHERE u.id = $1`, [Number(id) || 0]));
}

export async function findByEmail(email) {
  const normalized = String(email).toLowerCase();
  if (!isPostgres) {
    return clone(store.users.find((user) => user.email === normalized));
  }
  return map(await queryOne(`${SELECT_USER} WHERE u.email = $1`, [normalized]));
}

export async function create(data, passwordHash) {
  const acceptedAt = new Date().toISOString();

  if (!isPostgres) {
    const user = {
      id: sequences.users.next(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      avatarUrl: null,
      role: data.role,
      status: 'ACTIVO',
      emailVerifiedAt: null,
      // Aceptación de los documentos legales en el momento del registro.
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt,
      legalVersion: data.legalVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.users.push(user);
    return clone(user);
  }

  const row = await queryOne(
    `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, address, city,
                        terms_accepted_at, privacy_accepted_at, legal_version)
     VALUES ((SELECT id FROM roles WHERE name = $1), $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)
     RETURNING id`,
    [
      data.role,
      data.firstName,
      data.lastName,
      data.email,
      passwordHash,
      data.phone ?? null,
      data.address ?? null,
      data.city ?? null,
      acceptedAt,
      data.legalVersion
    ]
  );
  return findById(row.id);
}

export async function markEmailVerified(id) {
  if (!isPostgres) {
    const user = store.users.find((item) => sameId(item.id, id));
    if (!user) return null;
    user.emailVerifiedAt ??= new Date().toISOString();
    return clone(user);
  }
  const row = await queryOne(
    'UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1 RETURNING id',
    [Number(id) || 0]
  );
  return row ? findById(row.id) : null;
}

export async function update(id, data) {
  if (!isPostgres) {
    const user = store.users.find((item) => sameId(item.id, id));
    if (!user) return null;
    Object.assign(user, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      avatarUrl: data.avatarUrl ?? user.avatarUrl,
      updatedAt: new Date().toISOString()
    });
    return clone(user);
  }

  await query(
    `UPDATE users
        SET first_name = $2, last_name = $3, phone = $4, address = $5, city = $6,
            avatar_url = COALESCE($7, avatar_url)
      WHERE id = $1`,
    [
      Number(id),
      data.firstName,
      data.lastName,
      data.phone ?? null,
      data.address ?? null,
      data.city ?? null,
      data.avatarUrl ?? null
    ]
  );
  return findById(id);
}

export async function updatePassword(id, passwordHash) {
  if (!isPostgres) {
    const user = store.users.find((item) => sameId(item.id, id));
    if (!user) return false;
    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    return true;
  }
  const result = await query('UPDATE users SET password_hash = $2 WHERE id = $1', [
    Number(id) || 0,
    passwordHash
  ]);
  return result.rowCount > 0;
}

export async function setStatus(id, status) {
  if (!isPostgres) {
    const user = store.users.find((item) => sameId(item.id, id));
    if (!user) return null;
    user.status = status;
    user.updatedAt = new Date().toISOString();
    return clone(user);
  }
  const row = await queryOne('UPDATE users SET status = $2 WHERE id = $1 RETURNING id', [
    Number(id) || 0,
    status
  ]);
  return row ? findById(row.id) : null;
}

export async function remove(id) {
  if (!isPostgres) {
    if (!store.users.some((item) => sameId(item.id, id))) return false;
    // Replica el ON DELETE CASCADE del esquema para que ambos motores dejen
    // el almacén en el mismo estado.
    cascadeDeleteUser(id);
    return true;
  }
  const result = await query('DELETE FROM users WHERE id = $1', [Number(id) || 0]);
  return result.rowCount > 0;
}

export async function list(filters, pagination) {
  const { search, role, status } = filters;

  if (!isPostgres) {
    const matches = store.users
      .filter((user) => !role || user.role === role)
      .filter((user) => !status || user.status === status)
      .filter(
        (user) =>
          !search ||
          includesText(`${user.firstName} ${user.lastName} ${user.email}`, search)
      )
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const offset = (pagination.page - 1) * pagination.limit;
    return {
      data: clone(matches.slice(offset, offset + pagination.limit)),
      total: matches.length
    };
  }

  const builder = new QueryBuilder();
  if (search) {
    builder.where(
      '(u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.email ILIKE ?)',
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }
  builder.whereIfPresent('r.name = ?', role);
  builder.whereIfPresent('u.status = ?', status);

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total FROM users u JOIN roles r ON r.id = u.role_id WHERE ${builder.clause}`,
    builder.values
  );
  const limitParam = builder.push(pagination.limit);
  const offsetParam = builder.push((pagination.page - 1) * pagination.limit);
  const { rows } = await query(
    `${SELECT_USER} WHERE ${builder.clause} ORDER BY u.created_at DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
    builder.values
  );

  return { data: rows.map(map), total: countRows[0].total };
}

export async function countAll() {
  if (!isPostgres) return store.users.length;
  const row = await queryOne('SELECT count(*)::int AS total FROM users');
  return row.total;
}
