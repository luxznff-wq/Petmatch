import * as notificationModel from '../models/notification.model.js';

/**
 * Notificaciones internas del sistema (§51).
 *
 * Los textos viven aquí para que el mismo evento produzca siempre el mismo
 * mensaje, sin importar desde qué servicio se dispare.
 */
export const messages = {
  requestSent: (petName) => `Tu solicitud para ${petName} fue enviada.`,
  requestReceived: (petName, adopter) => `${adopter} envió una solicitud de adopción para ${petName}.`,
  requestUnderReview: (petName) => `Tu solicitud para ${petName} está siendo revisada.`,
  requestReachedInterview: (petName) =>
    `Tu solicitud para ${petName} avanzó a la etapa de entrevista.`,
  interviewScheduled: (petName) => `El refugio programó una entrevista por ${petName}.`,
  requestApproved: (petName) => `¡Tu solicitud para ${petName} fue aprobada!`,
  requestRejected: (petName) => `Tu solicitud para ${petName} fue rechazada.`,
  requestCancelled: (petName, adopter) => `${adopter} canceló su solicitud para ${petName}.`,
  adoptionCompleted: (petName) => `¡La adopción de ${petName} se completó! Gracias por darle un hogar.`,
  favoriteUnavailable: (petName) =>
    `${petName}, la mascota que guardaste como favorita, ya no está disponible.`,
  shelterVerified: () => 'Tu refugio fue verificado. Ya puedes publicar mascotas.',
  shelterSuspended: () => 'Tu refugio fue suspendido. Contacta al administrador de PetMatch.',
  accountSuspended: () => 'Tu cuenta fue suspendida. Contacta al administrador de PetMatch.',
  accountReactivated: () => 'Tu cuenta fue reactivada. Bienvenido de vuelta.'
};

export function notify(userId, message, link = null) {
  if (userId == null) return Promise.resolve(null);
  return notificationModel.create(userId, message, link);
}

/** Envía la misma notificación a varios usuarios sin duplicar destinatarios. */
export function notifyMany(userIds, message, link = null) {
  const unique = [...new Set(userIds.filter((id) => id != null).map(Number))];
  return Promise.all(unique.map((userId) => notify(userId, message, link)));
}

export function list(userId) {
  return notificationModel.listByUser(userId);
}

export function countUnread(userId) {
  return notificationModel.countUnread(userId);
}

export function markRead(userId, id) {
  return notificationModel.markRead(userId, id);
}

export function markAllRead(userId) {
  return notificationModel.markAllRead(userId);
}
