import { isPostgres, query, queryOne } from '../config/database.js';
import { clone, sameId, sequences, store } from './memory-store.js';

const map = (row) =>
  row && {
    id: row.id,
    requestId: row.request_id,
    scheduledAt: row.scheduled_at,
    modality: row.modality,
    notes: row.notes,
    result: row.result,
    createdAt: row.created_at,
    // Contexto que sólo llega en las consultas con JOIN.
    petName: row.pet_name ?? undefined,
    shelterId: row.shelter_id ?? undefined,
    shelterName: row.shelter_name ?? undefined,
    adopterId: row.adopter_id ?? undefined,
    adopterName: row.adopter_name ?? undefined,
    requestStatus: row.request_status ?? undefined
  };

const SELECT_INTERVIEW = `
  SELECT i.*, ar.status AS request_status, ar.user_id AS adopter_id,
         p.name AS pet_name, p.shelter_id, s.name AS shelter_name,
         (u.first_name || ' ' || u.last_name) AS adopter_name
    FROM adoption_interviews i
    JOIN adoption_requests ar ON ar.id = i.request_id
    JOIN pets p ON p.id = ar.pet_id
    JOIN shelters s ON s.id = p.shelter_id
    JOIN users u ON u.id = ar.user_id
`;

function memoryInterviewView(interview) {
  const request = store.requests.find((item) => sameId(item.id, interview.requestId));
  const pet = request && store.pets.find((item) => sameId(item.id, request.petId));
  const shelter = pet && store.shelters.find((item) => sameId(item.id, pet.shelterId));
  const adopter = request && store.users.find((item) => sameId(item.id, request.userId));

  return {
    ...clone(interview),
    requestStatus: request?.status ?? null,
    adopterId: request?.userId ?? null,
    adopterName: adopter ? `${adopter.firstName} ${adopter.lastName}` : null,
    petName: pet?.name ?? null,
    shelterId: pet?.shelterId ?? null,
    shelterName: shelter?.name ?? null
  };
}

export async function findById(id) {
  if (!isPostgres) {
    const interview = store.interviews.find((item) => sameId(item.id, id));
    return interview ? memoryInterviewView(interview) : undefined;
  }
  return map(await queryOne(`${SELECT_INTERVIEW} WHERE i.id = $1`, [Number(id) || 0]));
}

export async function listByRequest(requestId) {
  if (!isPostgres) {
    return store.interviews
      .filter((interview) => sameId(interview.requestId, requestId))
      .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))
      .map(memoryInterviewView);
  }
  const { rows } = await query(`${SELECT_INTERVIEW} WHERE i.request_id = $1 ORDER BY i.scheduled_at`, [
    Number(requestId) || 0
  ]);
  return rows.map(map);
}

/** Entrevistas visibles para un usuario según su rol (§8: "Mis entrevistas"). */
export async function listForUser({ role, userId, shelterId }) {
  if (!isPostgres) {
    return store.interviews
      .map(memoryInterviewView)
      .filter((interview) => {
        if (role === 'ADOPTANTE') return sameId(interview.adopterId, userId);
        if (role === 'REFUGIO') return sameId(interview.shelterId, shelterId);
        return true;
      })
      .sort((a, b) => String(b.scheduledAt).localeCompare(String(a.scheduledAt)));
  }

  if (role === 'ADOPTANTE') {
    const { rows } = await query(
      `${SELECT_INTERVIEW} WHERE ar.user_id = $1 ORDER BY i.scheduled_at DESC`,
      [Number(userId) || 0]
    );
    return rows.map(map);
  }
  if (role === 'REFUGIO') {
    const { rows } = await query(
      `${SELECT_INTERVIEW} WHERE p.shelter_id = $1 ORDER BY i.scheduled_at DESC`,
      [Number(shelterId) || 0]
    );
    return rows.map(map);
  }
  const { rows } = await query(`${SELECT_INTERVIEW} ORDER BY i.scheduled_at DESC LIMIT 200`);
  return rows.map(map);
}

export async function create(requestId, data) {
  if (!isPostgres) {
    const interview = {
      id: sequences.interviews.next(),
      requestId: Number(requestId),
      scheduledAt: data.scheduledAt,
      modality: data.modality,
      notes: data.notes ?? null,
      result: 'Pendiente',
      createdAt: new Date().toISOString()
    };
    store.interviews.push(interview);
    return memoryInterviewView(interview);
  }

  const row = await queryOne(
    `INSERT INTO adoption_interviews (request_id, scheduled_at, modality, notes)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [Number(requestId), data.scheduledAt, data.modality, data.notes ?? null]
  );
  return findById(row.id);
}

export async function update(id, data) {
  if (!isPostgres) {
    const interview = store.interviews.find((item) => sameId(item.id, id));
    if (!interview) return null;
    if (data.scheduledAt !== undefined) interview.scheduledAt = data.scheduledAt;
    if (data.modality !== undefined) interview.modality = data.modality;
    if (data.notes !== undefined) interview.notes = data.notes;
    if (data.result !== undefined) interview.result = data.result;
    return memoryInterviewView(interview);
  }

  const row = await queryOne(
    `UPDATE adoption_interviews
        SET scheduled_at = COALESCE($2, scheduled_at),
            modality     = COALESCE($3, modality),
            notes        = COALESCE($4, notes),
            result       = COALESCE($5, result)
      WHERE id = $1 RETURNING id`,
    [
      Number(id) || 0,
      data.scheduledAt ?? null,
      data.modality ?? null,
      data.notes ?? null,
      data.result ?? null
    ]
  );
  return row ? findById(row.id) : null;
}
