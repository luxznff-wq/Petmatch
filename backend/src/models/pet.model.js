import { isPostgres, query, queryOne, transaction } from '../config/database.js';
import { QueryBuilder } from '../utils/sql.js';
import { resolveAge } from '../utils/age.js';
import {
  cascadeDeletePet,
  clone,
  escapeLike,
  includesText,
  normalizeText,
  sameId,
  sequences,
  store
} from './memory-store.js';

/** Campos booleanos de `pet_attributes` expuestos como camelCase. */
export const ATTRIBUTE_FIELDS = Object.freeze({
  vaccinated: 'vaccinated',
  sterilized: 'sterilized',
  dewormed: 'dewormed',
  goodWithChildren: 'good_with_children',
  goodWithDogs: 'good_with_dogs',
  goodWithCats: 'good_with_cats',
  sociable: 'sociable',
  specialCare: 'special_care'
});

const ATTRIBUTE_LABELS = {
  vaccinated: 'Vacunado',
  sterilized: 'Esterilizado',
  dewormed: 'Desparasitado',
  goodWithChildren: 'Compatible con niños',
  goodWithDogs: 'Compatible con perros',
  goodWithCats: 'Compatible con gatos',
  sociable: 'Sociable',
  specialCare: 'Requiere cuidados especiales'
};

const emptyAttributes = () =>
  Object.fromEntries(Object.keys(ATTRIBUTE_FIELDS).map((key) => [key, false]));

/** Etiquetas legibles para las tarjetas del listado (§11, §13). */
export function attributeTags(attributes) {
  return Object.entries(attributes ?? {})
    .filter(([, value]) => value === true)
    .map(([key]) => ATTRIBUTE_LABELS[key])
    .filter(Boolean);
}

