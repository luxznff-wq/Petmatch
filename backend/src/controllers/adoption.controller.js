import { asyncHandler } from '../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../utils/http.js';
import * as requestService from '../services/adoption-request.service.js';
import * as interviewService from '../services/interview.service.js';
import * as adoptionService from '../services/adoption.service.js';

/* ---------------------------------------------------------- Solicitudes */

export const listRequests = asyncHandler(async (req, res) => {
  const result = await requestService.list(req.user, req.validatedQuery);
  return paginated(res, result);
});

export const requestDetail = asyncHandler(async (req, res) => {
  const request = await requestService.getById(req.user, req.validatedParams.id);
  return ok(res, request);
});

export const createRequest = asyncHandler(async (req, res) => {
  const request = await requestService.create(req.user, req.body);
  return created(res, request);
});

export const changeRequestStatus = asyncHandler(async (req, res) => {
  const request = await requestService.changeStatus(req.user, req.validatedParams.id, req.body);
  return ok(res, request);
});

export const cancelRequest = asyncHandler(async (req, res) => {
  await requestService.cancel(req.user, req.validatedParams.id);
  return noContent(res);
});

/* ---------------------------------------------------------- Entrevistas */

export const listRequestInterviews = asyncHandler(async (req, res) => {
  const interviews = await interviewService.listByRequest(req.user, req.validatedParams.id);
  return ok(res, interviews);
});

export const scheduleInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.schedule(req.user, req.validatedParams.id, req.body);
  return created(res, interview);
});

export const listMyInterviews = asyncHandler(async (req, res) => {
  const interviews = await interviewService.listForUser(req.user);
  return ok(res, interviews);
});

export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.update(req.user, req.validatedParams.id, req.body);
  return ok(res, interview);
});

/* ----------------------------------------------------------- Adopciones */

export const listAdoptions = asyncHandler(async (req, res) => {
  const result = await adoptionService.list(req.user, req.validatedQuery ?? {});
  return paginated(res, result);
});

export const adoptionDetail = asyncHandler(async (req, res) => {
  const adoption = await adoptionService.getById(req.user, req.validatedParams.id);
  return ok(res, adoption);
});

export const createAdoption = asyncHandler(async (req, res) => {
  const adoption = await adoptionService.create(req.user, req.body);
  return created(res, adoption);
});
