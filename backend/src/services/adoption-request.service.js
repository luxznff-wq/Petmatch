import { ApiError } from '../utils/api-error.js';
import { resolvePagination } from '../utils/pagination.js';
import * as requestModel from '../models/adoption-request.model.js';
import * as petModel from '../models/pet.model.js';
import * as shelterModel from '../models/shelter.model.js';
import * as interviewModel from '../models/interview.model.js';
import * as auditModel from '../models/audit.model.js';
import * as access from './access.service.js';
import { messages, notify } from './notification.service.js';

/**
 * Máquina de estados de la solicitud (§33, §34).
 *
 * Cada clave lista los únicos destinos alcanzables. ADOPCION_COMPLETADA no
 * aparece aquí porque no se alcanza cambiando el estado a mano, sino
 * registrando la adopción (§35.9), que además crea la fila en `adoptions`.
 */
export const TRANSITIONS = Object.freeze({
  PENDIENTE: ['EN_REVISION', 'RECHAZADA', 'CANCELADA'],
  EN_REVISION: ['ENTREVISTA', 'APROBADA', 'RECHAZADA', 'CANCELADA'],
  ENTREVISTA: ['APROBADA', 'RECHAZADA'],
  APROBADA: ['RECHAZADA'],
  RECHAZADA: [],
  CANCELADA: [],
  ADOPCION_COMPLETADA: []
});

/** Estados desde los que el adoptante puede cancelar su solicitud (§34). */
const CANCELLABLE_BY_ADOPTER = ['PENDIENTE', 'EN_REVISION'];

/** Estados de la solicitud que dejan la mascota reservada (§22). */
const RESERVING_STATUSES = ['EN_REVISION', 'ENTREVISTA', 'APROBADA'];

export async function list(user, query) {
  const pagination = resolvePagination(query);
  const scope = await access.resolveScope(user);
  const { data, total } = await requestModel.list(
    { scope, status: query.status, search: query.search },
    pagination
  );
  return { data, total, page: pagination.page, limit: pagination.limit };
}

/**
 * Detalle completo de la solicitud (§45): datos del solicitante, vivienda,
 * experiencia, motivación, mascota y entrevistas.
 */
export async function getById(user, id) {
  const request = await requireVisibleRequest(user, id);
  const [pet, interviews] = await Promise.all([
    petModel.findById(request.petId),
    interviewModel.listByRequest(request.id)
  ]);
  return { ...request, pet, interviews };
}

/** Carga la solicitud comprobando que el usuario tiene derecho a verla. */
async function requireVisibleRequest(user, id) {
  const request = await requestModel.findById(id);
  if (!request) throw ApiError.notFound('La solicitud no existe');

  if (access.isAdmin(user)) return request;

  if (user.role === 'ADOPTANTE') {
    // §88.4: el adoptante sólo administra sus propias solicitudes.
    if (Number(request.userId) !== Number(user.id)) throw ApiError.notFound('La solicitud no existe');
    return request;
  }

  // §35.7: sólo el refugio propietario puede revisar la solicitud.
  const shelter = await access.getOwnShelter(user);
  if (!shelter || Number(shelter.id) !== Number(request.shelterId)) {
    throw ApiError.forbidden('Solo el refugio propietario puede revisar esta solicitud');
  }
  return request;
}

/**
 * Crea una solicitud aplicando todas las reglas de §35:
 * usuario autenticado, mascota existente y disponible, formulario completo
 * (lo garantiza el validador) y sin duplicados activos.
 */
export async function create(user, input) {
  const pet = await petModel.findById(input.petId);
  if (!pet) throw ApiError.notFound('La mascota no existe');

  if (pet.status === 'ADOPTADA') {
    throw ApiError.conflict('Esta mascota ya fue adoptada y no puede recibir solicitudes');
  }
  if (pet.status !== 'DISPONIBLE') {
    throw ApiError.conflict('La mascota ya no está disponible');
  }
  if (await requestModel.hasActiveRequest(user.id, pet.id)) {
    throw ApiError.conflict('Ya tienes una solicitud activa para esta mascota');
  }

  const request = await requestModel.create(user.id, input);

  await notify(user.id, messages.requestSent(pet.name), `/mis-solicitudes/${request.id}`);
  // §87: el refugio recibe la notificación de la nueva solicitud.
  const shelterOwnerId = await resolveShelterOwnerId(pet.shelterId);
  await notify(
    shelterOwnerId,
    messages.requestReceived(pet.name, request.adopterName ?? 'Un adoptante'),
    `/refugio/solicitudes/${request.id}`
  );

  return request;
}

