import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateParams } from '../middleware/validate.js';
import { idParams } from '../validators/common.schema.js';
import * as controller from '../controllers/user.controller.js';

/** Notificaciones internas del usuario en sesión (§66). */
const router = Router();
router.use(authenticate);

router.get('/', controller.listNotifications);
// Antes de '/:id/read' para que "read-all" no se interprete como un id.
router.patch('/read-all', controller.markAllNotificationsRead);
router.patch('/:id/read', validateParams(idParams), controller.markNotificationRead);

export default router;
