import { asyncHandler } from '../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../utils/http.js';
import * as petService from '../services/pet.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await petService.list(req.validatedQuery);
  return paginated(res, result);
});

export const detail = asyncHandler(async (req, res) => {
  const pet = await petService.getById(req.validatedParams.id);
  return ok(res, pet);
});

export const create = asyncHandler(async (req, res) => {
  const pet = await petService.create(req.user, req.body);
  return created(res, pet);
});

export const update = asyncHandler(async (req, res) => {
  const pet = await petService.update(req.user, req.validatedParams.id, req.body);
  return ok(res, pet);
});

export const changeStatus = asyncHandler(async (req, res) => {
  const pet = await petService.setStatus(req.user, req.validatedParams.id, req.body.status);
  return ok(res, pet);
});

export const remove = asyncHandler(async (req, res) => {
  await petService.remove(req.user, req.validatedParams.id);
  return noContent(res);
});

export const listImages = asyncHandler(async (req, res) => {
  const images = await petService.listImages(req.validatedParams.id);
  return ok(res, images);
});

/** Subida de un archivo de imagen (multipart/form-data). */
export const uploadImage = asyncHandler(async (req, res) => {
  const image = await petService.addUploadedImage(req.user, req.validatedParams.id, req.file, {
    isPrimary: req.body?.isPrimary === 'true' || req.body?.isPrimary === true
  });
  return created(res, image);
});

export const addImage = asyncHandler(async (req, res) => {
  const image = await petService.addImage(req.user, req.validatedParams.id, req.body);
  return created(res, image);
});

export const removeImage = asyncHandler(async (req, res) => {
  await petService.removeImage(req.user, req.params.id, req.params.imageId);
  return noContent(res);
});
