import { asyncHandler } from '../utils/async-handler.js';
import { created, ok, paginated } from '../utils/http.js';
import * as shelterService from '../services/shelter.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await shelterService.list(req.user, req.validatedQuery);
  return paginated(res, result);
});

export const detail = asyncHandler(async (req, res) => {
  const shelter = await shelterService.getPublicProfile(req.validatedParams.id);
  return ok(res, shelter);
});

export const mine = asyncHandler(async (req, res) => {
  const shelter = await shelterService.getOwn(req.user);
  return ok(res, shelter);
});

export const create = asyncHandler(async (req, res) => {
  const shelter = await shelterService.create(req.user, req.body);
  return created(res, shelter);
});

export const update = asyncHandler(async (req, res) => {
  const shelter = await shelterService.update(req.user, req.validatedParams.id, req.body);
  return ok(res, shelter);
});

export const changeStatus = asyncHandler(async (req, res) => {
  const shelter = await shelterService.setStatus(req.user, req.validatedParams.id, req.body.status);
  return ok(res, shelter);
});

export const listPets = asyncHandler(async (req, res) => {
  const result = await shelterService.listPets(req.validatedParams.id, req.validatedQuery);
  return paginated(res, result);
});
