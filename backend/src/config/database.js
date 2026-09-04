import pg from 'pg';
import { env } from './env.js';

const { Pool, types } = pg;

// node-postgres devuelve NUMERIC y BIGINT como texto para no perder precisión.
// En este dominio los valores caben de sobra en un Number, así que los
// convertimos aquí y evitamos parseos dispersos por toda la aplicación.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));
// DATE sin hora: lo dejamos como 'YYYY-MM-DD' para que el JSON sea estable
// independientemente de la zona horaria del servidor.
types.setTypeParser(types.builtins.DATE, (value) => value);

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      // Los proveedores gestionados (Render, Railway, Neon) exigen TLS pero
      // usan certificados que Node no tiene en su almacén por defecto.
      ssl: /localhost|127\.0\.0\.1/.test(env.databaseUrl) ? false : { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_MAX) || 10
    })
  : null;

/** `true` cuando la aplicación persiste en PostgreSQL. */
export const isPostgres = pool !== null;

export async function query(text, params = []) {
  if (!pool) throw new Error('DATABASE_URL no está configurada');
  return pool.query(text, params);
}

/** Devuelve la primera fila o `undefined`. */
export async function queryOne(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0];
}

/**
 * Ejecuta `fn` dentro de una transacción y hace rollback ante cualquier error.
 * `fn` recibe el cliente dedicado: todas sus consultas comparten transacción.
 */
export async function transaction(fn) {
  if (!pool) throw new Error('DATABASE_URL no está configurada');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) await pool.end();
}

/**
 * Comprueba que la base de datos responde.
 *
 * Se llama al arrancar: si `DATABASE_URL` apunta a un servidor que no existe
 * —lo típico al copiar el proyecto a otro equipo, porque el `.env` viaja con
 * la carpeta— más vale decirlo en ese momento que dejar que cada petición
 * falle con un error genérico.
 */
export async function checkConnection() {
  if (!isPostgres) return { ok: true, mode: 'memoria' };
  try {
    const row = await queryOne('SELECT current_database() AS db');
    return { ok: true, mode: 'postgresql', database: row.db };
  } catch (error) {
    return { ok: false, mode: 'postgresql', error };
  }
}
