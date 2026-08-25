/**
 * Almacén en memoria que refleja el esquema de PostgreSQL.
 *
 * Permite levantar la API sin base de datos (demos, tests, primer arranque).
 * Guarda las filas con los MISMOS nombres de campo que devuelven los modelos
 * tras mapear, de modo que servicios y controladores no distinguen el motor.
 *
 * Importante: aquí no vive ninguna regla de negocio. Las reglas están en
 * `src/services`, que es la única capa que las aplica en ambos modos.
 */

/** Generador de identificadores monótonos (equivale a BIGSERIAL). */
function createSequence() {
  let current = 0;
  return {
    next: () => (current += 1),
    /** Sincroniza la secuencia tras cargar datos precargados. */
    seed: (value) => {
      current = Math.max(current, value);
    },
    reset: () => {
      current = 0;
    }
  };
}

const emptyState = () => ({
  users: [],
  shelters: [],
  pets: [],
  petImages: [],
  petAttributes: [],
  favorites: [],
  requests: [],
  interviews: [],
  adoptions: [],
  notifications: [],
  auditLogs: []
});

export const sequences = {
  users: createSequence(),
  shelters: createSequence(),
  pets: createSequence(),
  petImages: createSequence(),
  requests: createSequence(),
  interviews: createSequence(),
  adoptions: createSequence(),
  notifications: createSequence(),
  auditLogs: createSequence()
};

export const store = emptyState();

/** Vacía el almacén. Lo usan los tests entre casos. */
export function resetStore() {
  Object.assign(store, emptyState());
  Object.values(sequences).forEach((sequence) => sequence.reset());
}

/** Copia profunda para no exponer referencias mutables fuera del modelo. */
export const clone = (value) => (value === undefined ? undefined : structuredClone(value));

/** Compara identificadores que pueden llegar como número o como string. */
export const sameId = (a, b) => a != null && b != null && Number(a) === Number(b);

/**
 * Elimina de `store[collection]` los elementos que cumplan `predicate`.
 * Recibe el nombre de la colección y no el arreglo para poder reemplazarlo
 * en el almacén sin depender de la referencia que tenga quien llama.
 */
export function removeWhere(collection, predicate) {
  const before = store[collection].length;
  store[collection] = store[collection].filter((item) => !predicate(item));
  return before - store[collection].length;
}

/**
 * Replica en memoria el `ON DELETE CASCADE` que declara el esquema para
 * `pets`: imágenes, atributos, favoritos y solicitudes de esa mascota.
 * Las solicitudes arrastran a su vez entrevistas y adopciones.
 */
export function cascadeDeletePet(petId) {
  const requestIds = store.requests
    .filter((request) => sameId(request.petId, petId))
    .map((request) => request.id);

  removeWhere('petImages', (image) => sameId(image.petId, petId));
  removeWhere('petAttributes', (entry) => sameId(entry.petId, petId));
  removeWhere('favorites', (favorite) => sameId(favorite.petId, petId));
  cascadeDeleteRequests(requestIds);
  removeWhere('pets', (pet) => sameId(pet.id, petId));
}

/** Cascada de `adoption_requests`: entrevistas y adopciones asociadas. */
export function cascadeDeleteRequests(requestIds) {
  const ids = new Set(requestIds.map(Number));
  if (ids.size === 0) return;
  removeWhere('interviews', (interview) => ids.has(Number(interview.requestId)));
  removeWhere('adoptions', (adoption) => ids.has(Number(adoption.requestId)));
  removeWhere('requests', (request) => ids.has(Number(request.id)));
}

/**
 * Replica el `ON DELETE CASCADE` de `users`: refugio (y todo lo que cuelga de
 * él), favoritos, solicitudes y notificaciones. La auditoría se conserva con
 * `user_id` a null, igual que el `ON DELETE SET NULL` del esquema.
 */
export function cascadeDeleteUser(userId) {
  const shelter = store.shelters.find((item) => sameId(item.ownerId, userId));
  if (shelter) {
    store.pets
      .filter((pet) => sameId(pet.shelterId, shelter.id))
      .map((pet) => pet.id)
      .forEach(cascadeDeletePet);
    removeWhere('shelters', (item) => sameId(item.id, shelter.id));
  }

  cascadeDeleteRequests(
    store.requests.filter((request) => sameId(request.userId, userId)).map((request) => request.id)
  );
  removeWhere('favorites', (favorite) => sameId(favorite.userId, userId));
  removeWhere('notifications', (notification) => sameId(notification.userId, userId));
  store.auditLogs
    .filter((entry) => sameId(entry.userId, userId))
    .forEach((entry) => {
      entry.userId = null;
    });
  removeWhere('users', (user) => sameId(user.id, userId));
}

/** Comparación de texto insensible a mayúsculas y acentos. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export const includesText = (haystack, needle) =>
  normalizeText(haystack).includes(normalizeText(needle));
