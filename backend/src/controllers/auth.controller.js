import { asyncHandler } from '../utils/async-handler.js';
import { created, ok } from '../utils/http.js';
import * as authService from '../services/auth.service.js';
import * as access from '../services/access.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ok(res, result);
});

/**
 * Con JWT sin estado el cierre de sesión ocurre en el cliente al descartar el
 * token; el endpoint existe para completar el contrato de la API (§55) y para
 * que el frontend tenga un único punto de salida.
 */
export const logout = asyncHandler(async (_req, res) => ok(res, { loggedOut: true }));

export const me = asyncHandler(async (req, res) => {
  const user = authService.toPublicUser(req.user);
  // El refugio necesita saber si ya tiene perfil y si está verificado para
  // decidir qué panel mostrar nada más iniciar sesión.
  const shelter = await access.getOwnShelter(req.user);
  return ok(res, { ...user, shelter });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user, req.body);
  return ok(res, { updated: true });
});
