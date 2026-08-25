import { asyncHandler } from '../utils/async-handler.js';
import { ok, paginated } from '../utils/http.js';
import { resolvePagination } from '../utils/pagination.js';
import * as reportService from '../services/report.service.js';
import * as auditModel from '../models/audit.model.js';

export const publicStats = asyncHandler(async (_req, res) =>
  ok(res, await reportService.publicStats())
);

export const petsReport = asyncHandler(async (req, res) =>
  ok(res, await reportService.petsReport(req.user))
);

export const requestsReport = asyncHandler(async (req, res) =>
  ok(res, await reportService.requestsReport(req.user))
);

export const adoptionsReport = asyncHandler(async (req, res) =>
  ok(res, await reportService.adoptionsReport(req.user))
);

export const sheltersReport = asyncHandler(async (_req, res) =>
  ok(res, await reportService.sheltersReport())
);

export const adminSummary = asyncHandler(async (_req, res) =>
  ok(res, await reportService.adminSummary())
);

/** Registro de auditoría paginado (§52). */
export const auditLog = asyncHandler(async (req, res) => {
  const pagination = resolvePagination(req.validatedQuery);
  const { data, total } = await auditModel.list(
    { entityType: req.validatedQuery.entityType },
    pagination
  );
  return paginated(res, { data, total, page: pagination.page, limit: pagination.limit });
});
