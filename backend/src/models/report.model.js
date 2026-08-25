import { isPostgres, query } from '../config/database.js';
import { sameId, store } from './memory-store.js';

/**
 * Agregaciones para los reportes (§50) y los dashboards (§44, §46).
 *
 * Todas las consultas son literales: no se construye ningún identificador de
 * tabla o columna a partir de la petición, de modo que la sección de reportes
 * no abre ninguna superficie de inyección SQL.
 */

const toBuckets = (entries) =>
  Object.entries(entries)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'es'));

/** Agrupa un arreglo en memoria por el valor de `keyFn`. */
function groupBy(items, keyFn) {
  return toBuckets(
    items.reduce((accumulator, item) => {
      const key = keyFn(item) ?? 'Sin dato';
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {})
  );
}

/** Mascotas del refugio indicado, o todas si `shelterId` es null. */
const scopedPets = (shelterId) =>
  shelterId == null ? store.pets : store.pets.filter((pet) => sameId(pet.shelterId, shelterId));

function memoryAdoptionRows(shelterId) {
  return store.adoptions
    .map((adoption) => {
      const request = store.requests.find((item) => sameId(item.id, adoption.requestId));
      const pet = request && store.pets.find((item) => sameId(item.id, request.petId));
      return pet ? { adoption, pet } : null;
    })
    .filter(Boolean)
    .filter(({ pet }) => shelterId == null || sameId(pet.shelterId, shelterId));
}

export async function petsBySpecies(shelterId = null) {
  if (!isPostgres) return groupBy(scopedPets(shelterId), (pet) => pet.species);
  const { rows } = await query(
    `SELECT species AS label, count(*)::int AS total FROM pets
      WHERE ($1::bigint IS NULL OR shelter_id = $1)
      GROUP BY species ORDER BY total DESC, label`,
    [shelterId]
  );
  return rows;
}

export async function petsByStatus(shelterId = null) {
  if (!isPostgres) return groupBy(scopedPets(shelterId), (pet) => pet.status);
  const { rows } = await query(
    `SELECT status::text AS label, count(*)::int AS total FROM pets
      WHERE ($1::bigint IS NULL OR shelter_id = $1)
      GROUP BY status ORDER BY total DESC, label`,
    [shelterId]
  );
  return rows;
}

export async function petsByCity(shelterId = null) {
  if (!isPostgres) return groupBy(scopedPets(shelterId), (pet) => pet.city);
  const { rows } = await query(
    `SELECT city AS label, count(*)::int AS total FROM pets
      WHERE ($1::bigint IS NULL OR shelter_id = $1)
      GROUP BY city ORDER BY total DESC, label`,
    [shelterId]
  );
  return rows;
}

export async function requestsByStatus(shelterId = null) {
  if (!isPostgres) {
    const requests =
      shelterId == null
        ? store.requests
        : store.requests.filter((request) => {
            const pet = store.pets.find((item) => sameId(item.id, request.petId));
            return pet && sameId(pet.shelterId, shelterId);
          });
    return groupBy(requests, (request) => request.status);
  }
  const { rows } = await query(
    `SELECT ar.status::text AS label, count(*)::int AS total
       FROM adoption_requests ar
       JOIN pets p ON p.id = ar.pet_id
      WHERE ($1::bigint IS NULL OR p.shelter_id = $1)
      GROUP BY ar.status ORDER BY total DESC, label`,
    [shelterId]
  );
  return rows;
}

export async function adoptionsByMonth(shelterId = null) {
  if (!isPostgres) {
    return memoryAdoptionRows(shelterId)
      .reduce((accumulator, { adoption }) => {
        const key = String(adoption.adoptedAt).slice(0, 7);
        const found = accumulator.find((bucket) => bucket.label === key);
        if (found) found.total += 1;
        else accumulator.push({ label: key, total: 1 });
        return accumulator;
      }, [])
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  const { rows } = await query(
    `SELECT to_char(a.adopted_at, 'YYYY-MM') AS label, count(*)::int AS total
       FROM adoptions a
       JOIN adoption_requests ar ON ar.id = a.request_id
       JOIN pets p ON p.id = ar.pet_id
      WHERE ($1::bigint IS NULL OR p.shelter_id = $1)
      GROUP BY 1 ORDER BY 1`,
    [shelterId]
  );
  return rows;
}

export async function adoptionsByCity(shelterId = null) {
  if (!isPostgres) return groupBy(memoryAdoptionRows(shelterId), ({ pet }) => pet.city);
  const { rows } = await query(
    `SELECT p.city AS label, count(*)::int AS total
       FROM adoptions a
       JOIN adoption_requests ar ON ar.id = a.request_id
       JOIN pets p ON p.id = ar.pet_id
      WHERE ($1::bigint IS NULL OR p.shelter_id = $1)
      GROUP BY p.city ORDER BY total DESC, label`,
    [shelterId]
  );
  return rows;
}

export async function adoptionsBySpecies(shelterId = null) {
  if (!isPostgres) return groupBy(memoryAdoptionRows(shelterId), ({ pet }) => pet.species);
  const { rows } = await query(
    `SELECT p.species AS label, count(*)::int AS total
       FROM adoptions a
       JOIN adoption_requests ar ON ar.id = a.request_id
       JOIN pets p ON p.id = ar.pet_id
      WHERE ($1::bigint IS NULL OR p.shelter_id = $1)
      GROUP BY p.species ORDER BY total DESC, label`,
    [shelterId]
  );
  return rows;
}

export async function sheltersByStatus() {
  if (!isPostgres) return groupBy(store.shelters, (shelter) => shelter.status);
  const { rows } = await query(
    `SELECT status::text AS label, count(*)::int AS total
       FROM shelters GROUP BY status ORDER BY total DESC, label`
  );
  return rows;
}

/** Ranking de refugios con más adopciones registradas (§50). */
export async function topSheltersByAdoptions(limit = 10) {
  if (!isPostgres) {
    return groupBy(memoryAdoptionRows(null), ({ pet }) => {
      const shelter = store.shelters.find((item) => sameId(item.id, pet.shelterId));
      return shelter?.name ?? 'Sin refugio';
    }).slice(0, limit);
  }
  const { rows } = await query(
    `SELECT s.name AS label, count(*)::int AS total
       FROM adoptions a
       JOIN adoption_requests ar ON ar.id = a.request_id
       JOIN pets p ON p.id = ar.pet_id
       JOIN shelters s ON s.id = p.shelter_id
      GROUP BY s.name ORDER BY total DESC, label LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function usersByRole() {
  if (!isPostgres) return groupBy(store.users, (user) => user.role);
  const { rows } = await query(
    `SELECT r.name AS label, count(u.id)::int AS total
       FROM roles r LEFT JOIN users u ON u.role_id = r.id
      GROUP BY r.name ORDER BY total DESC, label`
  );
  return rows;
}

/** Total de ciudades distintas con mascotas publicadas (§10). */
export async function distinctPetCities() {
  if (!isPostgres) return new Set(store.pets.map((pet) => pet.city)).size;
  const { rows } = await query('SELECT count(DISTINCT city)::int AS total FROM pets');
  return rows[0].total;
}
