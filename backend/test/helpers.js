import supertest from 'supertest';
import { app } from '../src/app.js';
import { isPostgres, query } from '../src/config/database.js';
import { resetStore } from '../src/models/memory-store.js';

/**
 * Utilidades compartidas por las pruebas.
 *
 * Las mismas pruebas corren contra el almacén en memoria y contra PostgreSQL:
 * basta exportar DATABASE_URL para que `resetDatabase` limpie las tablas
 * reales en lugar del almacén en memoria.
 */

export const api = supertest(app);

const TABLES = [
  'audit_logs',
  'notifications',
  'adoptions',
  'adoption_interviews',
  'adoption_requests',
  'favorites',
  'pet_attributes',
  'pet_images',
  'pets',
  'shelters',
  'users'
];

export async function resetDatabase() {
  if (isPostgres) {
    await query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
    return;
  }
  resetStore();
}

const password = 'Clave123';

/** Registra una cuenta y devuelve `{ user, token }`. */
export async function registerUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const payload = {
    firstName: 'Ana',
    lastName: 'Pérez',
    email: `ana.${suffix}@example.com`,
    password,
    city: 'Lima',
    ...overrides
  };

  const response = await api.post('/api/auth/register').send(payload).expect(201);
  return { ...response.body.data, password: payload.password };
}

/**
 * Crea un refugio verificado listo para publicar: registra al responsable,
 * da de alta el perfil y lo verifica con una cuenta administradora.
 */
export async function createVerifiedShelter(admin, overrides = {}) {
  const owner = await registerUser({ role: 'REFUGIO', ...overrides.owner });

  const shelterResponse = await api
    .post('/api/shelters')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: 'Refugio de prueba', city: 'Lima', ...overrides.shelter })
    .expect(201);

  const shelter = shelterResponse.body.data;
  await api
    .patch(`/api/shelters/${shelter.id}/status`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ status: 'VERIFICADO' })
    .expect(200);

  return { owner, shelter };
}

/**
 * Crea la cuenta administradora.
 *
 * El registro público no permite el rol ADMINISTRADOR (§88.10), así que se
 * promueve directamente en el almacenamiento, igual que hace el seed.
 */
export async function createAdmin() {
  const admin = await registerUser({ email: `admin.${Date.now()}@example.com` });

  if (isPostgres) {
    await query(
      "UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'ADMINISTRADOR') WHERE id = $1",
      [admin.user.id]
    );
  } else {
    const { store } = await import('../src/models/memory-store.js');
    store.users.find((user) => Number(user.id) === Number(admin.user.id)).role = 'ADMINISTRADOR';
  }

  // El token guarda el rol anterior: se renueva iniciando sesión otra vez.
  const login = await api
    .post('/api/auth/login')
    .send({ email: admin.user.email, password: admin.password })
    .expect(200);

  return login.body.data;
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

/** Cuerpo mínimo válido de una mascota. */
export const petPayload = (overrides = {}) => ({
  name: 'Toby',
  species: 'Perro',
  sex: 'Macho',
  size: 'Mediano',
  city: 'Lima',
  ...overrides
});

/** Cuerpo mínimo válido de una solicitud de adopción. */
export const requestPayload = (petId, overrides = {}) => ({
  petId,
  applicant: {
    name: 'Ana Pérez Vega',
    age: 30,
    phone: '+51 999 888 777',
    email: 'ana@example.com',
    address: 'Av. Siempre Viva 742',
    city: 'Lima'
  },
  housing: {
    type: 'Casa',
    hasYard: true,
    livesAlone: false,
    hasOtherPets: false,
    hasChildren: true
  },
  hadPetsBefore: false,
  motivation: 'Quiero darle un hogar seguro, estable y lleno de cariño para toda su vida.',
  declarationAccepted: true,
  ...overrides
});
