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
const build = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 100_000 : limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
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
