import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import { interviewUpdateSchema } from '../validators/adoption.schema.js';
import * as controller from '../controllers/adoption.controller.js';

/**
 * Rutas de entrevistas a nivel raíz (§63: `PUT /api/interviews/:id`).
 * La creación y el listado por solicitud viven en `/api/adoptions/requests/:id/interviews`.
 */
const router = Router();
router.use(authenticate);

// Agenda propia: "Mis entrevistas" del adoptante y del refugio (§8).
router.get('/', controller.listMyInterviews);

router.put(
  '/:id',
  authorize('REFUGIO', 'ADMINISTRADOR'),
  validateParams(idParams),
  validateBody(interviewUpdateSchema),
  controller.updateInterview
);

export default router;
