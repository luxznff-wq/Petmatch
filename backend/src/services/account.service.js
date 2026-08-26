import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import * as userModel from '../models/user.model.js';
import * as tokenModel from '../models/auth-token.model.js';
import * as auditModel from '../models/audit.model.js';
import * as favoriteModel from '../models/favorite.model.js';
import * as requestModel from '../models/adoption-request.model.js';
import * as adoptionModel from '../models/adoption.model.js';
import * as notificationModel from '../models/notification.model.js';
import * as interviewModel from '../models/interview.model.js';
import * as shelterModel from '../models/shelter.model.js';
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
} from './mailer.service.js';

/** Caducidad de cada tipo de enlace, en minutos. */
const TTL = { email: 24 * 60, password: 60 };

/* ------------------------------------------------- Verificación de correo */

export async function sendVerification(user) {
  if (user.emailVerifiedAt) {
    throw ApiError.conflict('Tu correo ya está verificado');
  }
  const token = await tokenModel.issue(user.id, tokenModel.PURPOSES.EMAIL, TTL.email);
  await sendVerificationEmail(user, token);
}

export async function verifyEmail(token) {
  const record = await tokenModel.findUsable(token, tokenModel.PURPOSES.EMAIL);
  if (!record) {
    throw ApiError.badRequest('El enlace de verificación no es válido o ya caducó');
  }

  await tokenModel.consume(record.id);
  return userModel.markEmailVerified(record.userId);
}

/* --------------------------------------------- Recuperación de contraseña */

/**
 * Inicia la recuperación.
 *
 * Responde igual exista o no la cuenta: si dijera "ese correo no está
 * registrado", cualquiera podría averiguar qué direcciones tienen cuenta en
 * PetMatch. Quien no la tenga, simplemente no recibirá nada.
 */
export async function requestPasswordReset(email) {
  const user = await userModel.findByEmail(email);
  if (!user || user.status !== 'ACTIVO') return;

  const token = await tokenModel.issue(user.id, tokenModel.PURPOSES.PASSWORD, TTL.password);
  await sendPasswordResetEmail(user, token);
}

export async function resetPassword({ token, newPassword }) {
  const record = await tokenModel.findUsable(token, tokenModel.PURPOSES.PASSWORD);
  if (!record) {
    throw ApiError.badRequest('El enlace para restablecer la contraseña no es válido o ya caducó');
  }

  const user = await userModel.findById(record.userId);
  if (!user) throw ApiError.badRequest('El enlace ya no es válido');
  if (user.status !== 'ACTIVO') throw ApiError.forbidden('Tu cuenta está suspendida');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await userModel.updatePassword(user.id, passwordHash);
  // Consumir el token después de cambiar la contraseña evita que un fallo
  // intermedio lo deje gastado sin haber servido para nada.
  await tokenModel.consume(record.id);

  await sendPasswordChangedEmail(user);
  await auditModel.record({
    user,
    action: 'Restableció su contraseña mediante un enlace de recuperación',
    entityType: 'user',
    entityId: user.id
  });
}

/* --------------------------------------------------- Derechos sobre datos */

/**
 * Copia completa de los datos de la persona (derechos de acceso y
 * portabilidad, Ley 29733). Se compone leyendo los modelos, de modo que
 * cualquier dato nuevo que se guarde acabe también aquí.
 */
export async function exportPersonalData(user) {
  const scope = { role: 'ADOPTANTE', userId: user.id };
  const page = { page: 1, limit: 500 };

  const [favorites, requests, adoptions, notifications, interviews, shelter] = await Promise.all([
    favoriteModel.listPets(user.id),
    requestModel.list({ scope }, page),
    adoptionModel.list({ scope }, page),
    notificationModel.listByUser(user.id, { limit: 500 }),
    interviewModel.listForUser({ role: 'ADOPTANTE', userId: user.id }),
    shelterModel.findByOwner(user.id)
  ]);

  const { passwordHash: _passwordHash, ...profile } = user;

  return {
    generadoEl: new Date().toISOString(),
    aviso:
      'Copia de los datos personales asociados a tu cuenta de PetMatch, entregada ' +
      'conforme a tus derechos de acceso y portabilidad (Ley 29733).',
    perfil: profile,
    refugio: shelter ?? null,
    favoritos: favorites.map((pet) => ({
      id: pet.id,
      nombre: pet.name,
      refugio: pet.shelterName
    })),
    solicitudes: requests.data,
    entrevistas: interviews,
    adopciones: adoptions.data,
    notificaciones: notifications
  };
}

/**
 * Comprueba si una cuenta puede eliminarse.
 *
 * El borrado arrastra en cascada el refugio, sus mascotas y las solicitudes.
 * Con adopciones registradas eso destruiría el historial que exige §38, así
 * que se bloquea y se sugiere la suspensión. La usan tanto el administrador
 * como la baja voluntaria, para que la regla sea una sola.
 */
export async function assertDeletable(user) {
  const scope =
    user.role === 'REFUGIO'
      ? { role: 'REFUGIO', shelterId: (await shelterModel.findByOwner(user.id))?.id ?? -1 }
      : { role: 'ADOPTANTE', userId: user.id };

  const { total } = await adoptionModel.list({ scope }, { page: 1, limit: 1 });
  if (total > 0) {
    throw ApiError.conflict(
      'Esta cuenta tiene adopciones registradas y no puede eliminarse. ' +
        'Suspéndela para bloquear su acceso sin perder el historial.'
    );
  }
}

/**
 * Baja voluntaria (derecho de cancelación).
 *
 * Se exige la contraseña porque la acción es irreversible y arrastra
 * favoritos, solicitudes y notificaciones.
 */
export async function deleteOwnAccount(user, password) {
  const stored = await userModel.findByEmail(user.email);
  const matches = await bcrypt.compare(password, stored.passwordHash);
  if (!matches) throw ApiError.unauthorized('La contraseña no es correcta');

  await assertDeletable(user);

  // Se deja constancia antes de borrar: después, el usuario ya no existe.
  await auditModel.record({
    user,
    action: `Solicitó la baja de su cuenta ${user.email}`,
    entityType: 'user',
    entityId: user.id,
    metadata: { origen: 'baja voluntaria' }
  });
  await userModel.remove(user.id);
}
