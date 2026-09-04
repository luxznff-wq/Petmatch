import { app } from './app.js';
import { env } from './config/env.js';
import { checkConnection, closePool, isPostgres } from './config/database.js';
import { seedMemoryIfEmpty } from './scripts/seed.js';

/**
 * Explica un fallo de conexión en términos de lo que hay que hacer.
 *
 * El caso más común, con diferencia, es haber copiado el proyecto a otro
 * equipo: el `.env` viaja con la carpeta y sigue apuntando a una base de
 * datos que allí no existe.
 */
function explainConnectionFailure(error) {
  const url = env.databaseUrl ?? '';
  const causas = {
    ECONNREFUSED:
      'No hay ningún PostgreSQL escuchando en esa dirección.\n' +
      '   · Si acabas de copiar el proyecto desde otro equipo, el archivo .env\n' +
      '     vino con él y apunta a una base que aquí no existe.\n' +
      '   · Arranca PostgreSQL, o borra la línea DATABASE_URL del .env para\n' +
      '     usar el modo memoria (no necesita instalar nada).',
    ENOTFOUND: 'No se pudo resolver el servidor indicado en DATABASE_URL.',
    '28P01': 'El usuario o la contraseña de DATABASE_URL no son correctos.',
    '3D000':
      'El servidor responde, pero esa base de datos no existe.\n' +
      '   · Créala con: createdb petmatch\n' +
      '   · Y después: npm run db:migrate && npm run db:seed'
  };

  const causa =
    causas[error.code] ?? `${error.message}\n   · Revisa DATABASE_URL en el archivo .env.`;

  console.error(
    `\n${'─'.repeat(68)}\n` +
      ` No se pudo conectar con la base de datos\n\n` +
      ` DATABASE_URL: ${url.replace(/:[^:@/]*@/, ':****@')}\n\n` +
      ` ${causa}\n` +
      `${'─'.repeat(68)}\n`
  );
}

// Sin DATABASE_URL la API funciona en memoria; se precarga el catálogo de
// demostración para que la aplicación sea usable desde el primer arranque.
if (await seedMemoryIfEmpty()) {
  console.log('Modo memoria: catálogo de demostración cargado.');
}

// Se comprueba la conexión ANTES de anunciar nada: decir "Persistencia:
// PostgreSQL" sin haberlo verificado deja al usuario buscando el fallo en el
// sitio equivocado cuando después cada petición devuelve un error genérico.
const conexion = await checkConnection();
if (!conexion.ok) {
  explainConnectionFailure(conexion.error);
  // En producción no se arranca a medias: es preferible fallar de inmediato.
  if (env.isProduction) process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`PetMatch API escuchando en http://localhost:${env.port}/api`);
  console.log(`Documentación Swagger en http://localhost:${env.port}/api/docs`);

  if (!isPostgres) {
    console.log('Persistencia: memoria (sin DATABASE_URL)');
  } else if (conexion.ok) {
    console.log(`Persistencia: PostgreSQL · base "${conexion.database}"`);
  } else {
    console.log('Persistencia: PostgreSQL — SIN CONEXIÓN (ver el aviso de arriba)');
  }
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
