import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import { petQuerySchema } from '../validators/pet.schema.js';
import { shelterQuerySchema, shelterSchema, shelterStatusSchema } from '../validators/shelter.schema.js';
import * as controller from '../controllers/shelter.controller.js';

const router = Router();

// El listado es público, pero un administrador autenticado ve también los
// refugios pendientes y suspendidos, por eso la sesión es opcional (§48).
router.get('/', optionalAuthenticate, validateQuery(shelterQuerySchema), controller.list);

// Debe declararse antes de '/:id' para que "me" no se interprete como un id.
router.get('/me', authenticate, authorize('REFUGIO'), controller.mine);

router.post(
  '/',
  authenticate,
  authorize('REFUGIO'),
  validateBody(shelterSchema),
  controller.create
);

router.get('/:id', validateParams(idParams), controller.detail);
router.get(
  '/:id/pets',
  validateParams(idParams),
  validateQuery(petQuerySchema),
  controller.listPets
);

router.put(
  '/:id',
  authenticate,
  authorize('REFUGIO', 'ADMINISTRADOR'),
  validateParams(idParams),
  validateBody(shelterSchema),
  controller.update
);

// Verificación y suspensión: exclusivo del administrador (§41, §48).
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMINISTRADOR'),
  validateParams(idParams),
  validateBody(shelterStatusSchema),
  controller.changeStatus
);

export default router;
