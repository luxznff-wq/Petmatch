import { ApiError } from '../utils/api-error.js';
import { resolvePagination } from '../utils/pagination.js';
import * as shelterModel from '../models/shelter.model.js';
import * as petModel from '../models/pet.model.js';
import * as auditModel from '../models/audit.model.js';
import * as access from './access.service.js';
import { messages, notify } from './notification.service.js';

/**
 * Listado público de refugios.
 *
 * Los visitantes sólo ven los VERIFICADOS; el administrador ve todos y puede
 * filtrar por estado para revisar los pendientes (§48).
 */
export async function list(user, query) {
  const pagination = resolvePagination(query);
  const filters = {
    search: query.search,
    city: query.city,
    status: access.isAdmin(user) ? query.status : 'VERIFICADO'
  };
  const { data, total } = await shelterModel.list(filters, pagination);
  return { data, total, page: pagination.page, limit: pagination.limit };
}

/** Perfil público con contadores y mascotas disponibles (§42). */
export async function getPublicProfile(id) {
  const shelter = await shelterModel.findById(id, { withCounts: true });
  if (!shelter) throw ApiError.notFound('El refugio no existe');

  const { data: pets } = await petModel.list(
    { shelterId: shelter.id, status: 'DISPONIBLE', sort: 'recent' },
    { page: 1, limit: 12 }
  );
  return { ...shelter, pets };
}

export async function getOwn(user) {
  return access.getOwnShelter(user);
}

export async function create(user, input) {
  if (await access.getOwnShelter(user)) {
    throw ApiError.conflict('Ya administras un refugio');
  }
  const shelter = await shelterModel.create(user.id, input);
  await auditModel.record({
    user,
    action: `Registró el refugio ${shelter.name}`,
    entityType: 'shelter',
    entityId: shelter.id
  });
  return shelter;
}

export async function update(user, id, input) {
  const shelter = await shelterModel.findById(id);
  if (!shelter) throw ApiError.notFound('El refugio no existe');

  if (!access.isAdmin(user) && Number(shelter.ownerId) !== Number(user.id)) {
    throw ApiError.forbidden('Solo puedes editar tu propio refugio');
  }
  // Un refugio suspendido no gestiona sus publicaciones (§88.13); editar los
  // datos de contacto sí se permite para poder resolver la suspensión.
  return shelterModel.update(shelter.id, input);
}

/** Verificación o suspensión por parte del administrador (§41, §48). */
export async function setStatus(user, id, status) {
  const shelter = await shelterModel.findById(id);
  if (!shelter) throw ApiError.notFound('El refugio no existe');
  if (shelter.status === status) return shelter;

  const updated = await shelterModel.setStatus(shelter.id, status);

  if (status === 'VERIFICADO') await notify(shelter.ownerId, messages.shelterVerified(), '/refugio');
  if (status === 'SUSPENDIDO') await notify(shelter.ownerId, messages.shelterSuspended(), '/refugio');

  await auditModel.record({
    user,
    action: `Cambió el refugio ${shelter.name} a ${status}`,
    entityType: 'shelter',
    entityId: shelter.id,
    metadata: { from: shelter.status, to: status }
  });
  return updated;
}

/** Mascotas de un refugio, paginadas (§42, §48). */
export async function listPets(id, query) {
  const shelter = await shelterModel.findById(id);
  if (!shelter) throw ApiError.notFound('El refugio no existe');

  const pagination = resolvePagination(query);
  const { data, total } = await petModel.list(
    { ...query, shelterId: shelter.id },
    pagination
  );
  return { data, total, page: pagination.page, limit: pagination.limit };
}
