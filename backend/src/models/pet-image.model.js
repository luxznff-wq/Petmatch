import { isPostgres, query, queryOne, transaction } from '../config/database.js';
import { clone, sameId, sequences, store } from './memory-store.js';

const map = (row) =>
  row && {
    id: row.id,
    petId: row.pet_id,
    url: row.url,
    isPrimary: row.is_primary,
    // `storageKey` sólo existe cuando el archivo es nuestro; las imágenes
    // registradas como enlace externo lo dejan a null.
    storageKey: row.storage_key ?? null,
    mimeType: row.mime_type ?? null,
    sizeBytes: row.size_bytes ?? null,
    createdAt: row.created_at
  };

export async function listByPet(petId) {
  if (!isPostgres) {
    return clone(
      store.petImages
        .filter((image) => sameId(image.petId, petId))
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id)
    );
  }
  const { rows } = await query(
    'SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY is_primary DESC, id',
    [Number(petId) || 0]
  );
  return rows.map(map);
}

/**
 * Añade una fotografía a la galería (§60). Marcar una como principal
 * desmarca la anterior dentro de la misma transacción, de modo que el índice
 * único `pet_images_one_primary` nunca se viola.
 */
export async function add(petId, { url, isPrimary = false, storageKey = null, mimeType = null, sizeBytes = null }) {
  if (!isPostgres) {
    if (isPrimary) {
      store.petImages
        .filter((image) => sameId(image.petId, petId))
        .forEach((image) => {
          image.isPrimary = false;
        });
    }
    const image = {
      id: sequences.petImages.next(),
      petId: Number(petId),
      url,
      isPrimary,
      storageKey,
      mimeType,
      sizeBytes,
      createdAt: new Date().toISOString()
    };
    store.petImages.push(image);
    return clone(image);
  }

  return transaction(async (client) => {
    if (isPrimary) {
      await client.query('UPDATE pet_images SET is_primary = false WHERE pet_id = $1', [
        Number(petId)
      ]);
    }
    const { rows } = await client.query(
      `INSERT INTO pet_images (pet_id, url, is_primary, storage_key, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [Number(petId), url, isPrimary, storageKey, mimeType, sizeBytes]
    );
    return map(rows[0]);
  });
}

export async function remove(petId, imageId) {
  if (!isPostgres) {
    const index = store.petImages.findIndex(
      (image) => sameId(image.id, imageId) && sameId(image.petId, petId)
    );
    if (index < 0) return false;
    store.petImages.splice(index, 1);
    return true;
  }
  const result = await query('DELETE FROM pet_images WHERE id = $1 AND pet_id = $2', [
    Number(imageId) || 0,
    Number(petId) || 0
  ]);
  return result.rowCount > 0;
}

export async function findById(petId, imageId) {
  if (!isPostgres) {
    return clone(
      store.petImages.find((image) => sameId(image.id, imageId) && sameId(image.petId, petId))
    );
  }
  return map(
    await queryOne('SELECT * FROM pet_images WHERE id = $1 AND pet_id = $2', [
      Number(imageId) || 0,
      Number(petId) || 0
    ])
  );
}
