import { isPostgres, query, queryOne, transaction } from '../config/database.js';
import { QueryBuilder } from '../utils/sql.js';
import { clone, escapeLike, sameId, sequences, store } from './memory-store.js';

/** Estados en los que una solicitud sigue "viva" (§35.5). */
export const ACTIVE_STATUSES = Object.freeze([
  'PENDIENTE',
  'EN_REVISION',
  'ENTREVISTA',
  'APROBADA'
]);

const map = (row) =>
  row && {
    id: row.id,
    userId: row.user_id,
    petId: row.pet_id,
    status: row.status,
    applicant: {
      name: row.applicant_name,
      age: row.applicant_age,
      phone: row.applicant_phone,
      email: row.applicant_email,
      address: row.applicant_address,
      city: row.applicant_city
    },
    housing: {
      type: row.housing_type,
      hasYard: row.has_yard,
      livesAlone: row.lives_alone,
      hasOtherPets: row.has_other_pets,
      hasChildren: row.has_children
    },
    hadPetsBefore: row.had_pets_before,
    experience: row.experience,
    motivation: row.motivation,
    declarationAccepted: row.declaration_accepted,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Datos desnormalizados que sólo llegan en las consultas con JOIN.
    petName: row.pet_name ?? undefined,
    petImage: row.pet_image ?? undefined,
    petStatus: row.pet_status ?? undefined,
    shelterId: row.shelter_id ?? undefined,
    shelterName: row.shelter_name ?? undefined,
    adopterName: row.adopter_name ?? undefined,
    adopterEmail: row.adopter_email ?? undefined
  };

const SELECT_REQUEST = `
  SELECT ar.*,
         p.name AS pet_name, p.status AS pet_status, p.shelter_id,
         s.name AS shelter_name,
         (u.first_name || ' ' || u.last_name) AS adopter_name,
         u.email AS adopter_email,
         (SELECT url FROM pet_images i
           WHERE i.pet_id = p.id ORDER BY i.is_primary DESC, i.id LIMIT 1) AS pet_image
    FROM adoption_requests ar
    JOIN pets p ON p.id = ar.pet_id
    JOIN shelters s ON s.id = p.shelter_id
    JOIN users u ON u.id = ar.user_id
`;

/** Enriquece una solicitud en memoria con los datos del JOIN. */
function memoryRequestView(request) {
  const pet = store.pets.find((item) => sameId(item.id, request.petId));
  const shelter = pet && store.shelters.find((item) => sameId(item.id, pet.shelterId));
  const adopter = store.users.find((item) => sameId(item.id, request.userId));
  const image =
    store.petImages
      .filter((item) => pet && sameId(item.petId, pet.id))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id)[0]?.url ?? null;

  return {
    ...clone(request),
    petName: pet?.name ?? null,
    petStatus: pet?.status ?? null,
    petImage: image,
    shelterId: pet?.shelterId ?? null,
    shelterName: shelter?.name ?? null,
    adopterName: adopter ? `${adopter.firstName} ${adopter.lastName}` : null,
    adopterEmail: adopter?.email ?? null
  };
}

export async function findById(id) {
  if (!isPostgres) {
    const request = store.requests.find((item) => sameId(item.id, id));
    return request ? memoryRequestView(request) : undefined;
  }
  return map(await queryOne(`${SELECT_REQUEST} WHERE ar.id = $1`, [Number(id) || 0]));
}

/**
 * Listado con alcance por rol:
 * - ADOPTANTE ve sus solicitudes.
 * - REFUGIO ve las de las mascotas de su refugio.
 * - ADMINISTRADOR las ve todas (§35.8).
 */
export async function list({ scope, status, search }, pagination) {
  if (!isPostgres) {
    const matched = store.requests
      .map(memoryRequestView)
      .filter((request) => {
        if (scope.role === 'ADOPTANTE') return sameId(request.userId, scope.userId);
        if (scope.role === 'REFUGIO') return sameId(request.shelterId, scope.shelterId);
        return true;
      })
      .filter((request) => !status || request.status === status)
      .filter(
        (request) =>
          !search ||
          `${request.adopterName ?? ''} ${request.petName ?? ''}`
            .toLowerCase()
            .includes(String(search).toLowerCase())
      )
      .sort((a, b) => b.id - a.id);

    const offset = (pagination.page - 1) * pagination.limit;
    return { data: matched.slice(offset, offset + pagination.limit), total: matched.length };
  }

  const builder = new QueryBuilder();
  if (scope.role === 'ADOPTANTE') builder.where('ar.user_id = ?', Number(scope.userId));
  else if (scope.role === 'REFUGIO') builder.where('p.shelter_id = ?', Number(scope.shelterId ?? 0));
  builder.whereIfPresent('ar.status = ?', status);
  if (search) {
    const texto = `%${escapeLike(search)}%`;
    builder.where(
      "((u.first_name || ' ' || u.last_name) ILIKE ? OR p.name ILIKE ?)",
      texto,
      texto
    );
  }

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total
       FROM adoption_requests ar
       JOIN pets p ON p.id = ar.pet_id
       JOIN users u ON u.id = ar.user_id
      WHERE ${builder.clause}`,
    builder.values
  );
  const limitParam = builder.push(pagination.limit);
  const offsetParam = builder.push((pagination.page - 1) * pagination.limit);
  const { rows } = await query(
    `${SELECT_REQUEST} WHERE ${builder.clause}
      ORDER BY ar.created_at DESC, ar.id DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
    builder.values
  );

  return { data: rows.map(map), total: countRows[0].total };
}

