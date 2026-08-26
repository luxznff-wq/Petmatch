import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Límites de peticiones por IP (§73).
 *
 * Tres niveles, de más permisivo a más estricto:
 *
 * 1. Lectura general: evita el raspado masivo del catálogo sin estorbar a un
 *    usuario normal, que genera unas pocas decenas de peticiones por minuto.
 * 2. Escrituras: crear, editar y borrar cuesta más y se abusa más rápido.
 * 3. Autenticación y solicitudes de adopción: los dos puntos donde un script
 *    hace más daño (fuerza bruta y spam a los refugios).
 *
 * En las pruebas los topes se elevan para no falsear los resultados: lo que
 * se está verificando ahí son las reglas de negocio, no el límite.
 */
/**
 * Almacén compartido entre instancias.
 *
 * Sin él, cada proceso lleva su propia cuenta: con dos instancias detrás de
 * un balanceador, el límite real es el doble del configurado. Se carga de
 * forma perezosa para que Redis siga siendo una dependencia opcional.
 */
let sharedStore = null;

if (env.redisUrl && !env.isTest) {
  try {
    const { default: RedisStore } = await import('rate-limit-redis');
    const { createClient } = await import('redis');

    const client = createClient({ url: env.redisUrl });
    client.on('error', (error) => console.error('[PetMatch] Redis:', error.message));
    await client.connect();

    sharedStore = () => new RedisStore({ sendCommand: (...args) => client.sendCommand(args) });
    console.log('Límites de peticiones compartidos mediante Redis.');
  } catch (error) {
    console.error(
      '[PetMatch] No se pudo conectar con Redis, se usará el contador local:',
      error.message
    );
  }
} else if (env.isProduction) {
  console.warn(
    '[PetMatch] REDIS_URL no está configurada: los límites de peticiones ' +
      'sólo cuentan por instancia y dejan de ser fiables si escalas a más de una.'
  );
}

const build = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 100_000 : limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Cada limitador necesita su propia instancia del almacén para no
    // mezclar contadores de distintas políticas bajo la misma clave.
    store: sharedStore ? sharedStore() : undefined,
    message: { success: false, message }
  });

const MINUTE = 60 * 1000;

/** Todas las peticiones a la API. */
export const generalLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 1000,
  message: 'Estás haciendo demasiadas peticiones. Espera un momento e inténtalo de nuevo.'
});

/** Operaciones que modifican datos (POST, PUT, PATCH, DELETE). */
export const writeLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 200,
  message: 'Demasiadas operaciones seguidas. Espera un momento e inténtalo de nuevo.'
});

/** Registro e inicio de sesión: freno a la fuerza bruta. */
export const authLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 30,
  message: 'Demasiados intentos. Inténtalo nuevamente más tarde.'
});

/**
 * Envío de solicitudes de adopción.
 *
 * La regla de negocio impide duplicar solicitudes sobre la MISMA mascota
 * (§35.5), pero nada impedía que un script solicitara todas las mascotas del
 * sistema y llenara de ruido las bandejas de los refugios.
 */
export const adoptionRequestLimiter = build({
  windowMs: 60 * MINUTE,
  limit: 20,
  message: 'Has enviado muchas solicitudes en poco tiempo. Inténtalo de nuevo más tarde.'
});

/** Aplica `writeLimiter` sólo a los métodos que modifican datos. */
export const limitWrites = (req, res, next) =>
  req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
    ? next()
    : writeLimiter(req, res, next);
