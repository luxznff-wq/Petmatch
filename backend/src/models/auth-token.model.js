import { createHash, randomBytes } from 'node:crypto';
import { isPostgres, query, queryOne } from '../config/database.js';
import { removeWhere, sameId, store } from './memory-store.js';

/**
 * Tokens de un solo uso para verificar el correo y restablecer la contraseña.
 *
 * En el almacenamiento sólo vive el hash SHA-256, nunca el token: quien
 * consiga leer la base de datos no puede suplantar a nadie, igual que ocurre
 * con las contraseñas. El valor en claro se entrega una única vez, por correo.
 */

export const PURPOSES = Object.freeze({
  EMAIL: 'VERIFICACION_EMAIL',
  PASSWORD: 'RECUPERACION_PASSWORD'
});

/** SHA-256 basta: el token ya es aleatorio de 256 bits, no hay que estirarlo. */
const hash = (token) => createHash('sha256').update(token).digest('hex');

const map = (row) =>
  row && {
    id: row.id,
    userId: row.user_id,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    usedAt: row.used_at
  };

/**
 * Crea un token y devuelve el valor en claro.
 * Invalida los anteriores del mismo propósito: pedir un enlace nuevo debe
 * dejar sin efecto el anterior.
 */
export async function issue(userId, purpose, ttlMinutes) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hash(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  if (!isPostgres) {
    store.authTokens
      .filter((item) => sameId(item.userId, userId) && item.purpose === purpose && !item.usedAt)
      .forEach((item) => {
        item.usedAt = new Date().toISOString();
      });

    store.authTokens.push({
      id: store.authTokens.length + 1,
      userId: Number(userId),
      purpose,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString()
    });
    return token;
  }

  await query(
    `UPDATE auth_tokens SET used_at = now()
      WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [Number(userId), purpose]
  );
  await query(
    `INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [Number(userId), purpose, tokenHash, expiresAt]
  );
  return token;
}

/** Busca un token vigente y sin usar. Devuelve `null` si no sirve. */
export async function findUsable(token, purpose) {
  if (!token) return null;
  const tokenHash = hash(token);

  if (!isPostgres) {
    const found = store.authTokens.find(
      (item) => item.tokenHash === tokenHash && item.purpose === purpose
    );
    if (!found || found.usedAt || new Date(found.expiresAt) < new Date()) return null;
    return { ...found };
  }

  return map(
    await queryOne(
      `SELECT * FROM auth_tokens
        WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash, purpose]
    )
  );
}

/** Marca el token como consumido para que no pueda reutilizarse. */
export async function consume(id) {
  if (!isPostgres) {
    const found = store.authTokens.find((item) => sameId(item.id, id));
    if (found) found.usedAt = new Date().toISOString();
    return;
  }
  await query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [Number(id)]);
}

/** Descarta los tokens caducados. Pensado para una tarea de mantenimiento. */
export async function purgeExpired() {
  if (!isPostgres) {
    return removeWhere('authTokens', (item) => new Date(item.expiresAt) < new Date());
  }
  const result = await query('DELETE FROM auth_tokens WHERE expires_at < now()');
  return result.rowCount;
}
