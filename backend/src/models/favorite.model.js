import { isPostgres, query, queryOne } from '../config/database.js';
import { sameId, store } from './memory-store.js';
import * as petModel from './pet.model.js';

export async function listPetIds(userId) {
  if (!isPostgres) {
    return store.favorites
      .filter((favorite) => sameId(favorite.userId, userId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((favorite) => favorite.petId);
  }
  const { rows } = await query(
    'SELECT pet_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
    [Number(userId) || 0]
  );
  return rows.map((row) => row.pet_id);
}

/** Mascotas favoritas completas, en el orden en que se guardaron (§23). */
export async function listPets(userId) {
  const ids = await listPetIds(userId);
  const pets = await Promise.all(ids.map((id) => petModel.findById(id)));
  return pets.filter(Boolean);
}

export async function exists(userId, petId) {
  if (!isPostgres) {
    return store.favorites.some(
      (favorite) => sameId(favorite.userId, userId) && sameId(favorite.petId, petId)
    );
  }
  const row = await queryOne('SELECT 1 FROM favorites WHERE user_id = $1 AND pet_id = $2', [
    Number(userId) || 0,
    Number(petId) || 0
  ]);
  return Boolean(row);
}

export async function add(userId, petId) {
  if (!isPostgres) {
    if (!(await exists(userId, petId))) {
      store.favorites.push({
        userId: Number(userId),
        petId: Number(petId),
        createdAt: new Date().toISOString()
      });
    }
    return;
  }
  await query(
    'INSERT INTO favorites (user_id, pet_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [Number(userId), Number(petId)]
  );
}

export async function remove(userId, petId) {
  if (!isPostgres) {
    const index = store.favorites.findIndex(
      (favorite) => sameId(favorite.userId, userId) && sameId(favorite.petId, petId)
    );
    if (index < 0) return false;
    store.favorites.splice(index, 1);
    return true;
  }
  const result = await query('DELETE FROM favorites WHERE user_id = $1 AND pet_id = $2', [
    Number(userId) || 0,
    Number(petId) || 0
  ]);
  return result.rowCount > 0;
}

/**
 * Usuarios que guardaron una mascota como favorita. Alimenta la notificación
 * "la mascota que guardaste como favorita ya no está disponible" (§51).
 */
export async function listUserIdsByPet(petId) {
  if (!isPostgres) {
    return store.favorites
      .filter((favorite) => sameId(favorite.petId, petId))
      .map((favorite) => favorite.userId);
  }
  const { rows } = await query('SELECT user_id FROM favorites WHERE pet_id = $1', [
    Number(petId) || 0
  ]);
  return rows.map((row) => row.user_id);
}
