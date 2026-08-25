import { ApiError } from '../utils/api-error.js';

const formatIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(raíz)',
    message: issue.message
  }));

/** Valida y reemplaza `req.body` con el resultado tipado del esquema. */
export const validateBody = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return next(ApiError.unprocessable('Datos inválidos', formatIssues(parsed.error)));
  }
  req.body = parsed.data;
  next();
};

/**
 * Valida la query string. En Express 5 `req.query` es un getter sin setter,
 * por eso el resultado se expone en `req.validatedQuery`.
 */
export const validateQuery = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return next(ApiError.unprocessable('Parámetros de consulta inválidos', formatIssues(parsed.error)));
  }
  req.validatedQuery = parsed.data;
  next();
};

/** Valida parámetros de ruta (`:id`) y normaliza sus tipos. */
export const validateParams = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.params ?? {});
  if (!parsed.success) {
    return next(ApiError.notFound('El recurso solicitado no existe'));
  }
  req.validatedParams = parsed.data;
  next();
};
