import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { env } from '../config/env.js';
import { isPostgres, pool, query } from '../config/database.js';
import * as userModel from '../models/user.model.js';
import * as shelterModel from '../models/shelter.model.js';
import * as petModel from '../models/pet.model.js';
import * as favoriteModel from '../models/favorite.model.js';
import { adminUser, adopters, pets, shelterOwners } from './seed-data.js';

/**
 * Carga los datos de demostración.
 *
 * Usa los modelos en lugar de SQL directo, de modo que el mismo script
 * puebla PostgreSQL (`npm run db:seed`) y el almacén en memoria al arrancar
 * sin base de datos. Es idempotente: si el administrador ya existe, no
 * vuelve a insertar nada salvo que se pase `--reset`.
 */

/** Tablas en orden inverso de dependencia, para el borrado con --reset. */
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

async function resetDatabase() {
  if (!isPostgres) return;
  await query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

async function createAccount(data) {
  const passwordHash = await bcrypt.hash(data.password, env.bcryptRounds);
  return userModel.create(data, passwordHash);
}

export async function seed({ reset = false, silent = false } = {}) {
  const log = (message) => {
    if (!silent) console.log(message);
  };

  if (reset) {
    await resetDatabase();
    log('· Datos anteriores eliminados');
  } else if (await userModel.findByEmail(adminUser.email)) {
    log('La base ya contiene datos de demostración. Usa --reset para regenerarlos.');
    return { skipped: true };
  }

  const admin = await createAccount(adminUser);
  log(`✔ Administrador: ${admin.email}`);

  // Refugios y sus responsables.
  const sheltersByKey = new Map();
  for (const entry of shelterOwners) {
    const owner = await createAccount(entry.user);
    const { status, ...profile } = entry.shelter;
    const shelter = await shelterModel.create(owner.id, profile);
    // El estado se aplica aparte: el alta siempre nace PENDIENTE (§41).
    if (status !== 'PENDIENTE') await shelterModel.setStatus(shelter.id, status);
    sheltersByKey.set(entry.key, shelter);
    log(`✔ Refugio: ${shelter.name} (${status})`);
  }

  const createdAdopters = [];
  for (const adopter of adopters) {
    createdAdopters.push(await createAccount(adopter));
  }
  log(`✔ Adoptantes: ${createdAdopters.length}`);

  const createdPets = [];
  for (const { shelterKey, ...data } of pets) {
    const shelter = sheltersByKey.get(shelterKey);
    if (!shelter) continue;
    createdPets.push(await petModel.create(shelter.id, data));
  }
  log(`✔ Mascotas: ${createdPets.length}`);

  // Un par de favoritos para que el panel del adoptante no se vea vacío.
  if (createdAdopters[0] && createdPets.length >= 2) {
    await favoriteModel.add(createdAdopters[0].id, createdPets[0].id);
    await favoriteModel.add(createdAdopters[0].id, createdPets[1].id);
  }

  return {
    skipped: false,
    admin,
    shelters: [...sheltersByKey.values()],
    adopters: createdAdopters,
    pets: createdPets
  };
}

/** Puebla el almacén en memoria al arrancar sin base de datos. */
export async function seedMemoryIfEmpty() {
  if (isPostgres) return false;
  const existing = await petModel.countAll();
  if (existing > 0) return false;
  await seed({ silent: true });
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const reset = process.argv.includes('--reset');
  try {
    if (!isPostgres) {
      console.error('Configura DATABASE_URL para poblar PostgreSQL.');
      process.exit(1);
    }
    const result = await seed({ reset });
    if (!result.skipped) {
      console.log('\nCuentas de prueba:');
      console.log(`  Administrador  ${adminUser.email} / ${adminUser.password}`);
      console.log(`  Refugio        ${shelterOwners[0].user.email} / ${shelterOwners[0].user.password}`);
      console.log(`  Adoptante      ${adopters[0].email} / ${adopters[0].password}`);
    }
    await pool.end();
  } catch (error) {
    console.error('No se pudo poblar la base de datos:', error.message);
    await pool?.end();
    process.exit(1);
  }
}
