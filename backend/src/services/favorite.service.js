import { ApiError } from '../utils/api-error.js';
import * as favoriteModel from '../models/favorite.model.js';
import * as petModel from '../models/pet.model.js';

/** Favoritos del adoptante (§23). */

export function list(user) {
  return favoriteModel.listPets(user.id);
}

/** Identificadores únicamente: alimenta el estado del corazón en el listado. */
export function listIds(user) {
  return favoriteModel.listPetIds(user.id);
}

export async function add(user, petId) {
  const pet = await petModel.findById(petId);
  if (!pet) throw ApiError.notFound('La mascota no existe');

  await favoriteModel.add(user.id, pet.id);
  return { petId: pet.id };
}

export async function remove(user, petId) {
  const removed = await favoriteModel.remove(user.id, petId);
  if (!removed) throw ApiError.notFound('Esta mascota no está en tus favoritos');
}