const map = (row) => {
  if (!row) return row;
  const attributes = Object.fromEntries(
    Object.entries(ATTRIBUTE_FIELDS).map(([camel, snake]) => [camel, row[snake] === true])
  );
  return {
    id: row.id,
    shelterId: row.shelter_id,
    shelterName: row.shelter_name ?? null,
    shelterStatus: row.shelter_status ?? null,
    name: row.name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    size: row.size,
    ageGroup: row.age_group,
    ageLabel: row.age_label,
    birthDate: row.birth_date,
    color: row.color,
    weightKg: row.weight_kg,
    description: row.description,
    story: row.story,
    address: row.address,
    city: row.city,
    region: row.region,
    status: row.status,
    admittedAt: row.admitted_at,
    image: row.image ?? null,
    attributes,
    tags: attributeTags(attributes),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const SELECT_PET = `
  SELECT p.*, s.name AS shelter_name, s.status AS shelter_status,
         a.vaccinated, a.sterilized, a.dewormed, a.good_with_children,
         a.good_with_dogs, a.good_with_cats, a.sociable, a.special_care,
         (SELECT url FROM pet_images i
           WHERE i.pet_id = p.id ORDER BY i.is_primary DESC, i.id LIMIT 1) AS image
    FROM pets p
    JOIN shelters s ON s.id = p.shelter_id
    LEFT JOIN pet_attributes a ON a.pet_id = p.id
`;

/** Compone la vista de una mascota en modo memoria (equivale al JOIN). */
function memoryPetView(pet) {
  const shelter = store.shelters.find((item) => sameId(item.id, pet.shelterId));
  const attributes =
    store.petAttributes.find((item) => sameId(item.petId, pet.id))?.values ?? emptyAttributes();
  const image =
    store.petImages
      .filter((item) => sameId(item.petId, pet.id))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id)[0]?.url ?? null;

  return {
    ...clone(pet),
    shelterName: shelter?.name ?? null,
    shelterStatus: shelter?.status ?? null,
    attributes: clone(attributes),
    tags: attributeTags(attributes),
    image
  };
}

export async function findById(id) {
  if (!isPostgres) {
    const pet = store.pets.find((item) => sameId(item.id, id));
    return pet ? memoryPetView(pet) : undefined;
  }
  return map(await queryOne(`${SELECT_PET} WHERE p.id = $1`, [Number(id) || 0]));
}

const SORTS = {
  recent: 'p.created_at DESC, p.id DESC',
  oldest: 'p.created_at ASC, p.id ASC',
  'name-asc': 'p.name ASC',
  'name-desc': 'p.name DESC'
};

function sortMemory(pets, sort) {
  const sorted = [...pets];
  if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  else if (sort === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
  else if (sort === 'oldest') sorted.sort((a, b) => a.id - b.id);
  else sorted.sort((a, b) => b.id - a.id);
  return sorted;
}

/**
 * Listado con búsqueda de texto, filtros combinables, ordenamiento y
 * paginación (§13-§17). Todos los filtros son opcionales y acumulativos.
 */
export async function list(filters, pagination) {
  const {
    search,
    species,
    sex,
    size,
    ageGroup,
    status,
    city,
    region,
    shelterId,
    sort = 'recent',
    ...attributeFilters
  } = filters;

  if (!isPostgres) {
    const matched = store.pets
      .map(memoryPetView)
      .filter((pet) => (species ? includesText(pet.species, species) : true))
      .filter((pet) => (sex ? pet.sex === sex : true))
      .filter((pet) => (size ? pet.size === size : true))
      .filter((pet) => (ageGroup ? pet.ageGroup === ageGroup : true))
      .filter((pet) => (status ? pet.status === status : true))
      .filter((pet) => (city ? includesText(pet.city, city) : true))
      .filter((pet) => (region ? includesText(pet.region ?? '', region) : true))
      .filter((pet) => (shelterId ? sameId(pet.shelterId, shelterId) : true))
      .filter((pet) =>
        Object.entries(attributeFilters).every(
          ([key, value]) => value !== true || pet.attributes[key] === true
        )
      )
      // Mismo texto buscable que la columna `search_text` de PostgreSQL.
      .filter((pet) =>
        !search
          ? true
          : includesText(
              [pet.name, pet.breed, pet.city, pet.region, pet.shelterName]
                .filter(Boolean)
                .join(' '),
              search
            )
      );

    const sorted = sortMemory(matched, sort);
    const offset = (pagination.page - 1) * pagination.limit;
    return { data: sorted.slice(offset, offset + pagination.limit), total: sorted.length };
  }

  const builder = new QueryBuilder();
  if (search) {
    // `search_text` concentra nombre, raza, ciudad, región y refugio en una
    // sola columna sin acentos (migración 006). Buscar sobre una única tabla
    // permite que el índice GIN de trigramas resuelva el comodín inicial;
    // repartir el OR entre `pets` y `shelters` forzaba un Seq Scan.
    builder.where('p.search_text LIKE ?', `%${escapeLike(normalizeText(search))}%`);
  }
  builder.whereIfPresent('LOWER(p.species) = LOWER(?)', species);
  builder.whereIfPresent('p.sex = ?', sex);
  builder.whereIfPresent('p.size = ?', size);
  builder.whereIfPresent('p.age_group = ?', ageGroup);
  builder.whereIfPresent('p.status = ?', status);
  builder.whereIfPresent('LOWER(p.city) = LOWER(?)', city);
  builder.whereIfPresent('LOWER(p.region) = LOWER(?)', region);
  builder.whereIfPresent('p.shelter_id = ?', shelterId);

  // Los nombres de columna provienen del mapa fijo ATTRIBUTE_FIELDS, nunca de
  // la petición: el cliente sólo decide si el filtro se aplica o no.
  for (const [camel, column] of Object.entries(ATTRIBUTE_FIELDS)) {
    if (attributeFilters[camel] === true) builder.where(`a.${column} = ?`, true);
  }

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total
       FROM pets p
       JOIN shelters s ON s.id = p.shelter_id
       LEFT JOIN pet_attributes a ON a.pet_id = p.id
      WHERE ${builder.clause}`,
    builder.values
  );

  const limitParam = builder.push(pagination.limit);
  const offsetParam = builder.push((pagination.page - 1) * pagination.limit);
  const { rows } = await query(
    `${SELECT_PET} WHERE ${builder.clause}
      ORDER BY ${SORTS[sort] ?? SORTS.recent}
      LIMIT ${limitParam} OFFSET ${offsetParam}`,
    builder.values
  );

  return { data: rows.map(map), total: countRows[0].total };
}

/** Campos escalares de `pets` que se escriben al crear o editar. */
function petColumns(data) {
  const { ageGroup, ageLabel } = resolveAge(data);
  return {
    name: data.name,
    species: data.species,
    breed: data.breed ?? null,
    sex: data.sex,
    size: data.size ?? null,
    age_group: ageGroup,
    age_label: ageLabel,
    birth_date: data.birthDate ?? null,
    color: data.color ?? null,
    weight_kg: data.weightKg ?? null,
    description: data.description ?? null,
    story: data.story ?? null,
    address: data.address ?? null,
    city: data.city,
    region: data.region ?? null,
    status: data.status ?? 'DISPONIBLE'
  };
}

export async function create(shelterId, data) {
  if (!isPostgres) {
    const columns = petColumns(data);
    const pet = {
      id: sequences.pets.next(),
      shelterId: Number(shelterId),
      name: columns.name,
      species: columns.species,
      breed: columns.breed,
      sex: columns.sex,
      size: columns.size,
      ageGroup: columns.age_group,
      ageLabel: columns.age_label,
      birthDate: columns.birth_date,
      color: columns.color,
      weightKg: columns.weight_kg,
      description: columns.description,
      story: columns.story,
      address: columns.address,
      city: columns.city,
      region: columns.region,
      status: columns.status,
      admittedAt: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.pets.push(pet);
    store.petAttributes.push({
      petId: pet.id,
      values: { ...emptyAttributes(), ...(data.attributes ?? {}) }
    });
    if (data.image) {
      store.petImages.push({
        id: sequences.petImages.next(),
        petId: pet.id,
        url: data.image,
        isPrimary: true
      });
    }
    return memoryPetView(pet);
  }

  const petId = await transaction(async (client) => {
    const columns = petColumns(data);
    const { rows } = await client.query(
      `INSERT INTO pets (shelter_id, name, species, breed, sex, size, age_group, age_label,
                         birth_date, color, weight_kg, description, story, address, city, region, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [Number(shelterId), ...Object.values(columns)]
    );
    const createdId = rows[0].id;

    const attributes = { ...emptyAttributes(), ...(data.attributes ?? {}) };
    await client.query(
      `INSERT INTO pet_attributes (pet_id, vaccinated, sterilized, dewormed,
                                   good_with_children, good_with_dogs, good_with_cats,
                                   sociable, special_care)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [createdId, ...Object.keys(ATTRIBUTE_FIELDS).map((key) => attributes[key] === true)]
    );

    if (data.image) {
      await client.query(
        'INSERT INTO pet_images (pet_id, url, is_primary) VALUES ($1, $2, true)',
        [createdId, data.image]
      );
    }
    return createdId;
  });

  return findById(petId);
}

export async function update(id, data) {
  if (!isPostgres) {
    const pet = store.pets.find((item) => sameId(item.id, id));
    if (!pet) return null;
    const columns = petColumns(data);
    Object.assign(pet, {
      name: columns.name,
      species: columns.species,
      breed: columns.breed,
      sex: columns.sex,
      size: columns.size,
      ageGroup: columns.age_group,
      ageLabel: columns.age_label,
      birthDate: columns.birth_date,
      color: columns.color,
      weightKg: columns.weight_kg,
      description: columns.description,
      story: columns.story,
      address: columns.address,
      city: columns.city,
      region: columns.region,
      status: columns.status,
      updatedAt: new Date().toISOString()
    });
    if (data.attributes) {
      const entry = store.petAttributes.find((item) => sameId(item.petId, pet.id));
      const values = { ...emptyAttributes(), ...data.attributes };
      if (entry) entry.values = values;
      else store.petAttributes.push({ petId: pet.id, values });
    }
    return memoryPetView(pet);
  }

  const updatedId = await transaction(async (client) => {
    const columns = petColumns(data);
    const assignments = Object.keys(columns)
      .map((column, index) => `${column} = $${index + 2}`)
      .join(', ');
    const { rowCount } = await client.query(`UPDATE pets SET ${assignments} WHERE id = $1`, [
      Number(id),
      ...Object.values(columns)
    ]);
    if (rowCount === 0) return null;

    if (data.attributes) {
      const attributes = { ...emptyAttributes(), ...data.attributes };
      const names = Object.values(ATTRIBUTE_FIELDS);
      await client.query(
        `INSERT INTO pet_attributes (pet_id, ${names.join(', ')})
         VALUES ($1, ${names.map((_, index) => `$${index + 2}`).join(', ')})
         ON CONFLICT (pet_id) DO UPDATE SET
           ${names.map((name) => `${name} = EXCLUDED.${name}`).join(', ')}`,
        [Number(id), ...Object.keys(ATTRIBUTE_FIELDS).map((key) => attributes[key] === true)]
      );
    }
    return Number(id);
  });

  return updatedId == null ? null : findById(updatedId);
}

export async function setStatus(id, status) {
  if (!isPostgres) {
    const pet = store.pets.find((item) => sameId(item.id, id));
    if (!pet) return null;
    pet.status = status;
    pet.updatedAt = new Date().toISOString();
    return memoryPetView(pet);
  }
  const row = await queryOne('UPDATE pets SET status = $2 WHERE id = $1 RETURNING id', [
    Number(id) || 0,
    status
  ]);
  return row ? findById(row.id) : null;
}

export async function remove(id) {
  if (!isPostgres) {
    if (!store.pets.some((item) => sameId(item.id, id))) return false;
    // Replica el ON DELETE CASCADE del esquema: imágenes, atributos,
    // favoritos y solicitudes asociadas a la mascota.
    cascadeDeletePet(id);
    return true;
  }
  const result = await query('DELETE FROM pets WHERE id = $1', [Number(id) || 0]);
  return result.rowCount > 0;
}

export async function countAll() {
  if (!isPostgres) return store.pets.length;
  const row = await queryOne('SELECT count(*)::int AS total FROM pets');
  return row.total;
}

export async function distinctCities() {
  if (!isPostgres) return [...new Set(store.pets.map((pet) => pet.city))].sort();
  const { rows } = await query('SELECT DISTINCT city FROM pets ORDER BY city');
  return rows.map((row) => row.city);
}
