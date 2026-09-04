import { isPostgres, query, queryOne } from '../config/database.js';
import { QueryBuilder } from '../utils/sql.js';
import { clone, escapeLike, includesText, sameId, sequences, store } from './memory-store.js';

const map = (row) =>
  row && {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    logoUrl: row.logo_url,
    description: row.description,
    address: row.address,
    city: row.city,
    region: row.region,
    phone: row.phone,
    email: row.email,
    website: row.website,
    social: row.social ?? {},
    hours: row.hours,
    status: row.status,
    createdAt: row.created_at,
    // Contadores del perfil público (§42); sólo llegan en las consultas
    // que los solicitan explícitamente.
    petCount: row.pet_count != null ? Number(row.pet_count) : undefined,
    availablePetCount: row.available_pet_count != null ? Number(row.available_pet_count) : undefined,
    adoptionCount: row.adoption_count != null ? Number(row.adoption_count) : undefined
  };

const WITH_COUNTS = `
  SELECT s.*,
         (SELECT count(*) FROM pets p WHERE p.shelter_id = s.id) AS pet_count,
         (SELECT count(*) FROM pets p WHERE p.shelter_id = s.id AND p.status = 'DISPONIBLE') AS available_pet_count,
         (SELECT count(*)
            FROM adoptions a
            JOIN adoption_requests ar ON ar.id = a.request_id
            JOIN pets p ON p.id = ar.pet_id
           WHERE p.shelter_id = s.id) AS adoption_count
    FROM shelters s
`;

/** Contadores del refugio en modo memoria. */
function memoryCounts(shelterId) {
  const pets = store.pets.filter((pet) => sameId(pet.shelterId, shelterId));
  const petIds = new Set(pets.map((pet) => pet.id));
  const adoptionCount = store.adoptions.filter((adoption) => {
    const request = store.requests.find((item) => sameId(item.id, adoption.requestId));
    return request && petIds.has(request.petId);
  }).length;

  return {
    petCount: pets.length,
    availablePetCount: pets.filter((pet) => pet.status === 'DISPONIBLE').length,
    adoptionCount
  };
}

export async function findById(id, { withCounts = false } = {}) {
  if (!isPostgres) {
    const shelter = store.shelters.find((item) => sameId(item.id, id));
    if (!shelter) return undefined;
    return { ...clone(shelter), ...(withCounts ? memoryCounts(shelter.id) : {}) };
  }
  const sql = withCounts ? `${WITH_COUNTS} WHERE s.id = $1` : 'SELECT * FROM shelters s WHERE s.id = $1';
  return map(await queryOne(sql, [Number(id) || 0]));
}

export async function findByOwner(ownerId) {
  if (!isPostgres) {
    const shelter = store.shelters.find((item) => sameId(item.ownerId, ownerId));
    return shelter ? { ...clone(shelter), ...memoryCounts(shelter.id) } : undefined;
  }
  return map(await queryOne(`${WITH_COUNTS} WHERE s.owner_id = $1`, [Number(ownerId) || 0]));
}

export async function list({ search, city, status } = {}, pagination) {
  if (!isPostgres) {
    const matches = store.shelters
      .filter((shelter) => !status || shelter.status === status)
      .filter((shelter) => !city || includesText(shelter.city, city))
      .filter((shelter) => !search || includesText(`${shelter.name} ${shelter.city}`, search))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((shelter) => ({ ...clone(shelter), ...memoryCounts(shelter.id) }));

    if (!pagination) return { data: matches, total: matches.length };
    const offset = (pagination.page - 1) * pagination.limit;
    return { data: matches.slice(offset, offset + pagination.limit), total: matches.length };
  }

  const builder = new QueryBuilder();
  builder.whereIfPresent('s.status = ?', status);
  builder.whereIfPresent('LOWER(s.city) = LOWER(?)', city);
  if (search) {
    const texto = `%${escapeLike(search)}%`;
    builder.where('(s.name ILIKE ? OR s.city ILIKE ?)', texto, texto);
  }

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total FROM shelters s WHERE ${builder.clause}`,
    builder.values
  );

  let sql = `${WITH_COUNTS} WHERE ${builder.clause} ORDER BY s.name ASC`;
  if (pagination) {
    const limitParam = builder.push(pagination.limit);
    const offsetParam = builder.push((pagination.page - 1) * pagination.limit);
    sql += ` LIMIT ${limitParam} OFFSET ${offsetParam}`;
  }

  const { rows } = await query(sql, builder.values);
  return { data: rows.map(map), total: countRows[0].total };
}

export async function create(ownerId, data) {
  if (!isPostgres) {
    const shelter = {
      id: sequences.shelters.next(),
      ownerId: Number(ownerId),
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      address: data.address ?? null,
      city: data.city,
      region: data.region ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      social: data.social ?? {},
      hours: data.hours ?? null,
      status: 'PENDIENTE',
      createdAt: new Date().toISOString()
    };
    store.shelters.push(shelter);
    return clone(shelter);
  }

  return map(
    await queryOne(
      `INSERT INTO shelters (owner_id, name, logo_url, description, address, city, region, phone, email, website, social, hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        Number(ownerId),
        data.name,
        data.logoUrl ?? null,
        data.description ?? null,
        data.address ?? null,
        data.city,
        data.region ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.website ?? null,
        JSON.stringify(data.social ?? {}),
        data.hours ?? null
      ]
    )
  );
}

export async function update(id, data) {
  if (!isPostgres) {
    const shelter = store.shelters.find((item) => sameId(item.id, id));
    if (!shelter) return null;
    Object.assign(shelter, {
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      address: data.address ?? null,
      city: data.city,
      region: data.region ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      social: data.social ?? {},
      hours: data.hours ?? null
    });
    return { ...clone(shelter), ...memoryCounts(shelter.id) };
  }

  return map(
    await queryOne(
      `UPDATE shelters
          SET name = $2, logo_url = $3, description = $4, address = $5, city = $6,
              region = $7, phone = $8, email = $9, website = $10, social = $11, hours = $12
        WHERE id = $1 RETURNING *`,
      [
        Number(id),
        data.name,
        data.logoUrl ?? null,
        data.description ?? null,
        data.address ?? null,
        data.city,
        data.region ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.website ?? null,
        JSON.stringify(data.social ?? {}),
        data.hours ?? null
      ]
    )
  );
}

export async function setStatus(id, status) {
  if (!isPostgres) {
    const shelter = store.shelters.find((item) => sameId(item.id, id));
    if (!shelter) return null;
    shelter.status = status;
    return clone(shelter);
  }
  return map(
    await queryOne('UPDATE shelters SET status = $2 WHERE id = $1 RETURNING *', [
      Number(id) || 0,
      status
    ])
  );
}

/**
 * Cuenta refugios, opcionalmente los de un estado concreto.
 *
 * Sin `status` cuenta todos, que es lo que necesita el panel administrativo;
 * las cifras públicas piden `VERIFICADO` para no anunciar refugios que el
 * directorio no muestra.
 */
export async function countAll({ status } = {}) {
  if (!isPostgres) {
    return status
      ? store.shelters.filter((shelter) => shelter.status === status).length
      : store.shelters.length;
  }
  const row = await queryOne(
    'SELECT count(*)::int AS total FROM shelters WHERE $1::shelter_status IS NULL OR status = $1',
    [status ?? null]
  );
  return row.total;
}