async function resolveShelterOwnerId(shelterId) {
  const shelter = await shelterModel.findById(shelterId);
  return shelter?.ownerId ?? null;
}

/**
 * Cambio de estado realizado por el refugio propietario o el administrador
 * (§45). Ajusta el estado de la mascota y avisa al adoptante.
 */
export async function changeStatus(user, id, { status, reviewNotes }) {
  const request = await requireVisibleRequest(user, id);

  if (status === 'CANCELADA') {
    throw ApiError.forbidden('Solo el adoptante puede cancelar su solicitud');
  }
  if (status === 'ADOPCION_COMPLETADA') {
    throw ApiError.conflict('Registra la adopción para completar el proceso');
  }
  assertTransition(request.status, status);

  const petStatus = await resolvePetStatus(request, status);
  const updated = await requestModel.transition(request.id, status, { petStatus, reviewNotes });

  await notifyStatusChange(updated, status);
  await auditModel.record({
    user,
    action: `Cambió la solicitud #${request.id} a ${status}`,
    entityType: 'adoption_request',
    entityId: request.id,
    metadata: { from: request.status, to: status }
  });
  return updated;
}

/** Cancelación por parte del propio adoptante (§34). */
export async function cancel(user, id) {
  const request = await requestModel.findById(id);
  if (!request || Number(request.userId) !== Number(user.id)) {
    throw ApiError.notFound('La solicitud no existe');
  }
  if (!CANCELLABLE_BY_ADOPTER.includes(request.status)) {
    throw ApiError.conflict('Esta solicitud ya no se puede cancelar');
  }

  const petStatus = await resolvePetStatus(request, 'CANCELADA');
  const updated = await requestModel.transition(request.id, 'CANCELADA', { petStatus });

  const shelterOwnerId = await resolveShelterOwnerId(request.shelterId);
  await notify(
    shelterOwnerId,
    messages.requestCancelled(request.petName, request.adopterName ?? 'Un adoptante'),
    `/refugio/solicitudes/${request.id}`
  );
  return updated;
}

function assertTransition(from, to) {
  if (from === to) throw ApiError.conflict(`La solicitud ya está en estado ${to}`);
  if (!TRANSITIONS[from]?.includes(to)) {
    throw ApiError.conflict(`Transición no permitida: ${from} → ${to}`);
  }
}

/**
 * Estado que debe tomar la mascota tras el cambio de la solicitud.
 *
 * Al liberar una solicitud (rechazo o cancelación) la mascota sólo vuelve a
 * DISPONIBLE si ninguna otra solicitud la mantiene reservada.
 */
async function resolvePetStatus(request, nextStatus) {
  if (RESERVING_STATUSES.includes(nextStatus)) return 'EN_PROCESO';
  if (nextStatus !== 'RECHAZADA' && nextStatus !== 'CANCELADA') return null;

  const others = await requestModel.listActiveByPet(request.petId, {
    excludeRequestId: request.id
  });
  const stillReserved = others.some((other) => RESERVING_STATUSES.includes(other.status));
  return stillReserved ? null : 'DISPONIBLE';
}

function notifyStatusChange(request, status) {
  const texts = {
    EN_REVISION: messages.requestUnderReview(request.petName),
    ENTREVISTA: messages.requestReachedInterview(request.petName),
    APROBADA: messages.requestApproved(request.petName),
    RECHAZADA: messages.requestRejected(request.petName)
  };
  const message = texts[status];
  if (!message) return Promise.resolve(null);
  return notify(request.userId, message, `/mis-solicitudes/${request.id}`);
}

/** Reutilizado por los servicios de entrevistas y adopciones. */
export { requireVisibleRequest };
