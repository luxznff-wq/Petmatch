import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { signToken } from '../middleware/authenticate.js';
import * as userModel from '../models/user.model.js';

/**
 * Hash válido pero inalcanzable, usado sólo para igualar el coste del login
 * cuando el correo no existe. No corresponde a ninguna contraseña utilizable.
 */
const TIMING_GUARD_HASH = '$2b$04$714GUoh/nZpXbiar2xo/zeAuo3.3hR13d2zttTghCBM62F0scbOhu';

/** Proyección pública del usuario: nunca incluye el hash de la contraseña. */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function register(input) {
  const existing = await userModel.findByEmail(input.email);
  if (existing) throw ApiError.conflict('El correo ya está registrado');

  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const user = await userModel.create(input, passwordHash);
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await userModel.findByEmail(email);

  // Se compara siempre contra un hash — aunque el usuario no exista — para no
  // revelar por tiempo de respuesta qué correos están registrados.
  const matches = await bcrypt.compare(password, user?.passwordHash ?? TIMING_GUARD_HASH);

  if (!user || !matches) {
    throw ApiError.unauthorized('El correo o contraseña son incorrectos');
  }
  if (user.status !== 'ACTIVO') {
    throw ApiError.forbidden('Tu cuenta está suspendida');
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function changePassword(user, { currentPassword, newPassword }) {
  const stored = await userModel.findByEmail(user.email);
  const matches = await bcrypt.compare(currentPassword, stored.passwordHash);
  if (!matches) throw ApiError.unauthorized('La contraseña actual no es correcta');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await userModel.updatePassword(stored.id, passwordHash);
}
