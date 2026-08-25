import { ApiError } from '../utils/api-error.js';

export const ROLES = Object.freeze({
  ADOPTANTE: 'ADOPTANTE',
  REFUGIO: 'REFUGIO',
  ADMINISTRADOR: 'ADMINISTRADOR'
});

/**
 * Restringe una ruta a los roles indicados (§88.10: los permisos se
 * comprueban siempre en el backend).
 */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
