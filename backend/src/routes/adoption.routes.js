import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import {
  adoptionRequestSchema,
  adoptionSchema,
  interviewSchema,
  requestQuerySchema,
  requestStatusSchema
} from '../validators/adoption.schema.js';
import * as controller from '../controllers/adoption.controller.js';

const router = Router();
router.use(authenticate);

/* --------------------------------------------- Solicitudes de adopción (§62) */

router.get('/requests', validateQuery(requestQuerySchema), controller.listRequests);

router.post(
  '/requests',
  authorize('ADOPTANTE'),
  validateBody(adoptionRequestSchema),
  controller.createRequest
);

router.get('/requests/:id', validateParams(idParams), controller.requestDetail);

router.patch(
  '/requests/:id/status',
  authorize('REFUGIO', 'ADMINISTRADOR'),
  validateParams(idParams),
  validateBody(requestStatusSchema),
  controller.changeRequestStatus
);

// Cancelación por parte del adoptante (§34).
router.delete(
  '/requests/:id',
  authorize('ADOPTANTE'),
  validateParams(idParams),
  controller.cancelRequest
);

/* ------------------------------------------------------- Entrevistas (§63) */

router.get('/requests/:id/interviews', validateParams(idParams), controller.listRequestInterviews);

router.post(
  '/requests/:id/interviews',
  authorize('REFUGIO', 'ADMINISTRADOR'),
  validateParams(idParams),
  validateBody(interviewSchema),
  controller.scheduleInterview
);

/* -------------------------------------------------------- Adopciones (§64) */

router.get('/', validateQuery(requestQuerySchema), controller.listAdoptions);

router.post(
  '/',
  authorize('REFUGIO', 'ADMINISTRADOR'),
  validateBody(adoptionSchema),
  controller.createAdoption
);

router.get('/:id', validateParams(idParams), controller.adoptionDetail);

export default router;
