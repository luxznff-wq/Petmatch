import { isPostgres, query, queryOne, transaction } from '../config/database.js';
import { QueryBuilder } from '../utils/sql.js';
import { clone, sameId, sequences, store } from './memory-store.js';

const map = (row) =>
  row && {
    id: row.id,
    code: row.code,
    requestId: row.request_id,
    adoptedAt: row.adopted_at,
    notes: row.notes,
    petId: row.pet_id,
    petName: row.pet_name,
    petSpecies: row.pet_species,
    petImage: row.pet_image ?? null,
    petCity: row.pet_city,
    userId: row.user_id,
    adopterName: row.adopter_name,
    shelterId: row.shelter_id,
    shelterName: row.shelter_name
  };

const SELECT_ADOPTION = `
  SELECT a.*, ar.user_id, ar.pet_id,
         p.name AS pet_name, p.species AS pet_species, p.city AS pet_city,
         s.id AS shelter_id, s.name AS shelter_name,
         (u.first_name || ' ' || u.last_name) AS adopter_name,
         (SELECT url FROM pet_images i
           WHERE i.pet_id = p.id ORDER BY i.is_primary DESC, i.id LIMIT 1) AS pet_image
    FROM adoptions a
    JOIN adoption_requests ar ON ar.id = a.request_id
    JOIN pets p ON p.id = ar.pet_id
    JOIN shelters s ON s.id = p.shelter_id
    JOIN users u ON u.id = ar.user_id
`;

function memoryAdoptionView(adoption) {
  const request = store.requests.find((item) => sameId(item.id, adoption.requestId));
  const pet = request && store.pets.find((item) => sameId(item.id, request.petId));
  const shelter = pet && store.shelters.find((item) => sameId(item.id, pet.shelterId));
  const adopter = request && store.users.find((item) => sameId(item.id, request.userId));
  const image =
    store.petImages
      .filter((item) => pet && sameId(item.petId, pet.id))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id)[0]?.url ?? null;

  return {
    ...clone(adoption),
    petId: pet?.id ?? null,
    petName: pet?.name ?? null,
    petSpecies: pet?.species ?? null,
    petCity: pet?.city ?? null,
    petImage: image,
    userId: request?.userId ?? null,
    adopterName: adopter ? `${adopter.firstName} ${adopter.lastName}` : null,
    shelterId: pet?.shelterId ?? null,
    shelterName: shelter?.name ?? null
  };
}

export async function findById(id) {
  if (!isPostgres) {
    const adoption = store.adoptions.find((item) => sameId(item.id, id));
    return adoption ? memoryAdoptionView(adoption) : undefined;
  }
  return map(await queryOne(`${SELECT_ADOPTION} WHERE a.id = $1`, [Number(id) || 0]));
}

/** Historial de adopciones con alcance por rol (§38). */
export async function list({ scope }, pagination) {
  if (!isPostgres) {
    const matched = store.adoptions
      .map(memoryAdoptionView)
      .filter((adoption) => {
        if (scope.role === 'ADOPTANTE') return sameId(adoption.userId, scope.userId);
        if (scope.role === 'REFUGIO') return sameId(adoption.shelterId, scope.shelterId);
        return true;
      })
      .sort((a, b) => b.id - a.id);

    if (!pagination) return { data: matched, total: matched.length };
    const offset = (pagination.page - 1) * pagination.limit;
    return { data: matched.slice(offset, offset + pagination.limit), total: matched.length };
  }

  const builder = new QueryBuilder();
  if (scope.role === 'ADOPTANTE') builder.where('ar.user_id = ?', Number(scope.userId));
  else if (scope.role === 'REFUGIO') builder.where('p.shelter_id = ?', Number(scope.shelterId ?? 0));

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total
       FROM adoptions a
       JOIN adoption_requests ar ON ar.id = a.request_id
       JOIN pets p ON p.id = ar.pet_id
      WHERE ${builder.clause}`,
    builder.values
  );

  let sql = `${SELECT_ADOPTION} WHERE ${builder.clause} ORDER BY a.adopted_at DESC, a.id DESC`;
  if (pagination) {
    const limitParam = builder.push(pagination.limit);
    const offsetParam = builder.push((pagination.page - 1) * pagination.limit);
    sql += ` LIMIT ${limitParam} OFFSET ${offsetParam}`;
  }
  const { rows } = await query(sql, builder.values);
  return { data: rows.map(map), total: countRows[0].total };
}

/**
 * Cierra el proceso: crea la adopción, marca la solicitud como
 * ADOPCION_COMPLETADA y la mascota como ADOPTADA, todo en una transacción
 * (§35.9, §35.10, §88.8).
 *
 * El `SELECT ... FOR UPDATE` evita que dos peticiones simultáneas creen dos
 * adopciones para la misma solicitud.
 */
export async function completeFromRequest(requestId, { notes = null } = {}) {
  if (!isPostgres) {
    const request = store.requests.find((item) => sameId(item.id, requestId));
    if (!request || request.status !== 'APROBADA') return null;
    if (store.adoptions.some((item) => sameId(item.requestId, requestId))) return null;

    const id = sequences.adoptions.next();
    const adoption = {
      id,
      code: `ADP-${String(id).padStart(5, '0')}`,
      requestId: Number(requestId),
      adoptedAt: new Date().toISOString().slice(0, 10),
      notes,
      createdAt: new Date().toISOString()
    };
    store.adoptions.push(adoption);
    request.status = 'ADOPCION_COMPLETADA';
    request.updatedAt = new Date().toISOString();
    const pet = store.pets.find((item) => sameId(item.id, request.petId));
    if (pet) pet.status = 'ADOPTADA';
    return memoryAdoptionView(adoption);
  }

  const adoptionId = await transaction(async (client) => {
    const { rows } = await client.query(
      'SELECT id, pet_id, status FROM adoption_requests WHERE id = $1 FOR UPDATE',
      [Number(requestId) || 0]
    );
    const request = rows[0];
    if (!request || request.status !== 'APROBADA') return null;

    const inserted = await client.query(
      'INSERT INTO adoptions (request_id, notes) VALUES ($1, $2) RETURNING id',
      [request.id, notes]
    );
    await client.query(
      "UPDATE adoption_requests SET status = 'ADOPCION_COMPLETADA' WHERE id = $1",
      [request.id]
    );
    await client.query("UPDATE pets SET status = 'ADOPTADA' WHERE id = $1", [request.pet_id]);
    return inserted.rows[0].id;
  });

  return adoptionId == null ? null : findById(adoptionId);
}

export async function countAll() {
  if (!isPostgres) return store.adoptions.length;
  const row = await queryOne('SELECT count(*)::int AS total FROM adoptions');
  return row.total;
}

export async function countSince(isoDate) {
  if (!isPostgres) {
    return store.adoptions.filter((adoption) => String(adoption.adoptedAt) >= isoDate).length;
  }
  const row = await queryOne(
    'SELECT count(*)::int AS total FROM adoptions WHERE adopted_at >= $1',
    [isoDate]
  );
  return row.total;
}
