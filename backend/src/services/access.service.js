import { ApiError } from '../utils/api-error.js';
import * as shelterModel from '../models/shelter.model.js';

/**
 * Reglas de acceso compartidas por varios servicios.
 *
 * Están aquí y no en los controladores porque §88.10 exige que los permisos
 * se comprueben siempre en el backend, y porque varias rutas distintas
 * necesitan exactamente la misma comprobación.
 */

export const isAdmin = (user) => user?.role === 'ADMINISTRADOR';

/** Refugio del usuario, o `null` si no tiene ninguno registrado. */
export async function getOwnShelter(user) {
  if (user?.role !== 'REFUGIO') return null;
  return (await shelterModel.findByOwner(user.id)) ?? null;
}

/**
 * Refugio del usuario exigiendo que exista y esté operativo.
 *
 * - Sin refugio registrado -> 409, con el mensaje que guía al siguiente paso.
 * - PENDIENTE  -> 403 hasta que un administrador lo verifique (§41).
 * - SUSPENDIDO -> 403 (§41, §88.13).
 */
export async function requireOperationalShelter(user) {
  const shelter = await getOwnShelter(user);
  if (!shelter) {
    throw ApiError.conflict('Primero debes registrar el perfil de tu refugio');
  }
  if (shelter.status === 'PENDIENTE') {
    throw ApiError.forbidden('Tu refugio aún está pendiente de verificación');
  }
  if (shelter.status === 'SUSPENDIDO') {
    throw ApiError.forbidden('Tu refugio está suspendido y no puede gestionar publicaciones');
  }
  return shelter;
}

/**
 * Comprueba que `user` puede administrar el recurso de `shelterId`.
 * El administrador siempre puede; el refugio, sólo lo suyo (§88.3).
 */
export async function assertCanManageShelterResource(user, shelterId, message) {
  if (isAdmin(user)) return null;
  const shelter = await requireOperationalShelter(user);
  if (Number(shelter.id) !== Number(shelterId)) {
    throw ApiError.forbidden(message ?? 'Solo puedes administrar los recursos de tu refugio');
  }
  return shelter;
}

/**
 * Alcance de lectura para los listados: qué subconjunto de datos ve cada rol.
 * Los modelos lo traducen a la cláusula WHERE correspondiente.
 */
export async function resolveScope(user) {
  if (isAdmin(user)) return { role: 'ADMINISTRADOR' };
  if (user.role === 'REFUGIO') {
    const shelter = await getOwnShelter(user);
    return { role: 'REFUGIO', userId: user.id, shelterId: shelter?.id ?? null };
  }
  return { role: 'ADOPTANTE', userId: user.id };
}
