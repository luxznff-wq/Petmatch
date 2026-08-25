import { ApiError } from '../utils/api-error.js';
import { resolvePagination } from '../utils/pagination.js';
import * as petModel from '../models/pet.model.js';
import * as petImageModel from '../models/pet-image.model.js';
import * as favoriteModel from '../models/favorite.model.js';
import * as shelterModel from '../models/shelter.model.js';
import * as auditModel from '../models/audit.model.js';
import * as access from './access.service.js';
import { messages, notifyMany } from './notification.service.js';

/** Estados en los que la mascota deja de poder recibir solicitudes (§51). */
const UNAVAILABLE_STATUSES = ['ADOPTADA', 'NO_DISPONIBLE'];

export async function list(query) {
  const pagination = resolvePagination(query);
  const { page: _page, limit: _limit, ...filters } = query;
  const { data, total } = await petModel.list(filters, pagination);
  return { data, total, page: pagination.page, limit: pagination.limit };
}

export async function getById(id) {
  const pet = await petModel.findById(id);
  if (!pet) throw ApiError.notFound('La mascota no existe');
  return { ...pet, images: await petImageModel.listByPet(pet.id) };
}

/** Igual que `getById` pero sin la galería: para comprobaciones internas. */
async function requirePet(id) {
  const pet = await petModel.findById(id);
  if (!pet) throw ApiError.notFound('La mascota no existe');
  return pet;
}

/**
 * Comprueba que el usuario puede administrar esta mascota concreta.
 * Devuelve la mascota para evitar una segunda lectura en quien llama.
 */
async function requireManageablePet(user, petId) {
  const pet = await requirePet(petId);
  await access.assertCanManageShelterResource(
    user,
    pet.shelterId,
    'Solo puedes administrar las mascotas de tu refugio'
  );
  return pet;
}

export async function create(user, input) {
  // El administrador puede publicar en nombre de un refugio indicando
  // `shelterId`; el refugio siempre publica en el suyo.
  let shelterId;
  if (access.isAdmin(user)) {
    if (!input.shelterId) throw ApiError.badRequest('Indica el refugio al que pertenece la mascota');
    const shelter = await shelterModel.findById(input.shelterId);
    if (!shelter) throw ApiError.notFound('El refugio no existe');
    // §88.13: ni siquiera el administrador publica en un refugio suspendido.
    if (shelter.status === 'SUSPENDIDO') {
      throw ApiError.forbidden('El refugio está suspendido y no puede recibir publicaciones');
    }
    shelterId = shelter.id;
  } else {
    shelterId = (await access.requireOperationalShelter(user)).id;
  }

  const pet = await petModel.create(shelterId, input);
  await auditModel.record({
    user,
    action: `Registró la mascota ${pet.name}`,
    entityType: 'pet',
    entityId: pet.id
  });
  return pet;
}

export async function update(user, petId, input) {
  const current = await requireManageablePet(user, petId);
  const updated = await petModel.update(current.id, input);

  if (input.status && input.status !== current.status) {
    await announceStatusChange(updated, current.status);
  }
  await auditModel.record({
    user,
    action: `Actualizó la mascota ${updated.name}`,
    entityType: 'pet',
    entityId: updated.id
  });
  return updated;
}

/**
 * Cambia el estado de una mascota (§21, §22).
 *
 * Sólo refugios y administradores llegan aquí (§88.5). Cuando la mascota deja
 * de estar disponible se avisa a quienes la tenían en favoritos (§51).
 */
export async function setStatus(user, petId, status) {
  const current = await requireManageablePet(user, petId);
  if (current.status === status) return current;

  const updated = await petModel.setStatus(current.id, status);
  await announceStatusChange(updated, current.status);
  await auditModel.record({
    user,
    action: `Actualizó el estado de ${updated.name} a ${status}`,
    entityType: 'pet',
    entityId: updated.id,
    metadata: { from: current.status, to: status }
  });
  return updated;
}

async function announceStatusChange(pet, previousStatus) {
  const becameUnavailable =
    UNAVAILABLE_STATUSES.includes(pet.status) && !UNAVAILABLE_STATUSES.includes(previousStatus);
  if (!becameUnavailable) return;

  const followers = await favoriteModel.listUserIdsByPet(pet.id);
  await notifyMany(followers, messages.favoriteUnavailable(pet.name), `/mascotas/${pet.id}`);
}

export async function remove(user, petId) {
  const pet = await requireManageablePet(user, petId);

  // §88.7/§88.8: una mascota ya adoptada es parte del historial y no se borra.
  if (pet.status === 'ADOPTADA') {
    throw ApiError.conflict('No puedes eliminar una mascota que ya fue adoptada');
  }

  await petModel.remove(pet.id);
  await auditModel.record({
    user,
    action: `Eliminó la mascota ${pet.name}`,
    entityType: 'pet',
    entityId: pet.id
  });
}

export function listImages(petId) {
  return requirePet(petId).then((pet) => petImageModel.listByPet(pet.id));
}

export async function addImage(user, petId, input) {
  const pet = await requireManageablePet(user, petId);
  return petImageModel.add(pet.id, input);
}

export async function removeImage(user, petId, imageId) {
  const pet = await requireManageablePet(user, petId);
  const deleted = await petImageModel.remove(pet.id, imageId);
  if (!deleted) throw ApiError.notFound('La fotografía no existe');
}
