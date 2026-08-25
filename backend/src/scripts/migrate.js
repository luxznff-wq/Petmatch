import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

/**
 * Ejecutor de migraciones.
 *
 * Aplica en orden los archivos de `database/migrations` que aún no se hayan
 * ejecutado, registrándolos en `schema_migrations`. Es idempotente: volver a
 * lanzarlo sobre una base ya migrada no hace nada.
 *
 * Cada archivo corre dentro de su propia transacción, así que una migración
 * que falla no deja el esquema a medias.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '../../../database/migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(200) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function runMigrations({ silent = false } = {}) {
  if (!pool) throw new Error('Configura DATABASE_URL antes de ejecutar las migraciones');

  const log = (message) => {
    if (!silent) console.log(message);
  };

  const client = await pool.connect();
  const applied = [];

  try {
    await ensureMigrationsTable(client);

    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const done = new Set(rows.map((row) => row.filename));

    for (const file of files) {
      if (done.has(file)) {
        log(`· ${file} (ya aplicada)`);
        continue;
      }

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
        log(`✔ ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falló la migración ${file}: ${error.message}`, { cause: error });
      }
    }

    log(
      applied.length > 0
        ? `\nEsquema actualizado (${applied.length} migración/es aplicada/s).`
        : '\nLa base de datos ya estaba al día.'
    );
    return applied;
  } finally {
    client.release();
  }
}

// Ejecución directa: `npm run db:migrate`.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    await runMigrations();
    await pool.end();
  } catch (error) {
    console.error(error.message);
    await pool?.end();
    process.exit(1);
  }
}
