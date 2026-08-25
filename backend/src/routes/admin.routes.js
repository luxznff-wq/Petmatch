import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import { auditQuerySchema, userQuerySchema, userStatusSchema } from '../validators/user.schema.js';
import { shelterQuerySchema, shelterStatusSchema } from '../validators/shelter.schema.js';
import * as userController from '../controllers/user.controller.js';
import * as shelterController from '../controllers/shelter.controller.js';
import * as reportController from '../controllers/report.controller.js';

/** Panel administrativo (§46-§49, §52). Todas las rutas exigen rol ADMINISTRADOR. */
const router = Router();
router.use(authenticate, authorize('ADMINISTRADOR'));

router.get('/dashboard', reportController.adminSummary);
router.get('/audit', validateQuery(auditQuerySchema), reportController.auditLog);

router.get('/users', validateQuery(userQuerySchema), userController.list);
router.patch(
  '/users/:id/status',
  validateParams(idParams),
  validateBody(userStatusSchema),
  userController.changeStatus
);

router.get('/shelters', validateQuery(shelterQuerySchema), shelterController.list);
router.patch(
  '/shelters/:id/status',
  validateParams(idParams),
  validateBody(shelterStatusSchema),
  shelterController.changeStatus
);

export default router;
