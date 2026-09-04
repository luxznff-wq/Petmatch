import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

/** Cualquier ruta no registrada termina aquí (§71: 404). */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Traduce los errores que `express.json()` lanza antes de llegar a las rutas.
 * Sin esto, un cuerpo malformado se respondería como 500.
 */
function translateBodyParserError(error) {
  if (error.type === 'entity.parse.failed') {
    return ApiError.badRequest('El cuerpo de la petición no es JSON válido');
  }
  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'El cuerpo de la petición es demasiado grande');
  }
  return null;
}

/**
 * Un fallo de conexión no es culpa de quien usa la API: se responde 503 y se
 * dice qué pasa, en lugar del 500 genérico que obliga a adivinar. Fuera de
 * producción se añade la pista concreta, porque el caso habitual —haber
 * copiado el proyecto a otro equipo— se resuelve en un minuto si se sabe.
 */
const CONNECTION_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P03', '3D000', '28P01']);

function translateConnectionError(error) {
  if (!CONNECTION_CODES.has(error.code)) return null;

  const pista = env.isProduction
    ? ''
    : ' Revisa DATABASE_URL en el archivo .env, o quítala para usar el modo memoria.';

  return new ApiError(503, `La base de datos no está disponible.${pista}`);
}

/** Traduce los errores propios de PostgreSQL a errores de negocio. */
function translateDatabaseError(error) {
  switch (error.code) {
    case '23505': // unique_violation
      return ApiError.conflict('El registro ya existe');
    case '23503': // foreign_key_violation
      return ApiError.conflict('El registro está relacionado con otros datos');
    case '23514': // check_violation
      return ApiError.unprocessable('Los datos no cumplen las reglas del sistema');
    case '22P02': // invalid_text_representation
      return ApiError.badRequest('Formato de dato inválido');
    default:
      return null;
  }
}

/**
 * Manejador central de errores (§77, §88). Los errores de negocio conservan su
 * mensaje; cualquier otro se responde como 500 genérico para no filtrar
 * detalles internos (§73: manejo seguro de errores).
 */
export function errorHandler(error, _req, res, _next) {
  const apiError =
    error instanceof ApiError
      ? error
      : translateBodyParserError(error) ??
        translateConnectionError(error) ??
        translateDatabaseError(error);

  if (!apiError) {
    if (!env.isTest) console.error('[PetMatch] Error no controlado:', error);
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error inesperado. Inténtalo nuevamente.'
    });
  }

  const body = { success: false, message: apiError.message };
  if (apiError.details) body.errors = apiError.details;
  return res.status(apiError.status).json(body);
}