/** ¿El usuario ya tiene una solicitud viva para esta mascota? (§35.5) */
export async function hasActiveRequest(userId, petId) {
  if (!isPostgres) {
    return store.requests.some(
      (request) =>
        sameId(request.userId, userId) &&
        sameId(request.petId, petId) &&
        ACTIVE_STATUSES.includes(request.status)
    );
  }
  const row = await queryOne(
    `SELECT 1 FROM adoption_requests
      WHERE user_id = $1 AND pet_id = $2 AND status = ANY($3::request_status[])`,
    [Number(userId) || 0, Number(petId) || 0, ACTIVE_STATUSES]
  );
  return Boolean(row);
}

export async function create(userId, data) {
  if (!isPostgres) {
    const request = {
      id: sequences.requests.next(),
      userId: Number(userId),
      petId: Number(data.petId),
      status: 'PENDIENTE',
      applicant: { ...data.applicant },
      housing: { ...data.housing },
      hadPetsBefore: data.hadPetsBefore,
      experience: data.experience ?? null,
      motivation: data.motivation,
      declarationAccepted: data.declarationAccepted,
      reviewNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.requests.push(request);
    return memoryRequestView(request);
  }

  const row = await queryOne(
    `INSERT INTO adoption_requests (
       user_id, pet_id, applicant_name, applicant_age, applicant_phone, applicant_email,
       applicant_address, applicant_city, housing_type, has_yard, lives_alone,
       has_other_pets, has_children, had_pets_before, experience, motivation, declaration_accepted)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      Number(userId),
      Number(data.petId),
      data.applicant.name,
      data.applicant.age,
      data.applicant.phone,
      data.applicant.email,
      data.applicant.address,
      data.applicant.city,
      data.housing.type,
      data.housing.hasYard,
      data.housing.livesAlone,
      data.housing.hasOtherPets,
      data.housing.hasChildren,
      data.hadPetsBefore,
      data.experience ?? null,
      data.motivation,
      data.declarationAccepted
    ]
  );
  return findById(row.id);
}

/**
 * Cambia el estado de la solicitud y sincroniza el estado de la mascota
 * en la MISMA transacción (§22, §35.10). El mapa `petStatus` lo decide el
 * servicio, que es quien conoce las reglas.
 */
/**
 * Cambia el estado de la solicitud y sincroniza el de la mascota en la MISMA
 * operación (§22, §35.10).
 *
 * `expectedStatus` convierte la escritura en un compare-and-swap: sólo cambia
 * si la solicitud sigue en el estado que leyó quien decidió la transición.
 * Sin esto, dos peticiones simultáneas —aprobar y rechazar, por ejemplo—
 * leían el mismo estado, ambas se daban por válidas y el adoptante recibía
 * las dos notificaciones contradictorias.
 *
 * Devuelve `null` si otra operación se adelantó; quien llama lo traduce a un
 * conflicto.
 */
export async function transition(id, status, { expectedStatus = null, petStatus = null, reviewNotes } = {}) {
  if (!isPostgres) {
    const request = store.requests.find((item) => sameId(item.id, id));
    if (!request) return null;
    // Aunque JavaScript sea de un solo hilo, entre la lectura del servicio y
    // esta escritura hay `await`, así que dos peticiones pueden entrelazarse.
    if (expectedStatus && request.status !== expectedStatus) return null;

    request.status = status;
    request.updatedAt = new Date().toISOString();
    if (reviewNotes !== undefined) request.reviewNotes = reviewNotes;
    if (petStatus) {
      const pet = store.pets.find((item) => sameId(item.id, request.petId));
      if (pet) pet.status = petStatus;
    }
    return memoryRequestView(request);
  }

  const updatedId = await transaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE adoption_requests
          SET status = $2, review_notes = COALESCE($3, review_notes)
        WHERE id = $1 AND ($4::request_status IS NULL OR status = $4)
        RETURNING id, pet_id`,
      [Number(id), status, reviewNotes ?? null, expectedStatus]
    );
    if (rows.length === 0) return null;
    if (petStatus) {
      await client.query('UPDATE pets SET status = $2 WHERE id = $1', [rows[0].pet_id, petStatus]);
    }
    return rows[0].id;
  });

  return updatedId == null ? null : findById(updatedId);
}


/**
 * Solicitudes vivas de una mascota, excluyendo opcionalmente una.
 *
 * Permite decidir si al rechazar o cancelar una solicitud la mascota vuelve a
 * DISPONIBLE o sigue EN_PROCESO por otra solicitud en curso (§22).
 */
export async function listActiveByPet(petId, { excludeRequestId = null } = {}) {
  if (!isPostgres) {
    return store.requests
      .filter(
        (request) =>
          sameId(request.petId, petId) &&
          ACTIVE_STATUSES.includes(request.status) &&
          !sameId(request.id, excludeRequestId)
      )
      .map(memoryRequestView);
  }
  const { rows } = await query(
    `${SELECT_REQUEST}
      WHERE ar.pet_id = $1
        AND ar.status = ANY($2::request_status[])
        AND ($3::bigint IS NULL OR ar.id <> $3)`,
    [Number(petId) || 0, ACTIVE_STATUSES, excludeRequestId]
  );
  return rows.map(map);
}

export async function countAll() {
  if (!isPostgres) return store.requests.length;
  const row = await queryOne('SELECT count(*)::int AS total FROM adoption_requests');
  return row.total;
}

export async function countByStatus(status) {
  if (!isPostgres) return store.requests.filter((request) => request.status === status).length;
  const row = await queryOne(
    'SELECT count(*)::int AS total FROM adoption_requests WHERE status = $1',
    [status]
  );
  return row.total;
}
