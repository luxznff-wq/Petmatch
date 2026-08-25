import * as reportModel from '../models/report.model.js';
import * as petModel from '../models/pet.model.js';
import * as userModel from '../models/user.model.js';
import * as shelterModel from '../models/shelter.model.js';
import * as requestModel from '../models/adoption-request.model.js';
import * as adoptionModel from '../models/adoption.model.js';
import * as access from './access.service.js';

/**
 * Reportes y estadísticas (§10, §44, §46, §50).
 *
 * El parámetro `shelterId` acota los resultados al refugio del usuario: el
 * mismo cálculo sirve para el panel del refugio y para el del administrador.
 */

/** Alcance del reporte: null para el administrador, el refugio propio si no. */
async function reportScope(user) {
  if (access.isAdmin(user)) return null;
  const shelter = await access.getOwnShelter(user);
  // Un refugio sin perfil todavía no tiene datos: -1 no coincide con ningún id.
  return shelter?.id ?? -1;
}

/** Estadísticas públicas de la página de inicio (§10). */
export async function publicStats() {
  const [pets, adoptions, shelters, cities] = await Promise.all([
    petModel.countAll(),
    adoptionModel.countAll(),
    shelterModel.countAll(),
    reportModel.distinctPetCities()
  ]);
  return { pets, adoptions, shelters, cities };
}

export async function petsReport(user) {
  const shelterId = await reportScope(user);
  const [bySpecies, byStatus, byCity] = await Promise.all([
    reportModel.petsBySpecies(shelterId),
    reportModel.petsByStatus(shelterId),
    reportModel.petsByCity(shelterId)
  ]);
  return { bySpecies, byStatus, byCity };
}

export async function requestsReport(user) {
  const shelterId = await reportScope(user);
  const byStatus = await reportModel.requestsByStatus(shelterId);
  const total = byStatus.reduce((sum, bucket) => sum + bucket.total, 0);
  return { byStatus, total };
}

export async function adoptionsReport(user) {
  const shelterId = await reportScope(user);
  const [byMonth, byCity, bySpecies] = await Promise.all([
    reportModel.adoptionsByMonth(shelterId),
    reportModel.adoptionsByCity(shelterId),
    reportModel.adoptionsBySpecies(shelterId)
  ]);
  return {
    byMonth,
    byCity,
    bySpecies,
    total: byMonth.reduce((sum, bucket) => sum + bucket.total, 0)
  };
}

/** Reporte de refugios: sólo tiene sentido a nivel global (§50). */
export async function sheltersReport() {
  const [byStatus, topByAdoptions, total] = await Promise.all([
    reportModel.sheltersByStatus(),
    reportModel.topSheltersByAdoptions(),
    shelterModel.countAll()
  ]);
  return { byStatus, topByAdoptions, total };
}

/** Resumen numérico del panel administrativo (§46). */
export async function adminSummary() {
  const [users, shelters, pets, requests, adoptions, usersByRole] = await Promise.all([
    userModel.countAll(),
    shelterModel.countAll(),
    petModel.countAll(),
    requestModel.countAll(),
    adoptionModel.countAll(),
    reportModel.usersByRole()
  ]);
  return { users, shelters, pets, requests, adoptions, usersByRole };
}

/** Métricas del panel del refugio (§44). */
export async function shelterSummary(shelterId) {
  const [byStatus, requestsByStatus, adoptionsThisMonth, adoptionsTotal] = await Promise.all([
    reportModel.petsByStatus(shelterId),
    reportModel.requestsByStatus(shelterId),
    adoptionsSince(startOfMonth(), shelterId),
    reportModel.adoptionsByMonth(shelterId)
  ]);

  const petCount = (status) => byStatus.find((bucket) => bucket.label === status)?.total ?? 0;
  const requestCount = (status) =>
    requestsByStatus.find((bucket) => bucket.label === status)?.total ?? 0;

  return {
    pets: byStatus.reduce((sum, bucket) => sum + bucket.total, 0),
    petsAvailable: petCount('DISPONIBLE'),
    petsInProcess: petCount('EN_PROCESO'),
    petsAdopted: petCount('ADOPTADA'),
    petsUnavailable: petCount('NO_DISPONIBLE'),
    requestsPending: requestCount('PENDIENTE'),
    requestsUnderReview: requestCount('EN_REVISION'),
    requestsInterview: requestCount('ENTREVISTA'),
    adoptionsThisMonth,
    adoptionsTotal: adoptionsTotal.reduce((sum, bucket) => sum + bucket.total, 0)
  };
}

const startOfMonth = () => new Date().toISOString().slice(0, 7).concat('-01');

async function adoptionsSince(isoDate, shelterId) {
  const byMonth = await reportModel.adoptionsByMonth(shelterId);
  const month = isoDate.slice(0, 7);
  return byMonth.find((bucket) => bucket.label === month)?.total ?? 0;
}
