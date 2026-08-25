import { app } from './app.js';
import { env } from './config/env.js';
import { closePool, isPostgres } from './config/database.js';
import { seedMemoryIfEmpty } from './scripts/seed.js';

// Sin DATABASE_URL la API funciona en memoria; se precarga el catálogo de
// demostración para que la aplicación sea usable desde el primer arranque.
if (await seedMemoryIfEmpty()) {
  console.log('Modo memoria: catálogo de demostración cargado.');
}

const server = app.listen(env.port, () => {
  console.log(`PetMatch API escuchando en http://localhost:${env.port}/api`);
  console.log(`Documentación Swagger en http://localhost:${env.port}/api/docs`);
  console.log(`Persistencia: ${isPostgres ? 'PostgreSQL' : 'memoria (sin DATABASE_URL)'}`);
});

/** Cierre ordenado: deja de aceptar conexiones y libera el pool. */
async function shutdown(signal) {
  console.log(`\n${signal} recibido, cerrando PetMatch...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
