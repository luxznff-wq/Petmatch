import { ApiError } from '../utils/api-error.js';
import * as interviewModel from '../models/interview.model.js';
import * as auditModel from '../models/audit.model.js';
import * as access from './access.service.js';
import { requireActionableRequest, requireVisibleRequest } from './adoption-request.service.js';
import { messages, notify } from './notification.service.js';

/**
 * Entrevistas de adopción (§36).
 *
 * Toda operación pasa primero por `requireVisibleRequest`, de modo que un
 * refugio nunca puede programar ni editar entrevistas de otro refugio.
 */

export async function listByRequest(user, requestId) {
  const request = await requireVisibleRequest(user, requestId);
  return interviewModel.listByRequest(request.id);
}

/** Agenda del usuario: "Mis entrevistas" (§8) y panel del refugio. */
export async function listForUser(user) {
  const scope = await access.resolveScope(user);
  return interviewModel.listForUser({
    role: scope.role,
    userId: scope.userId,
    shelterId: scope.shelterId
  });
}

/** Una entrevista no puede quedar agendada en el pasado (§36). */
function assertFutureDate(scheduledAt) {
  if (new Date(scheduledAt).getTime() < Date.now()) {
    throw ApiError.unprocessable('La entrevista no puede programarse en el pasado');
  }
}

export async function schedule(user, requestId, input) {
  const request = await requireActionableRequest(user, requestId);
  if (user.role === 'ADOPTANTE') {
    throw ApiError.forbidden('Solo el refugio puede programar entrevistas');
  }
  // §36: la entrevista se programa cuando la solicitud llega a ese estado.
  if (request.status !== 'ENTREVISTA') {
    throw ApiError.conflict('La solicitud debe estar en estado ENTREVISTA para agendar');
  }
  assertFutureDate(input.scheduledAt);

  const interview = await interviewModel.create(request.id, input);
  await notify(
    request.userId,
    messages.interviewScheduled(request.petName),
    `/mis-entrevistas/${interview.id}`
  );
  await auditModel.record({
    user,
    action: `Programó una entrevista para la solicitud #${request.id}`,
    entityType: 'adoption_interview',
    entityId: interview.id
  });
  return interview;
}

/** Registro del resultado y ajustes de la entrevista (§36). */
export async function update(user, interviewId, input) {
  const interview = await interviewModel.findById(interviewId);
  if (!interview) throw ApiError.notFound('La entrevista no existe');

  // Reusar la comprobación de la solicitud garantiza el mismo criterio de
  // propiedad que en el resto del flujo.
  await requireActionableRequest(user, interview.requestId);
  if (user.role === 'ADOPTANTE') {
    throw ApiError.forbidden('Solo el refugio puede registrar el resultado de la entrevista');
  }
  // Reprogramar tiene la misma regla que programar: crear una entrevista en
  // el pasado se rechazaba, pero moverla ahí se aceptaba sin más.
  if (input.scheduledAt !== undefined) assertFutureDate(input.scheduledAt);

  const updated = await interviewModel.update(interview.id, input);
  if (input.result && input.result !== interview.result) {
    await auditModel.record({
      user,
      action: `Registró el resultado "${input.result}" de la entrevista #${interview.id}`,
      entityType: 'adoption_interview',
      entityId: interview.id,
      metadata: { from: interview.result, to: input.result }
    });
  }
  return updated;
}
