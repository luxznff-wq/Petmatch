import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import {
  petImageSchema,
  petQuerySchema,
  petSchema,
  petStatusSchema
} from '../validators/pet.schema.js';
import * as controller from '../controllers/pet.controller.js';

const router = Router();

/* Exploración pública (§13-§18) */
router.get('/', validateQuery(petQuerySchema), controller.list);
router.get('/:id', validateParams(idParams), controller.detail);
router.get('/:id/images', validateParams(idParams), controller.listImages);

/* Gestión: sólo refugios verificados y administradores (§88.3, §88.5) */
const manager = [authenticate, authorize('REFUGIO', 'ADMINISTRADOR')];

router.post('/', ...manager, validateBody(petSchema), controller.create);
router.put(
  '/:id',
  ...manager,
  validateParams(idParams),
  validateBody(petSchema),
  controller.update
);
router.patch(
  '/:id/status',
  ...manager,
  validateParams(idParams),
  validateBody(petStatusSchema),
  controller.changeStatus
);
router.delete('/:id', ...manager, validateParams(idParams), controller.remove);

/* Galería de fotografías (§60) */
router.post(
  '/:id/images',
  ...manager,
  validateParams(idParams),
  validateBody(petImageSchema),
  controller.addImage
);
router.delete('/:id/images/:imageId', ...manager, controller.removeImage);

export default router;
