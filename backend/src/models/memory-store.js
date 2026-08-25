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

/** Comparación de texto insensible a mayúsculas y acentos. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export const includesText = (haystack, needle) =>
  normalizeText(haystack).includes(normalizeText(needle));
