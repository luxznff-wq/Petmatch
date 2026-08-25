import { ApiError } from '../utils/api-error.js';
import { resolvePagination } from '../utils/pagination.js';
import * as userModel from '../models/user.model.js';
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

export async function remove(actor, id) {
  if (Number(actor.id) === Number(id)) {
    throw ApiError.conflict('No puedes eliminar tu propia cuenta de administrador');
  }
  const user = await userModel.findById(id);
  if (!user) throw ApiError.notFound('El usuario no existe');

  await userModel.remove(id);
  await auditModel.record({
    user: actor,
    action: `Eliminó la cuenta ${user.email}`,
    entityType: 'user',
    entityId: user.id
  });
}
