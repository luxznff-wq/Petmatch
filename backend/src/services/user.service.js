import { ApiError } from '../utils/api-error.js';
import { resolvePagination } from '../utils/pagination.js';
import * as userModel from '../models/user.model.js';
import * as shelterModel from '../models/shelter.model.js';
import * as adoptionModel from '../models/adoption.model.js';
import * as auditModel from '../models/audit.model.js';
import * as access from './access.service.js';
import { toPublicUser } from './auth.service.js';
import { messages, notify } from './notification.service.js';

export async function list(query) {
  const pagination = resolvePagination(query);
  const { data, total } = await userModel.list(
    { search: query.search, role: query.role, status: query.status },
    pagination
  );
  return {
    data: data.map(toPublicUser),
    total,
    page: pagination.page,
    limit: pagination.limit
  };
}

/** Un usuario sólo consulta su propio perfil; el administrador, cualquiera. */
export async function getById(actor, id) {
  if (!access.isAdmin(actor) && Number(actor.id) !== Number(id)) {
    throw ApiError.forbidden('No tienes permisos para consultar este perfil');
  }
  const user = await userModel.findById(id);
  if (!user) throw ApiError.notFound('El usuario no existe');
  return toPublicUser(user);
}

export async function updateProfile(actor, id, input) {
  if (!access.isAdmin(actor) && Number(actor.id) !== Number(id)) {
    throw ApiError.forbidden('Solo puedes editar tu propio perfil');
  }
  const updated = await userModel.update(id, input);
  if (!updated) throw ApiError.notFound('El usuario no existe');
  return toPublicUser(updated);
}

/** Suspensión y reactivación por parte del administrador (§47). */
export async function setStatus(actor, id, status) {
  if (Number(actor.id) === Number(id)) {
    throw ApiError.conflict('No puedes cambiar el estado de tu propia cuenta');
  }
  const user = await userModel.findById(id);
  if (!user) throw ApiError.notFound('El usuario no existe');
  if (user.status === status) return toPublicUser(user);

  const updated = await userModel.setStatus(id, status);
  await notify(
    user.id,
    status === 'SUSPENDIDO' ? messages.accountSuspended() : messages.accountReactivated()
  );
  await auditModel.record({
    user: actor,
    action: `Cambió la cuenta ${user.email} a ${status}`,
    entityType: 'user',
    entityId: user.id,
    metadata: { from: user.status, to: status }
  });
  return toPublicUser(updated);
}

/**
 * Elimina una cuenta (§56).
 *
 * El borrado arrastra en cascada el refugio, sus mascotas y las solicitudes
 * asociadas. Por eso se niega cuando hay adopciones registradas: el historial
 * (§38) y la trazabilidad (§52) no deben desaparecer porque se borre una
 * cuenta. En esos casos la acción correcta es suspenderla (§47).
 */
export async function remove(actor, id) {
  if (Number(actor.id) === Number(id)) {
    throw ApiError.conflict('No puedes eliminar tu propia cuenta de administrador');
  }
  const user = await userModel.findById(id);
  if (!user) throw ApiError.notFound('El usuario no existe');

  const scope =
    user.role === 'REFUGIO'
      ? { role: 'REFUGIO', shelterId: (await shelterModel.findByOwner(user.id))?.id ?? -1 }
      : { role: 'ADOPTANTE', userId: user.id };
  const { total: adoptions } = await adoptionModel.list({ scope }, { page: 1, limit: 1 });

  if (adoptions > 0) {
    throw ApiError.conflict(
      'Esta cuenta tiene adopciones registradas y no puede eliminarse. Suspéndela para bloquear su acceso sin perder el historial.'
    );
  }

  await userModel.remove(id);
  await auditModel.record({
    user: actor,
    action: `Eliminó la cuenta ${user.email}`,
    entityType: 'user',
    entityId: user.id
  });
}
