import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import * as userModel from '../models/user.model.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
}

/**
 * Verifica el JWT y recarga el usuario desde la base de datos.
 *
 * La recarga es deliberada: un token sigue siendo criptográficamente válido
 * después de que un administrador suspenda la cuenta, así que el estado
 * autoritativo se lee siempre del almacenamiento (§88.12).
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Token inválido o expirado');
  }

  const user = await userModel.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('La cuenta ya no existe');
  if (user.status !== 'ACTIVO') throw ApiError.forbidden('Tu cuenta está suspendida');

  req.user = user;
  next();
});

/**
 * Igual que `authenticate` pero sin exigir sesión: deja `req.user` a `null`
 * si no hay token válido. Se usa en rutas públicas que enriquecen la
 * respuesta cuando el visitante sí tiene sesión (p. ej. marcar favoritos).
 */
export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  req.user = null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const user = await userModel.findById(payload.sub);
    if (user && user.status === 'ACTIVO') req.user = user;
  } catch {
    // Un token inválido en una ruta pública simplemente equivale a visitante.
  }
  next();
});
