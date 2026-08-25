import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import { userProfileSchema, userQuerySchema, userStatusSchema } from '../validators/user.schema.js';
import * as controller from '../controllers/user.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMINISTRADOR'), validateQuery(userQuerySchema), controller.list);
router.get('/:id', validateParams(idParams), controller.detail);
router.put(
  '/:id',
  validateParams(idParams),
  validateBody(userProfileSchema),
  controller.update
);
router.patch(
  '/:id/status',
  authorize('ADMINISTRADOR'),
  validateParams(idParams),
  validateBody(userStatusSchema),
  controller.changeStatus
);
router.delete('/:id', authorize('ADMINISTRADOR'), validateParams(idParams), controller.remove);

export default router;
