import { ApiError } from '../utils/api-error.js';
import { resolvePagination } from '../utils/pagination.js';
import * as adoptionModel from '../models/adoption.model.js';
import * as requestModel from '../models/adoption-request.model.js';
import * as auditModel from '../models/audit.model.js';
import * as access from './access.service.js';
import { requireActionableRequest, requireVisibleRequest } from './adoption-request.service.js';
import { messages, notify } from './notification.service.js';

export async function list(user, query) {
  const pagination = resolvePagination(query);
  const scope = await access.resolveScope(user);
  const { data, total } = await adoptionModel.list({ scope }, pagination);
  return { data, total, page: pagination.page, limit: pagination.limit };
}

export async function getById(user, id) {
  const adoption = await adoptionModel.findById(id);
  if (!adoption) throw ApiError.notFound('La adopción no existe');

  // La visibilidad de la adopción es la misma que la de su solicitud (§38).
  await requireVisibleRequest(user, adoption.requestId);
  return adoption;
}

/**
 * Registra la adopción y cierra el proceso (§35.9, §35.10, §88.7, §88.8).
 *
 * El modelo hace el cambio de forma transaccional: crea la adopción, pasa la
 * solicitud a ADOPCION_COMPLETADA y la mascota a ADOPTADA. Aquí sólo quedan
 * los efectos posteriores: cerrar las solicitudes rivales y notificar.
 */
export async function create(user, { requestId, notes }) {
  const request = await requireActionableRequest(user, requestId);
  if (user.role === 'ADOPTANTE') {
    throw ApiError.forbidden('Solo el refugio puede registrar la adopción');
  }
  if (request.status !== 'APROBADA') {
    throw ApiError.conflict('La solicitud debe estar aprobada para registrar la adopción');
  }

  const adoption = await adoptionModel.completeFromRequest(request.id, { notes });
  if (!adoption) {
    // Otra petición concurrente ganó la carrera y ya cerró esta solicitud.
    throw ApiError.conflict('La adopción de esta solicitud ya fue registrada');
  }

  await closeCompetingRequests(request);
  await notify(
    request.userId,
    messages.adoptionCompleted(request.petName),
    `/mis-adopciones/${adoption.id}`
  );
  await auditModel.record({
    user,
    action: `Registró la adopción ${adoption.code} de ${request.petName}`,
    entityType: 'adoption',
    entityId: adoption.id,
    metadata: { requestId: request.id }
  });
  return adoption;
}

/**
 * Una mascota adoptada no puede seguir recibiendo solicitudes (§35.6), así que
 * las que seguían vivas para esa mascota se rechazan y se avisa a su autor.
 */
async function closeCompetingRequests(request) {
  const competitors = await requestModel.listActiveByPet(request.petId, {
    excludeRequestId: request.id
  });

  for (const competitor of competitors) {
    const cerrada = await requestModel.transition(competitor.id, 'RECHAZADA', {
      expectedStatus: competitor.status,
      reviewNotes: 'La mascota fue adoptada por otro solicitante.'
    });
    // Si alguien la movió mientras tanto, no se avisa de un cambio que no se hizo.
    if (!cerrada) continue;

    await notify(
      competitor.userId,
      messages.requestRejected(request.petName),
      `/mis-solicitudes/${competitor.id}`
    );
  }
}
