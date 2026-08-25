import { resolvePagination } from '../utils/pagination.js';
import * as petModel from '../models/pet.model.js';
import * as shelterModel from '../models/shelter.model.js';
import * as requestModel from '../models/adoption-request.model.js';
import * as adoptionModel from '../models/adoption.model.js';
import * as auditModel from '../models/audit.model.js';
import * as userModel from '../models/user.model.js';
import * as interviewModel from '../models/interview.model.js';
import * as favoriteService from './favorite.service.js';
import * as notificationService from './notification.service.js';
import * as reportService from './report.service.js';
import * as access from './access.service.js';
import { toPublicUser } from './auth.service.js';

/**
 * Datos completos del panel de cada rol en una sola petición.
 *
 * Evita que el frontend encadene seis llamadas al entrar al panel; cada rol
 * recibe exactamente lo que su panel muestra (§8, §44, §46).
 */
export async function build(user) {
  if (user.role === 'ADOPTANTE') return adopterWorkspace(user);
  if (user.role === 'REFUGIO') return shelterWorkspace(user);
  return adminWorkspace(user);
}

const FIRST_PAGE = { page: 1, limit: 20 };

async function adopterWorkspace(user) {
  const scope = await access.resolveScope(user);
  const [favorites, requests, adoptions, interviews, notifications, unread] = await Promise.all([
    favoriteService.list(user),
    requestModel.list({ scope }, FIRST_PAGE),
    adoptionModel.list({ scope }, FIRST_PAGE),
    interviewModel.listForUser({ role: 'ADOPTANTE', userId: user.id }),
    notificationService.list(user.id),
    notificationService.countUnread(user.id)
  ]);

  return {
    role: 'ADOPTANTE',
    summary: {
      favorites: favorites.length,
      requests: requests.total,
      interviews: interviews.length,
      adoptions: adoptions.total,
      unreadNotifications: unread
    },
    favorites,
    requests: requests.data,
    interviews,
    adoptions: adoptions.data,
    notifications
  };
}

async function shelterWorkspace(user) {
  const shelter = await access.getOwnShelter(user);

  // Sin perfil de refugio el panel muestra únicamente el formulario de alta.
  if (!shelter) {
    return { role: 'REFUGIO', shelter: null, summary: null, pets: [], requests: [], interviews: [], adoptions: [] };
  }

  const scope = { role: 'REFUGIO', userId: user.id, shelterId: shelter.id };
  const [summary, pets, requests, adoptions, interviews, notifications] = await Promise.all([
    reportService.shelterSummary(shelter.id),
    petModel.list({ shelterId: shelter.id, sort: 'recent' }, { page: 1, limit: 50 }),
    requestModel.list({ scope }, FIRST_PAGE),
    adoptionModel.list({ scope }, FIRST_PAGE),
    interviewModel.listForUser(scope),
    notificationService.list(user.id)
  ]);

  return {
    role: 'REFUGIO',
    shelter,
    summary,
    pets: pets.data,
    requests: requests.data,
    interviews,
    adoptions: adoptions.data,
    notifications
  };
}

async function adminWorkspace(user) {
  const scope = { role: 'ADMINISTRADOR' };
  const pagination = resolvePagination({ page: 1, limit: 20 });

  const [summary, users, shelters, pets, requests, adoptions, audit] = await Promise.all([
    reportService.adminSummary(),
    userModel.list({}, pagination),
    shelterModel.list({}, pagination),
    petModel.list({ sort: 'recent' }, pagination),
    requestModel.list({ scope }, pagination),
    adoptionModel.list({ scope }, pagination),
    auditModel.list({}, { page: 1, limit: 30 })
  ]);

  return {
    role: 'ADMINISTRADOR',
    summary,
    users: users.data.map(toPublicUser),
    shelters: shelters.data,
    pets: pets.data,
    requests: requests.data,
    adoptions: adoptions.data,
    audit: audit.data,
    notifications: await notificationService.list(user.id)
  };
}
